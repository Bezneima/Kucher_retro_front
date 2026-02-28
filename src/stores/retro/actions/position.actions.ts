import { normalizeColumns } from '../helpers/normalize'
import { getBoardColumns, getBoardId } from '../helpers/selectors'
import {
  applySyncColumnsToBoard,
  buildPositionsSnapshot,
  cloneColumnsSnapshot,
  getChangedPositionItems as getChangedPositionItemsHelper,
  recalculateItemIndices,
  reindexBoardColumns,
  rollbackColumnsSnapshot,
} from '../helpers/positions'
import type {
  RetroColumn,
  RetroGroup,
  RetroItem,
  TGroupPositionPayloadChange,
  TItemPositionChange,
  TItemPositionPayloadChange,
} from '../types'
import { retroBoardService } from '@/api/services/retroBoardService'

type TMoveItemOptions = {
  itemId: number
  newColumnId: number
  newGroupId: number | null
  newRowIndex: number
}

type TMoveGroupOptions = {
  groupId: number
  newColumnId: number
  newOrderIndex: number
}

export const buildItemMoveChange = (options: TMoveItemOptions): TItemPositionPayloadChange => ({
  itemId: options.itemId,
  newColumnId: options.newColumnId,
  newGroupId: options.newGroupId,
  newRowIndex: options.newRowIndex,
})

export const buildGroupMoveChange = (options: TMoveGroupOptions): TGroupPositionPayloadChange => ({
  groupId: options.groupId,
  newColumnId: options.newColumnId,
  newOrderIndex: options.newOrderIndex,
})

const isPositiveInteger = (value: unknown) => {
  return Number.isInteger(value) && Number(value) > 0
}

const toError = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim()
    if (message) {
      return new Error(message)
    }
  }

  return new Error(fallback)
}

const findColumnIndexById = (columns: RetroColumn[], columnId: number) => {
  return columns.findIndex((column) => column.id === columnId)
}

const findItemLocation = (columns: RetroColumn[], itemId: number) => {
  for (const [columnIndex, column] of columns.entries()) {
    const rootEntryIndex = column.entries.findIndex(
      (entry) => entry.type === 'ITEM' && entry.item.id === itemId,
    )
    if (rootEntryIndex >= 0) {
      const rootEntry = column.entries[rootEntryIndex]
      if (!rootEntry || rootEntry.type !== 'ITEM') {
        continue
      }

      return {
        column,
        columnIndex,
        group: null,
        item: rootEntry.item,
        entryIndex: rootEntryIndex,
        itemIndex: column.items.findIndex((item) => item.id === itemId),
      }
    }

    for (const group of column.groups) {
      const groupItemIndex = group.items.findIndex((item) => item.id === itemId)
      if (groupItemIndex < 0) {
        continue
      }

      const item = group.items[groupItemIndex]
      if (!item) {
        continue
      }

      return {
        column,
        columnIndex,
        group,
        item,
        entryIndex: -1,
        itemIndex: groupItemIndex,
      }
    }
  }

  return null
}

const findGroupLocation = (columns: RetroColumn[], groupId: number) => {
  for (const [columnIndex, column] of columns.entries()) {
    const groupIndex = column.groups.findIndex((group) => group.id === groupId)
    if (groupIndex < 0) {
      continue
    }

    const group = column.groups[groupIndex]
    if (!group) {
      continue
    }

    const entryIndex = column.entries.findIndex(
      (entry) => entry.type === 'GROUP' && entry.group.id === groupId,
    )

    return {
      column,
      columnIndex,
      group,
      entryIndex,
      groupIndex,
    }
  }

  return null
}

const removeItemFromColumn = (column: RetroColumn, itemId: number) => {
  const rootEntryIndex = column.entries.findIndex(
    (entry) => entry.type === 'ITEM' && entry.item.id === itemId,
  )
  if (rootEntryIndex >= 0) {
    const [removedEntry] = column.entries.splice(rootEntryIndex, 1)
    column.items = column.items.filter((item) => item.id !== itemId)
    return removedEntry?.type === 'ITEM' ? removedEntry.item : null
  }

  for (const group of column.groups) {
    const groupItemIndex = group.items.findIndex((item) => item.id === itemId)
    if (groupItemIndex < 0) {
      continue
    }

    const [removed] = group.items.splice(groupItemIndex, 1)
    return removed ?? null
  }

  return null
}

const removeItemEverywhere = (columns: RetroColumn[], itemId: number) => {
  let foundItem: RetroItem | null = null

  for (const column of columns) {
    const removed = removeItemFromColumn(column, itemId)
    if (removed && !foundItem) {
      foundItem = removed
    }
  }

  return foundItem
}

