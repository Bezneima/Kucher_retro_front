import { toRaw } from 'vue'
import { httpClient } from '@/api/httpClient'
import { getBoardColumns, getBoardId } from '../helpers/selectors'
import {
  buildPositionsSnapshot,
  getChangedPositionItems as getChangedPositionItemsHelper,
  recalculateItemIndices,
} from '../helpers/positions'
import type { TItemPositionChange, TItemPositionPayloadChange, TRetroColumnItem } from '../types'

export const positionActions = {
  ensureLastSyncedPositionsInitialized(this: any) {
    if (Object.keys(this.lastSyncedPositions).length > 0) return
    this.setLastSyncedPositions()
  },
  async syncChangedItemPositions(this: any) {
    const boardId = getBoardId(this)
    if (!boardId) return false

    const changes: TItemPositionPayloadChange[] = this.getChangedPositionItems().map(
      (change: TItemPositionChange) => ({
        itemId: change.item.id,
        newColumnId: change.newColumnId,
        newRowIndex: change.newRowIndex,
      }),
    )
    if (changes.length === 0) return true

    try {
      await httpClient.patch(`/retro/boards/${boardId}/items/positions`, { changes })
      this.setLastSyncedPositions()
      return true
    } catch (error) {
      console.error('[retro] failed to sync item positions', error)
      await this.loadBoardForUser()
      return false
    }
  },
  moveItemByIdToColumn(this: any, itemId: number, toColumnId: number, newIndex: number) {
    this.ensureLastSyncedPositionsInitialized()

    const columns = getBoardColumns(this)
    const toColumn = columns.find((column) => column.id === toColumnId)
    if (!toColumn || newIndex < 0) return

    let movedItem: TRetroColumnItem | null = null
    let fromColumnId: number | null = null
    let fromIndex = -1

    for (const column of columns) {
      const itemIndex = column.items.findIndex((item) => item.id === itemId)
      if (itemIndex === -1) continue
      fromColumnId = column.id
      fromIndex = itemIndex
      const targetIndex = Math.min(newIndex, toColumn.items.length - (column.id === toColumnId ? 1 : 0))
      if (column.id === toColumnId && targetIndex === itemIndex) return
      movedItem = column.items.splice(itemIndex, 1)[0] ?? null
      break
    }

    if (!movedItem) return

    const boundedNewIndex = Math.min(newIndex, toColumn.items.length)
    toColumn.items.splice(boundedNewIndex, 0, movedItem)
    const shouldSync = !movedItem.isDraft || fromColumnId !== toColumnId || fromIndex !== boundedNewIndex
    void this.syncAllItemIndices(shouldSync)
  },
  reorderItemsInColumn(this: any, columnId: number, oldIndex: number, newIndex: number) {
    this.ensureLastSyncedPositionsInitialized()

    const column = getBoardColumns(this).find((item) => item.id === columnId)
    if (!column) return
    if (
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex >= column.items.length ||
      newIndex >= column.items.length
    ) {
      return
    }

    const movedItem = column.items.splice(oldIndex, 1)[0]
    if (!movedItem) return
    column.items.splice(newIndex, 0, movedItem)
    void this.syncAllItemIndices()
  },
  moveItemBetweenColumns(
    this: any,
    fromColumnId: number,
    toColumnId: number,
    oldIndex: number,
    newIndex: number,
  ) {
    this.ensureLastSyncedPositionsInitialized()

    if (fromColumnId === toColumnId) {
      this.reorderItemsInColumn(fromColumnId, oldIndex, newIndex)
      return
    }

    const columns = getBoardColumns(this)
    const fromColumn = columns.find((item) => item.id === fromColumnId)
    const toColumn = columns.find((item) => item.id === toColumnId)
    if (!fromColumn || !toColumn) return
    if (oldIndex < 0 || oldIndex >= fromColumn.items.length || newIndex < 0) return

    const movedItem = fromColumn.items.splice(oldIndex, 1)[0]
    if (!movedItem) return

    const boundedNewIndex = Math.min(newIndex, toColumn.items.length)
    toColumn.items.splice(boundedNewIndex, 0, movedItem)
    void this.syncAllItemIndices()
  },

  /** Обновляет columnIndex и rowIndex у всех элементов по текущему порядку в колонках */
  async syncAllItemIndices(this: any, shouldSyncWithBackend = true) {
    const columns = getBoardColumns(this)
    recalculateItemIndices(columns)

    if (shouldSyncWithBackend) {
      await this.syncChangedItemPositions()
    }
    console.info(toRaw(this.board))
  },

  /**
   * Сохраняет текущие позиции как "последние синхронизированные".
   * Вызывай после загрузки доски с бека или после успешной отправки позиций.
   */
  setLastSyncedPositions(this: any) {
    this.lastSyncedPositions = buildPositionsSnapshot(getBoardColumns(this))
  },

  /**
   * Возвращает массив только тех элементов, у которых изменилась позиция
   * (columnId или rowIndex) по сравнению с lastSyncedPositions.
   * Используй перед отправкой на бек.
   */
  getChangedPositionItems(this: any): TItemPositionChange[] {
    const result = getChangedPositionItemsHelper(getBoardColumns(this), this.lastSyncedPositions)
    console.log(result)
    return result
  },
}
