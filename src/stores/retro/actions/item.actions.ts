import { toRaw } from 'vue'
import { httpClient } from '@/api/httpClient'
import { retroBoardService } from '@/api/services/retroBoardService'
import { getBoardColumns } from '../helpers/selectors'
import { recalculateItemIndices } from '../helpers/positions'
import type { TRetroBoardState, TRetroColumnItem, TRetroGroup } from '../types'

type TItemActionsContext = TRetroBoardState & {
  ensureLastSyncedPositionsInitialized: () => void
  syncAllItemIndices: (shouldSyncWithBackend?: boolean) => Promise<void>
  setActiveItemId: (itemId: number | null) => void
  setLastSyncedPositions: () => void
  getCurrentUserId: string
  clearItemCommentsCache: (itemId: number) => void
}

const findItemLocation = (columns: ReturnType<typeof getBoardColumns>, itemId: number) => {
  for (const column of columns) {
    const rootItem = column.items.find((entry) => entry.id === itemId)
    if (rootItem) {
      return {
        column,
        group: null as TRetroGroup | null,
        item: rootItem,
      }
    }

    for (const group of column.groups) {
      const groupItem = group.items.find((entry) => entry.id === itemId)
      if (!groupItem) {
        continue
      }

      return {
        column,
        group,
        item: groupItem,
      }
    }
  }

  return null
}

const getAllItems = (columns: ReturnType<typeof getBoardColumns>) => {
  return columns.flatMap((column) => [
    ...column.items,
    ...column.groups.flatMap((group) => group.items),
  ])
}

