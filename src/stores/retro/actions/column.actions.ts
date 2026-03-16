import { httpClient } from '@/api/httpClient'
import { retroBoardService } from '@/api/services/retroBoardService'
import { reorderBoardColumns } from '@/shared/socket'
import { availableColors, goodCardColors } from '../constants'
import { findColumnById, getBoardColumns, getBoardId } from '../helpers/selectors'
import { reorderColumnsByPayloadIds } from '../helpers/reorderColumns'
import type { TRetroColumn, TRetroColumnColor } from '../types'

const normalizeColumnColorPayload = (payload: unknown, fallback: TRetroColumnColor): TRetroColumnColor => {
  if (typeof payload === 'string') {
    const normalized = payload.trim()
    if (!normalized) return fallback

    return {
      columnColor: normalized,
      itemColor: normalized,
      buttonColor: normalized,
    }
  }

  if (typeof payload !== 'object' || payload === null) {
    return fallback
  }

  const raw = payload as Partial<TRetroColumnColor>
  const columnColor =
    typeof raw.columnColor === 'string' && raw.columnColor.trim()
      ? raw.columnColor
      : fallback.columnColor
  const itemColor =
    typeof raw.itemColor === 'string' && raw.itemColor.trim() ? raw.itemColor : columnColor
  const buttonColor =
    typeof raw.buttonColor === 'string' && raw.buttonColor.trim()
      ? raw.buttonColor
      : fallback.buttonColor

  return {
    columnColor,
    itemColor,
    buttonColor,
  }
}

const cloneColumns = (columns: TRetroColumn[]): TRetroColumn[] => {
  return columns.map((column) => ({
    ...column,
    color: { ...column.color },
    items: column.items.map((item) => ({
      ...item,
      likes: [...item.likes],
    })),
    groups: column.groups.map((group) => ({
      ...group,
      color: { ...group.color },
      items: group.items.map((item) => ({
        ...item,
        likes: [...item.likes],
      })),
    })),
    entries: column.entries.map((entry) => {
      if (entry.type === 'ITEM') {
        return {
          type: 'ITEM' as const,
          orderIndex: entry.orderIndex,
          item: {
            ...entry.item,
            likes: [...entry.item.likes],
          },
        }
      }

      return {
        type: 'GROUP' as const,
        orderIndex: entry.orderIndex,
        group: {
          ...entry.group,
          color: { ...entry.group.color },
          items: entry.group.items.map((item) => ({
            ...item,
            likes: [...item.likes],
          })),
        },
      }
    }),
  }))
}