const insertItemIntoRoot = (column: RetroColumn, item: RetroItem, targetIndex: number) => {
  const boundedIndex = Math.min(Math.max(targetIndex, 0), column.entries.length)
  item.groupId = null

  column.entries.splice(boundedIndex, 0, {
    type: 'ITEM',
    orderIndex: boundedIndex,
    item,
  })
}

const insertItemIntoGroup = (group: RetroGroup, item: RetroItem, targetIndex: number) => {
  const boundedIndex = Math.min(Math.max(targetIndex, 0), group.items.length)
  item.groupId = group.id
  group.items.splice(boundedIndex, 0, item)
}

const removeGroupFromColumn = (column: RetroColumn, groupId: number) => {
  const groupIndex = column.groups.findIndex((group) => group.id === groupId)
  if (groupIndex < 0) {
    return null
  }

  const [group] = column.groups.splice(groupIndex, 1)
  if (!group) {
    return null
  }

  const entryIndex = column.entries.findIndex(
    (entry) => entry.type === 'GROUP' && entry.group.id === groupId,
  )
  if (entryIndex >= 0) {
    column.entries.splice(entryIndex, 1)
  }

  return group
}

const removeGroupEverywhere = (columns: RetroColumn[], groupId: number) => {
  let foundGroup: RetroGroup | null = null

  for (const column of columns) {
    const removed = removeGroupFromColumn(column, groupId)
    if (removed && !foundGroup) {
      foundGroup = removed
    }
  }

  return foundGroup
}

const insertGroupIntoColumnRoot = (column: RetroColumn, group: RetroGroup, targetIndex: number) => {
  const boundedIndex = Math.min(Math.max(targetIndex, 0), column.entries.length)
  group.columnId = column.id

  column.groups.push(group)
  column.entries.splice(boundedIndex, 0, {
    type: 'GROUP',
    orderIndex: boundedIndex,
    group,
  })
}

const applySyncResultToCurrentBoard = (
  context: any,
  payload: { boardId: number; updated: number; changedColumnIds: number[]; columns: unknown[] },
) => {
  const currentBoard = context.board[0]
  if (!currentBoard || currentBoard.id !== payload.boardId) {
    return
  }

  const normalizedColumns = normalizeColumns(payload.columns)
  currentBoard.columns = applySyncColumnsToBoard(currentBoard.columns, {
    boardId: payload.boardId,
    updated: payload.updated,
    changedColumnIds: payload.changedColumnIds,
    columns: normalizedColumns,
  })
  context.board = [{ ...currentBoard }]
  context.setLastSyncedPositions()
}

