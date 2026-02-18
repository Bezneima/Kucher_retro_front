import { httpClient } from '@/api/httpClient'
import { goodCardColors } from '../constants'
import { findColumnById, getBoardColumns, getBoardId } from '../helpers/selectors'

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
  updateColumnNameEnd(this: any, columnId: number) {
    const column = findColumnById(this, columnId)
    if (column) {
      column.isNameEditing = false
      void httpClient.patch(`/retro/columns/${columnId}/name`, { name: column.name })
    }
  },
  updateColumnColor(this: any, columnId: number, color: string) {
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
    const createdColumn = {
      id: Date.now() + nextColumnNumber,
      name: `Column ${nextColumnNumber}`,
      color: goodCardColors[(nextColumnNumber - 1) % goodCardColors.length] ?? '#f0f0f0',
      isNameEditing: false,
      items: [],
    }

    columns.push(createdColumn)

    void httpClient
      .post(`/retro/boards/${boardId}/columns`, {
        name: createdColumn.name,
        color: createdColumn.color,
      })
      .then((response) => {
        const payload = (response?.data ?? {}) as { id?: unknown; name?: unknown; color?: unknown }
        const createdId = Number(payload.id)

        if (Number.isFinite(createdId) && createdId > 0) {
          createdColumn.id = createdId
        }
        if (typeof payload.name === 'string' && payload.name) {
          createdColumn.name = payload.name
        }
        if (typeof payload.color === 'string' && payload.color) {
          createdColumn.color = payload.color
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
