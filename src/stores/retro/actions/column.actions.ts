import { httpClient } from '@/api/httpClient'
import { availableColors, goodCardColors } from '../constants'
import { findColumnById, getBoardColumns, getBoardId } from '../helpers/selectors'
import type { TRetroColumnColor } from '../types'

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
    if (!column) return

    const previousDescription = column.description
    column.description = description

    void httpClient
      .patch(`/retro/columns/${columnId}/description`, { description })
      .catch((error) => {
        column.description = previousDescription
        console.error('[retro] failed to update column description', error)
      })
  },
  updateColumnNameEnd(this: any, columnId: number) {
    const column = findColumnById(this, columnId)
    if (column) {
      column.isNameEditing = false
      void httpClient.patch(`/retro/columns/${columnId}/name`, { name: column.name })
    }
  },
  updateColumnColor(this: any, columnId: number, color: TRetroColumnColor) {
    const column = findColumnById(this, columnId)
    if (!column) return

    column.color = color
    void httpClient.patch(`/retro/columns/${columnId}/color`, { color })
  },
  deleteColumn(this: any, columnId: number) {
    const columns = getBoardColumns(this)
    const columnIndex = columns.findIndex((column) => column.id === columnId)
    if (columnIndex < 0) return

    const [deletedColumn] = columns.splice(columnIndex, 1)
    if (!deletedColumn) return

    void httpClient.delete(`/retro/columns/${columnId}`).catch((error) => {
      columns.splice(columnIndex, 0, deletedColumn)
      console.error('[retro] failed to delete column', error)
    })
  },

  /** Меняет порядок колонок по индексам (после перетаскивания). */
  async reorderColumns(this: any, oldIndex: number, newIndex: number) {
    this.ensureLastSyncedPositionsInitialized()

    const columns = getBoardColumns(this)
    if (oldIndex < 0 || newIndex < 0 || oldIndex >= columns.length || newIndex >= columns.length) {
      return
    }

    const removed = columns.splice(oldIndex, 1)[0]
    if (!removed) return

    columns.splice(newIndex, 0, removed)

    const boardId = getBoardId(this)
    if (!boardId) return

    try {
      await httpClient.patch(`/retro/boards/${boardId}/columns/reorder`, { oldIndex, newIndex })
      await this.syncAllItemIndices()
    } catch (error) {
      console.error('[retro] failed to reorder columns', error)
      await this.loadBoardForUser()
    }
  },
  addColumn(this: any) {
    const columns = getBoardColumns(this)
    const boardId = getBoardId(this)
    if (!boardId) return

    const nextColumnNumber = columns.length + 1
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
      isNameEditing: false,
      items: [],
    }

    columns.push(createdColumn)

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