export const positionActions = {
  ensureLastSyncedPositionsInitialized(this: any) {
    if (Object.keys(this.lastSyncedPositions).length > 0) {
      return
    }

    this.setLastSyncedPositions()
  },

  async syncChangedItemPositions(this: any) {
    this.ensureLastSyncedPositionsInitialized()
    const boardId = getBoardId(this)
    if (!boardId) {
      return false
    }

    const changes: TItemPositionPayloadChange[] = this.getChangedPositionItems().map(
      (change: TItemPositionChange) => ({
        itemId: change.item.id,
        newColumnId: change.newColumnId,
        newGroupId: change.newGroupId,
        newRowIndex: change.newRowIndex,
      }),
    )

    if (changes.length === 0) {
      return true
    }

    try {
      const response = await retroBoardService.syncItemPositions(boardId, changes)
      applySyncResultToCurrentBoard(this, response)
      return true
    } catch (error) {
      console.error('[retro] failed to sync item positions', error)
      await this.loadBoardColumns(boardId)
      return false
    }
  },

  async moveItemWithSync(this: any, options: TMoveItemOptions) {
    const boardId = getBoardId(this)
    if (!boardId) {
      throw new Error('Board not selected')
    }

    if (!isPositiveInteger(options.itemId) || !isPositiveInteger(options.newColumnId)) {
      throw new Error('Invalid move item payload')
    }

    const columns = getBoardColumns(this)
    const sourceLocation = findItemLocation(columns, options.itemId)
    const targetColumnIndex = findColumnIndexById(columns, options.newColumnId)

    if (!sourceLocation || targetColumnIndex < 0) {
      throw new Error('Item or target column not found')
    }

    const targetColumn = columns[targetColumnIndex]
    if (!targetColumn) {
      throw new Error('Target column not found')
    }

    const affectedColumnIds = Array.from(new Set([sourceLocation.column.id, targetColumn.id]))
    const snapshot = cloneColumnsSnapshot(columns, affectedColumnIds)

    const movedItem = removeItemEverywhere(columns, options.itemId)
    if (!movedItem) {
      throw new Error('Failed to move item locally')
    }

    if (options.newGroupId == null) {
      insertItemIntoRoot(targetColumn, movedItem, options.newRowIndex)
    } else {
      const targetGroup = targetColumn.groups.find((group) => group.id === options.newGroupId)
      if (!targetGroup) {
        const restoredColumns = rollbackColumnsSnapshot(columns, snapshot)
        const board = this.board[0]
        if (board) {
          board.columns = restoredColumns
          this.board = [{ ...board }]
        }
        throw new Error('One or more target groups not found')
      }

      insertItemIntoGroup(targetGroup, movedItem, options.newRowIndex)
    }

    reindexBoardColumns(columns)
    const board = this.board[0]
    if (board) {
      board.columns = [...columns]
      this.board = [{ ...board }]
    }

    const change = buildItemMoveChange(options)

    try {
      const response = await retroBoardService.syncItemPositions(boardId, [change])
      applySyncResultToCurrentBoard(this, response)
    } catch (error) {
      const restoredColumns = rollbackColumnsSnapshot(columns, snapshot)
      if (board) {
        board.columns = restoredColumns
        this.board = [{ ...board }]
      }
      this.setLastSyncedPositions()
      throw toError(error, 'Не удалось переместить карточку')
    }
  },

  async moveGroupWithSync(this: any, options: TMoveGroupOptions) {
    const boardId = getBoardId(this)
    if (!boardId) {
      throw new Error('Board not selected')
    }

    if (!isPositiveInteger(options.groupId) || !isPositiveInteger(options.newColumnId)) {
      throw new Error('Invalid move group payload')
    }

    const columns = getBoardColumns(this)
    const sourceLocation = findGroupLocation(columns, options.groupId)
    const targetColumnIndex = findColumnIndexById(columns, options.newColumnId)

    if (!sourceLocation || targetColumnIndex < 0) {
      throw new Error('Group or target column not found')
    }

    const targetColumn = columns[targetColumnIndex]
    if (!targetColumn) {
      throw new Error('Target column not found')
    }

    const affectedColumnIds = Array.from(new Set([sourceLocation.column.id, targetColumn.id]))
    const snapshot = cloneColumnsSnapshot(columns, affectedColumnIds)

    const movedGroup = removeGroupEverywhere(columns, options.groupId)
    if (!movedGroup) {
      throw new Error('Failed to move group locally')
    }

    insertGroupIntoColumnRoot(targetColumn, movedGroup, options.newOrderIndex)

    reindexBoardColumns(columns)
    const board = this.board[0]
    if (board) {
      board.columns = [...columns]
      this.board = [{ ...board }]
    }

    const change = buildGroupMoveChange(options)

    try {
      const response = await retroBoardService.syncGroupPositions(boardId, [change])
      applySyncResultToCurrentBoard(this, response)
    } catch (error) {
      const restoredColumns = rollbackColumnsSnapshot(columns, snapshot)
      if (board) {
        board.columns = restoredColumns
        this.board = [{ ...board }]
      }
      this.setLastSyncedPositions()
      throw toError(error, 'Не удалось переместить группу')
    }
  },

  moveItemByIdToColumn(this: any, itemId: number, toColumnId: number, newIndex: number) {
    void this.moveItemWithSync({
      itemId,
      newColumnId: toColumnId,
      newGroupId: null,
      newRowIndex: newIndex,
    })
  },

  reorderItemsInColumn(this: any, columnId: number, oldIndex: number, newIndex: number) {
    const column = getBoardColumns(this).find((entry) => entry.id === columnId)
    const item = column?.items[oldIndex]
    if (!item) {
      return
    }

    void this.moveItemWithSync({
      itemId: item.id,
      newColumnId: columnId,
      newGroupId: null,
      newRowIndex: newIndex,
    })
  },

  moveItemBetweenColumns(
    this: any,
    fromColumnId: number,
    toColumnId: number,
    oldIndex: number,
    newIndex: number,
  ) {
    const fromColumn = getBoardColumns(this).find((entry) => entry.id === fromColumnId)
    const item = fromColumn?.items[oldIndex]
    if (!item) {
      return
    }

    void this.moveItemWithSync({
      itemId: item.id,
      newColumnId: toColumnId,
      newGroupId: null,
      newRowIndex: newIndex,
    })
  },

  async syncAllItemIndices(this: any, shouldSyncWithBackend = true) {
    const columns = getBoardColumns(this)
    recalculateItemIndices(columns)

    const board = this.board[0]
    if (board) {
      board.columns = [...columns]
      this.board = [{ ...board }]
    }

    if (shouldSyncWithBackend) {
      await this.syncChangedItemPositions()
    }
  },

  setLastSyncedPositions(this: any) {
    this.lastSyncedPositions = buildPositionsSnapshot(getBoardColumns(this))
  },

  getChangedPositionItems(this: any): TItemPositionChange[] {
    return getChangedPositionItemsHelper(getBoardColumns(this), this.lastSyncedPositions)
  },
}
