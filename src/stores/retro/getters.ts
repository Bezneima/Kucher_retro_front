import { getOrCreateAnonymousId } from '@/auth/anonymousIdentity'
import { getAccessToken } from '@/auth/session'
import type { TRetroBoardState } from './types'

const getFallbackViewerId = () => {
  const accessToken = getAccessToken()
  if (typeof accessToken === 'string' && accessToken.trim()) {
    return ''
  }

  return getOrCreateAnonymousId()
}

const getDefaultLikesVisibility = () => {
  return true
}

const getDefaultCommentsVisibility = () => {
  return true
}

const getDefaultCardsEditability = () => {
  return true
}

export const retroGetters = {
  getBoard: (state: TRetroBoardState) => state.board,
  getBoardColumns: (state: TRetroBoardState) => state.board[0]?.columns ?? [],
  getCurrentBoardId: (state: TRetroBoardState) => state.board[0]?.id ?? null,
  getBoardLoadingSkeletonCount: (state: TRetroBoardState) => state.boardLoadingSkeletonCount,
  getIsColumnsReorderPending: (state: TRetroBoardState) => state.isColumnsReorderPending,
  getColumnsReorderError: (state: TRetroBoardState) => state.columnsReorderError,
  getCurrentBoardTeamId: (state: TRetroBoardState) => state.board[0]?.teamId ?? null,
  getIsAllCardsHidden: (state: TRetroBoardState) => state.board[0]?.isAllCardsHidden ?? false,
  getCurrentBoardSettings: (state: TRetroBoardState) =>
    state.board[0]?.settings ?? {
      showLikes: getDefaultLikesVisibility(),
      showComments: getDefaultCommentsVisibility(),
      canEditCards: getDefaultCardsEditability(),
    },
  getIsBoardLikesVisible: (state: TRetroBoardState) =>
    state.board[0]?.settings?.showLikes ?? getDefaultLikesVisibility(),
  getIsBoardCommentsVisible: (state: TRetroBoardState) =>
    state.board[0]?.settings?.showComments ?? getDefaultCommentsVisibility(),
  getCanEditBoardCards: (state: TRetroBoardState) =>
    state.board[0]?.settings?.canEditCards ?? getDefaultCardsEditability(),
  getCardUiState:
    (state: TRetroBoardState) => (_itemId: number, isEditing: boolean, draftText: string) => {
      const isHidden = state.board[0]?.isAllCardsHidden ?? false
      const canEditCards = state.board[0]?.settings?.canEditCards ?? getDefaultCardsEditability()
      const canStartEditing = !isHidden && canEditCards
      const canCopyText = !isHidden

      return {
        isHidden,
        showPreview: !isEditing || isHidden,
        showEditor: isEditing && !isHidden,
        showFooterMeta: !isEditing || isHidden,
        isFooterEdited: isEditing && !isHidden,
        previewText: isHidden ? 'Содержимое скрыто' : draftText || ' ',
        canStartEditing,
        canCopyText,
      }
    },
  getCardSearchQuery: (state: TRetroBoardState) => state.cardSearchQuery,
  getHasCardSearchQuery: (state: TRetroBoardState) => Boolean(state.cardSearchQuery.trim()),
  getFilteredColumnItems: (state: TRetroBoardState) => (columnId: number) => {
    const column = state.board[0]?.columns?.find((item) => item.id === columnId)
    if (!column) return []

    if (state.board[0]?.isAllCardsHidden) {
      return column.items
    }

    const normalizedQuery = state.cardSearchQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery) return column.items

    return column.items.filter((item) =>
      item.description.toLocaleLowerCase().includes(normalizedQuery),
    )
  },
  getFilteredColumnEntries: (state: TRetroBoardState) => (columnId: number) => {
    const column = state.board[0]?.columns?.find((entry) => entry.id === columnId)
    if (!column) return []

    const normalizedQuery = state.cardSearchQuery.trim().toLocaleLowerCase()
    if (!normalizedQuery || state.board[0]?.isAllCardsHidden) {
      return column.entries
    }

    return column.entries
      .map((entry) => {
        if (entry.type === 'ITEM') {
          if (!entry.item.description.toLocaleLowerCase().includes(normalizedQuery)) {
            return null
          }

          return entry
        }

        const filteredItems = entry.group.items.filter((item) =>
          item.description.toLocaleLowerCase().includes(normalizedQuery),
        )
        if (filteredItems.length === 0) {
          return null
        }

        return {
          ...entry,
          group: {
            ...entry.group,
            items: filteredItems,
          },
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  },
  getIsBoardLoading: (state: TRetroBoardState) => state.isBoardLoading,
  getCurrentUser: (state: TRetroBoardState) => state.currentUser,
  getCurrentUserId: (state: TRetroBoardState) => state.currentUser.id ?? getFallbackViewerId(),
  getCurrentUserEmail: (state: TRetroBoardState) => state.currentUser.email ?? '',
  getCurrentUserName: (state: TRetroBoardState) =>
    state.currentUser.name ?? state.currentUser.email ?? '',
  getCurrentUserTeamRole: (state: TRetroBoardState) => state.currentUserTeamRole,
  getItemComments: (state: TRetroBoardState) => (itemId: number) => {
    return state.commentsByItemId[itemId] ?? []
  },
  hasItemCommentsCache: (state: TRetroBoardState) => (itemId: number) => {
    return Number.isInteger(itemId) && itemId > 0 && Object.prototype.hasOwnProperty.call(state.commentsByItemId, itemId)
  },
}
