import { toRaw } from 'vue'
import { httpClient } from '@/api/httpClient'
import { getBoardColumns } from '../helpers/selectors'
import type { TRetroBoardState, TRetroColumnItem } from '../types'

type TItemActionsContext = TRetroBoardState & {
  ensureLastSyncedPositionsInitialized: () => void
  syncAllItemIndices: (shouldSyncWithBackend?: boolean) => Promise<void>
  setActiveItemId: (itemId: number | null) => void
  setLastSyncedPositions: () => void
  getCurrentUserId: string
}

export const itemActions = {
  addItemToColumn(this: TItemActionsContext, columnId: number) {
    this.ensureLastSyncedPositionsInitialized()

    const columns = getBoardColumns(this)
    const column = columns.find((item) => item.id === columnId)
    if (!column) return

    const maxItemId = columns
      .flatMap((item) => item.items)
      .reduce((maxId, item) => Math.max(maxId, item.id), 0)
    const columnIndex = columns.findIndex((item) => item.id === columnId)
    const nextItemId = maxItemId + 1

    column.items.unshift({
      id: nextItemId,
      description: 'Напишите описание нового элемента',
      syncedDescription: undefined,
      likes: [],
      commentsCount: 0,
      isDraft: true,
      columnIndex,
      rowIndex: 0,
    })
    void this.syncAllItemIndices(false)
    this.setActiveItemId(nextItemId)
  },
  updateItemDescriptionLocal(this: TItemActionsContext, itemId: number, description: string) {
    for (const column of getBoardColumns(this)) {
      const item = column.items.find((i) => i.id === itemId)
      if (!item) continue

      item.description = description
      return
    }
  },
  setActiveItemId(this: TItemActionsContext, itemId: number | null) {
    this.activeItemId = itemId
  },
  async updateItemDescription(this: TItemActionsContext, itemId: number, description: string) {
    let itemToUpdate: TRetroColumnItem | null = null
    let columnIdForItem: number | null = null
    let persistedDescription: string | null = null

    for (const column of getBoardColumns(this)) {
      const item = column.items.find((i) => i.id === itemId)
      if (!item) continue

      persistedDescription = item.syncedDescription ?? item.description
      item.description = description
      itemToUpdate = item
      columnIdForItem = column.id
      break
    }

    if (!itemToUpdate) return

    if (itemToUpdate.isDraft && columnIdForItem != null) {
      const oldLocalId = itemToUpdate.id
      const createResponse = await httpClient.post(`/retro/columns/${columnIdForItem}/items`, {
        description,
      })
      const createdItem = (createResponse.data ?? {}) as Partial<TRetroColumnItem> & {
        createdAt?: unknown
        columnIndex?: unknown
        rowIndex?: unknown
        commentsCount?: unknown
      }

      if (typeof createdItem.id === 'number' && Number.isFinite(createdItem.id)) {
        itemToUpdate.id = createdItem.id
      }
      if (typeof createdItem.description === 'string') {
        itemToUpdate.description = createdItem.description
      }
      if (typeof createdItem.createdAt === 'string') {
        itemToUpdate.createdAt = createdItem.createdAt
      }
      if (Array.isArray(createdItem.likes)) {
        itemToUpdate.likes = createdItem.likes.filter((like): like is string => typeof like === 'string')
      }
      const createdCommentsCount = Number(createdItem.commentsCount)
      if (Number.isInteger(createdCommentsCount) && createdCommentsCount >= 0) {
        itemToUpdate.commentsCount = createdCommentsCount
      }
      if ('color' in createdItem) {
        itemToUpdate.color = typeof createdItem.color === 'string' ? createdItem.color : undefined
      }
      if (typeof createdItem.columnIndex === 'number' && Number.isFinite(createdItem.columnIndex)) {
        itemToUpdate.columnIndex = createdItem.columnIndex
      }
      if (typeof createdItem.rowIndex === 'number' && Number.isFinite(createdItem.rowIndex)) {
        itemToUpdate.rowIndex = createdItem.rowIndex
      }

      itemToUpdate.isDraft = false
      itemToUpdate.syncedDescription = itemToUpdate.description
      if (oldLocalId !== itemToUpdate.id) {
        delete this.lastSyncedPositions[oldLocalId]
      }
      this.setLastSyncedPositions()
      return
    }

    if (persistedDescription === description) return

    itemToUpdate.syncedDescription = description
    void httpClient.patch(`/retro/items/${itemId}/description`, { description })
    console.info(toRaw(this.board))
  },
  updateItemLike(this: TItemActionsContext, itemId: number, userId?: string | null) {
    const currentUserId = userId ?? this.getCurrentUserId

    for (const column of getBoardColumns(this)) {
      const item = column.items.find((i) => i.id === itemId)

      if (!item) continue

      if (currentUserId) {
        const likes = item.likes
        const index = likes.indexOf(currentUserId)

        if (index === -1) {
          likes.push(currentUserId)
        } else {
          likes.splice(index, 1)
        }
      }

      if (item.isDraft) return
      void httpClient.patch(`/retro/items/${itemId}/like`)
      return
    }
  },
  setItemCommentsCount(this: TItemActionsContext, itemId: number, commentsCount: number) {
    const normalizedCommentsCount = Number(commentsCount)
    if (!Number.isFinite(normalizedCommentsCount)) return

    for (const column of getBoardColumns(this)) {
      const item = column.items.find((i) => i.id === itemId)
      if (!item) continue

      item.commentsCount = Math.max(0, Math.floor(normalizedCommentsCount))
      return
    }
  },
  updateItemColor(this: TItemActionsContext, itemId: number, color?: string) {
    for (const column of getBoardColumns(this)) {
      const item = column.items.find((i) => i.id === itemId)
      if (!item) continue

      item.color = color
      if (item.isDraft) return
      void httpClient.patch(`/retro/items/${itemId}/color`, { color })
      return
    }
  },
  deleteItem(this: TItemActionsContext, itemId: number) {
    this.ensureLastSyncedPositionsInitialized()
    let isDraftItem = false

    for (const column of getBoardColumns(this)) {
      const item = column.items.find((i) => i.id === itemId)
      if (item?.isDraft) {
        isDraftItem = true
      }
      column.items = column.items.filter((i) => i.id !== itemId)
    }
    void this.syncAllItemIndices()

    if (isDraftItem) return
    void httpClient.delete(`/retro/items/${itemId}`)
  },
}