export const columnActions = {
  updateColumnNameStart(this: any, columnId: number) {
    const column = findColumnById(this, columnId)
    if (column) {
      column.isNameEditing = true
    }
  },
  updateColumnName(this: any, columnId: number, name: string) {
    const column = findColumnById(this, columnId)
    if (column) {
      column.name = name
    }
    console.info(this.board)
  },
  updateColumnDescription(this: any, columnId: number, description: string) {
    const column = findColumnById(this, columnId)
    const boardId = getBoardId(this)
    if (!column) return
    if (!boardId) return

    const previousDescription = column.description
    column.description = description

    void retroBoardService
      .updateColumnDescription(columnId, { description, boardId })
      .catch((error) => {
        column.description = previousDescription
        console.error('[retro] failed to update column description', error)
      })
  },
  updateColumnNameEnd(this: any, columnId: number) {
    const column = findColumnById(this, columnId)
    const boardId = getBoardId(this)
    if (column) {
      column.isNameEditing = false
      if (!boardId) {
        return
      }
      void retroBoardService.updateColumnName(columnId, { name: column.name, boardId })
    }
  },
  updateColumnColor(this: any, columnId: number, color: TRetroColumnColor) {
    const column = findColumnById(this, columnId)
    const boardId = getBoardId(this)
    if (!column) return
    if (!boardId) return

    column.color = color
    void retroBoardService.updateColumnColor(columnId, { color, boardId })
  },
  async toggleColumnCommon(this: any, columnId: number) {
    const column = findColumnById(this, columnId)
    const boardId = getBoardId(this)
    if (!column || !boardId) return

    await retroBoardService.updateColumnCommon(columnId, {
      common: !column.common,
      boardId,
    })
    await this.loadBoardColumns(boardId)
  },
  deleteColumn(this: any, columnId: number) {
    const columns = getBoardColumns(this)
    const boardId = getBoardId(this)
    const columnIndex = columns.findIndex((column) => column.id === columnId)
    if (columnIndex < 0 || !boardId) return

    const [deletedColumn] = columns.splice(columnIndex, 1)
    if (!deletedColumn) return

    void retroBoardService
      .deleteColumn(columnId, boardId)
      .then(() => this.loadBoardColumns(boardId))
      .catch((error) => {
        columns.splice(columnIndex, 0, deletedColumn)
        console.error('[retro] failed to delete column', error)
      })
  },

  /** Меняет порядок колонок по индексам (после перетаскивания). */
  async reorderColumns(this: any, oldIndex: number, newIndex: number) {
    this.ensureLastSyncedPositionsInitialized()

    const columns = getBoardColumns(this)
    const boardId = getBoardId(this)
    if (!boardId) return
    if (this.isColumnsReorderPending) {
      return
    }

    if (oldIndex < 0 || newIndex < 0 || oldIndex >= columns.length || newIndex >= columns.length) {
      return
    }

    const localColumnsCount = columns.filter((column) => !column.common).length
    const oldColumn = columns[oldIndex]
    const newColumn = columns[newIndex]
    if (
      oldIndex >= localColumnsCount ||
      newIndex >= localColumnsCount ||
      oldColumn?.common === true ||
      newColumn?.common === true
    ) {
      this.columnsReorderError = 'Общие колонки нельзя перемещать, а локальные можно менять только внутри своей секции'
      return
    }

    const previousColumns = cloneColumns(columns)
    const removed = columns.splice(oldIndex, 1)[0]
    if (!removed) return
    columns.splice(newIndex, 0, removed)

    this.columnsReorderError = ''
    this.isColumnsReorderPending = true

    try {
      const reorderedColumnsPayload = await reorderBoardColumns(boardId, oldIndex, newIndex)
      const currentBoard = this.board[0]
      if (!currentBoard || currentBoard.id !== boardId) {
        return
      }

      currentBoard.columns = reorderColumnsByPayloadIds(currentBoard.columns, reorderedColumnsPayload)
      this.board = [{ ...currentBoard }]
      await this.syncAllItemIndices().catch((syncError: unknown) => {
        console.error('[retro] failed to sync item positions after columns reorder', syncError)
      })
    } catch (error) {
      console.error('[retro] failed to reorder columns', error)
      const currentBoard = this.board[0]
      if (currentBoard && currentBoard.id === boardId) {
        currentBoard.columns = previousColumns
        this.board = [{ ...currentBoard }]
      }

      this.columnsReorderError =
        error instanceof Error && typeof error.message === 'string' && error.message
          ? error.message
          : 'Не удалось изменить порядок колонок'
    } finally {
      this.isColumnsReorderPending = false
    }
  },
  addColumn(this: any) {
    const columns = getBoardColumns(this)
    const boardId = getBoardId(this)
    if (!boardId) return

    const localColumnsCount = columns.filter((column) => !column.common).length
    const nextColumnNumber = localColumnsCount + 1
    const fallbackColor =
      availableColors[(nextColumnNumber - 1) % availableColors.length] ??
      ({
        columnColor: goodCardColors[(nextColumnNumber - 1) % goodCardColors.length] ?? '#f0f0f0',
        itemColor: goodCardColors[(nextColumnNumber - 1) % goodCardColors.length] ?? '#f0f0f0',
        buttonColor: goodCardColors[(nextColumnNumber - 1) % goodCardColors.length] ?? '#f0f0f0',
      } satisfies TRetroColumnColor)

    const createdColumn = {
      id: Date.now() + nextColumnNumber,
      name: `Column ${nextColumnNumber}`,
      description: '',
      color: { ...fallbackColor },
      common: false,
      isNameEditing: false,
      isDraft: true,
      items: [],
      groups: [],
      entries: [],
    }

    columns.splice(localColumnsCount, 0, createdColumn)

    void httpClient
      .post(`/retro/boards/${boardId}/columns`, {
        name: createdColumn.name,
        color: createdColumn.color,
        description: createdColumn.description,
      })
      .then((response) => {
        const payload = (response?.data ?? {}) as {
          id?: unknown
          name?: unknown
          color?: unknown
          description?: unknown
        }
        const createdId = Number(payload.id)

        if (Number.isFinite(createdId) && createdId > 0) {
          createdColumn.id = createdId
        }
        if (typeof payload.name === 'string' && payload.name) {
          createdColumn.name = payload.name
        }
        createdColumn.color = normalizeColumnColorPayload(payload.color, createdColumn.color)
        if (typeof payload.description === 'string') {
          createdColumn.description = payload.description
        }
        createdColumn.isDraft = false

        const duplicateIndex = columns.findIndex(
          (column) => column !== createdColumn && column.id === createdColumn.id,
        )
        if (duplicateIndex >= 0) {
          const createdIndex = columns.findIndex((column) => column === createdColumn)
          if (createdIndex >= 0) {
            columns.splice(createdIndex, 1)
          }
        }
      })
      .catch((error) => {
        const createdIndex = columns.findIndex((column) => column.id === createdColumn.id)
        if (createdIndex >= 0) {
          columns.splice(createdIndex, 1)
        }
        console.error('[retro] failed to create column', error)
      })
  },
}