export const itemActions = {
  addItemToColumn(this: TItemActionsContext, columnId: number) {
    this.ensureLastSyncedPositionsInitialized()

    const columns = getBoardColumns(this)
    const column = columns.find((entry) => entry.id === columnId)
    if (!column) {
      return
    }

    const maxItemId = getAllItems(columns).reduce((maxId, item) => Math.max(maxId, item.id), 0)
    const columnIndex = columns.findIndex((entry) => entry.id === columnId)
    const nextItemId = maxItemId + Date.now() + 1

    const draftItem: TRetroColumnItem = {
      id: nextItemId,
      description: 'Напишите описание нового элемента',
      createdAt: '',
      syncedDescription: undefined,
      likes: [],
      commentsCount: 0,
      isDraft: true,
      columnIndex,
      rowIndex: 0,
      groupId: null,
      color: undefined,
    }

    column.entries.unshift({
      type: 'ITEM',
      orderIndex: 0,
      item: draftItem,
    })

    recalculateItemIndices(columns)
    this.setActiveItemId(nextItemId)
  },

  updateItemDescriptionLocal(this: TItemActionsContext, itemId: number, description: string) {
    const location = findItemLocation(getBoardColumns(this), itemId)
    if (!location) {
      return
    }

    location.item.description = description
  },

  setActiveItemId(this: TItemActionsContext, itemId: number | null) {
    this.activeItemId = itemId
  },

  async updateItemDescription(this: TItemActionsContext, itemId: number, description: string) {
    const columns = getBoardColumns(this)
    const location = findItemLocation(columns, itemId)
    if (!location) {
      return
    }

    const { item, column, group } = location
    const persistedDescription = item.syncedDescription ?? item.description
    item.description = description

    if (item.isDraft) {
      const oldLocalId = item.id
      let createdItem: TRetroColumnItem
      try {
        createdItem = await retroBoardService.createItem(column.id, {
          description,
          groupId: group?.id ?? null,
        })
      } catch (error) {
        item.description = persistedDescription ?? item.description
        console.error('[retro] failed to create draft item', error)
        return
      }

      if (typeof createdItem.id === 'number' && Number.isFinite(createdItem.id)) {
        item.id = createdItem.id
      }
      if (typeof createdItem.description === 'string') {
        item.description = createdItem.description
      }
      if (typeof createdItem.createdAt === 'string') {
        item.createdAt = createdItem.createdAt
      }
      if (Array.isArray(createdItem.likes)) {
        item.likes = createdItem.likes.filter((like): like is string => typeof like === 'string')
      }

      const createdCommentsCount = Number(createdItem.commentsCount)
      if (Number.isInteger(createdCommentsCount) && createdCommentsCount >= 0) {
        item.commentsCount = createdCommentsCount
      }

      if ('color' in createdItem) {
        item.color = typeof createdItem.color === 'string' ? createdItem.color : undefined
      }

      if (typeof createdItem.columnIndex === 'number' && Number.isFinite(createdItem.columnIndex)) {
        item.columnIndex = createdItem.columnIndex
      }

      if (typeof createdItem.rowIndex === 'number' && Number.isFinite(createdItem.rowIndex)) {
        item.rowIndex = createdItem.rowIndex
      }

      if ('groupId' in createdItem) {
        const nextGroupId = Number(createdItem.groupId)
        item.groupId = Number.isInteger(nextGroupId) && nextGroupId > 0 ? nextGroupId : null
      }

      item.isDraft = false
      item.syncedDescription = item.description

      if (oldLocalId !== item.id) {
        delete this.lastSyncedPositions[oldLocalId]
      }

      this.setLastSyncedPositions()
      return
    }

    if (persistedDescription === description) {
      return
    }

    item.syncedDescription = description
    void httpClient.patch(`/retro/items/${itemId}/description`, { description })
    console.info(toRaw(this.board))
  },

  updateItemLike(this: TItemActionsContext, itemId: number, userId?: string | null) {
    const currentUserId = userId ?? this.getCurrentUserId
    const location = findItemLocation(getBoardColumns(this), itemId)
    if (!location) {
      return
    }

    const item = location.item

    if (currentUserId) {
      const likes = item.likes
      const index = likes.indexOf(currentUserId)

      if (index === -1) {
        likes.push(currentUserId)
      } else {
        likes.splice(index, 1)
      }
    }

    if (item.isDraft) {
      return
    }

    void httpClient.patch(`/retro/items/${itemId}/like`)
  },

  setItemCommentsCount(this: TItemActionsContext, itemId: number, commentsCount: number) {
    const normalizedCommentsCount = Number(commentsCount)
    if (!Number.isFinite(normalizedCommentsCount)) {
      return
    }

    const location = findItemLocation(getBoardColumns(this), itemId)
    if (!location) {
      return
    }

    location.item.commentsCount = Math.max(0, Math.floor(normalizedCommentsCount))
  },

  updateItemColor(this: TItemActionsContext, itemId: number, color?: string) {
    const location = findItemLocation(getBoardColumns(this), itemId)
    if (!location) {
      return
    }

    location.item.color = color

    if (location.item.isDraft) {
      return
    }

    void httpClient.patch(`/retro/items/${itemId}/color`, { color })
  },

  deleteItem(this: TItemActionsContext, itemId: number) {
    this.ensureLastSyncedPositionsInitialized()

    const columns = getBoardColumns(this)
    let isDraftItem = false

    for (const column of columns) {
      const rootItem = column.items.find((entry) => entry.id === itemId)
      if (rootItem) {
        isDraftItem = rootItem.isDraft === true
        column.entries = column.entries.filter(
          (entry) => !(entry.type === 'ITEM' && entry.item.id === itemId),
        )
        break
      }

      for (const group of column.groups) {
        const itemIndex = group.items.findIndex((entry) => entry.id === itemId)
        if (itemIndex < 0) {
          continue
        }

        const [removed] = group.items.splice(itemIndex, 1)
        isDraftItem = removed?.isDraft === true
        break
      }
    }

    recalculateItemIndices(columns)
    this.clearItemCommentsCache(itemId)

    if (isDraftItem) {
      return
    }

    void httpClient.delete(`/retro/items/${itemId}`)
  },
}
