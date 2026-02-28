import type {
  SyncPositionsResult,
  TItemPositionChange,
  TRetroColumn,
  TRetroColumnEntry,
  TRetroColumnItem,
} from '../types'

const cloneItem = (item: TRetroColumnItem): TRetroColumnItem => ({
  ...item,
  likes: [...item.likes],
})

const cloneEntry = (entry: TRetroColumnEntry): TRetroColumnEntry => {
  if (entry.type === 'ITEM') {
    return {
      type: 'ITEM',
      orderIndex: entry.orderIndex,
      item: cloneItem(entry.item),
    }
  }

  return {
    type: 'GROUP',
    orderIndex: entry.orderIndex,
    group: {
      ...entry.group,
      color: { ...entry.group.color },
      items: entry.group.items.map(cloneItem),
    },
  }
}

export const cloneColumn = (column: TRetroColumn): TRetroColumn => {
  return {
    ...column,
    color: { ...column.color },
    items: column.items.map(cloneItem),
    groups: column.groups.map((group) => ({
      ...group,
      color: { ...group.color },
      items: group.items.map(cloneItem),
    })),
    entries: column.entries.map(cloneEntry),
  }
}

export const reindexColumn = (column: TRetroColumn, columnIndex: number) => {
  const groupsById = new Map(column.groups.map((group) => [group.id, group] as const))
  const nextEntries: TRetroColumnEntry[] = []
  const nextRootItems: TRetroColumnItem[] = []

  for (const [entryIndex, entry] of column.entries.entries()) {
    if (entry.type === 'ITEM') {
      const item = entry.item
      item.columnIndex = columnIndex
      item.groupId = null
      item.rowIndex = entryIndex

      nextRootItems.push(item)
      nextEntries.push({
        type: 'ITEM',
        orderIndex: entryIndex,
        item,
      })
      continue
    }

    const group = groupsById.get(entry.group.id) ?? entry.group
    group.columnId = column.id
    group.orderIndex = entryIndex
    group.items = group.items.map((item, groupItemIndex) => ({
      ...item,
      columnIndex,
      groupId: group.id,
      rowIndex: groupItemIndex,
    }))

    groupsById.set(group.id, group)
    nextEntries.push({
      type: 'GROUP',
      orderIndex: entryIndex,
      group,
    })
  }

  const groupsInEntries = new Set(
    nextEntries.filter((entry) => entry.type === 'GROUP').map((entry) => entry.group.id),
  )

  for (const group of column.groups) {
    if (groupsInEntries.has(group.id)) {
      continue
    }

    group.columnId = column.id
    group.orderIndex = nextEntries.length
    group.items = group.items.map((item, groupItemIndex) => ({
      ...item,
      columnIndex,
      groupId: group.id,
      rowIndex: groupItemIndex,
    }))

    nextEntries.push({
      type: 'GROUP',
      orderIndex: nextEntries.length,
      group,
    })
    groupsById.set(group.id, group)
  }

  column.entries = nextEntries
  column.items = nextRootItems
  column.groups = Array.from(groupsById.values()).sort((left, right) => left.orderIndex - right.orderIndex)
}

export const reindexBoardColumns = (columns: TRetroColumn[]) => {
  for (const [columnIndex, column] of columns.entries()) {
    reindexColumn(column, columnIndex)
  }
}

export const recalculateItemIndices = (columns: TRetroColumn[]) => {
  reindexBoardColumns(columns)
}

export const buildPositionsSnapshot = (columns: TRetroColumn[]) => {
  const positions: Record<number, { columnId: number; groupId: number | null; rowIndex: number }> = {}

  for (const column of columns) {
    for (const item of column.items) {
      positions[item.id] = {
        columnId: column.id,
        groupId: null,
        rowIndex: item.rowIndex,
      }
    }

    for (const group of column.groups) {
      for (const item of group.items) {
        positions[item.id] = {
          columnId: column.id,
          groupId: group.id,
          rowIndex: item.rowIndex,
        }
      }
    }
  }

  return positions
}

export const getChangedPositionItems = (
  columns: TRetroColumn[],
  lastSyncedPositions: Record<number, { columnId: number; groupId: number | null; rowIndex: number }>,
): TItemPositionChange[] => {
  const result: TItemPositionChange[] = []

  for (const column of columns) {
    for (const item of column.items) {
      const prev = lastSyncedPositions[item.id]
      if (!prev) {
        continue
      }

      if (prev.columnId !== column.id || prev.groupId !== null || prev.rowIndex !== item.rowIndex) {
        result.push({
          item,
          oldColumnId: prev.columnId,
          oldGroupId: prev.groupId,
          oldRowIndex: prev.rowIndex,
          newColumnId: column.id,
          newGroupId: null,
          newRowIndex: item.rowIndex,
        })
      }
    }

    for (const group of column.groups) {
      for (const item of group.items) {
        const prev = lastSyncedPositions[item.id]
        if (!prev) {
          continue
        }

        if (
          prev.columnId !== column.id ||
          prev.groupId !== group.id ||
          prev.rowIndex !== item.rowIndex
        ) {
          result.push({
            item,
            oldColumnId: prev.columnId,
            oldGroupId: prev.groupId,
            oldRowIndex: prev.rowIndex,
            newColumnId: column.id,
            newGroupId: group.id,
            newRowIndex: item.rowIndex,
          })
        }
      }
    }
  }

  return result
}

export const cloneColumnsSnapshot = (columns: TRetroColumn[], columnIds: number[]) => {
  const ids = new Set(columnIds)
  const snapshot = new Map<number, TRetroColumn>()

  for (const column of columns) {
    if (!ids.has(column.id)) {
      continue
    }

    snapshot.set(column.id, cloneColumn(column))
  }

  return snapshot
}

export const rollbackColumnsSnapshot = (
  columns: TRetroColumn[],
  snapshot: Map<number, TRetroColumn>,
): TRetroColumn[] => {
  return columns.map((column) => snapshot.get(column.id) ?? column)
}

export const applySyncColumnsToBoard = (
  columns: TRetroColumn[],
  payload: SyncPositionsResult,
): TRetroColumn[] => {
  const changedIds = new Set(payload.changedColumnIds)
  const incomingById = new Map(payload.columns.map((column) => [column.id, column] as const))

  return columns.map((column) => {
    if (changedIds.size > 0 && !changedIds.has(column.id)) {
      return column
    }

    return incomingById.get(column.id) ?? column
  })
}
