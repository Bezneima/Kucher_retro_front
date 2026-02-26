import type { TRetroBoardState } from './types'

export const retroGetters = {
  getBoard: (state: TRetroBoardState) => state.board,
  getBoardColumns: (state: TRetroBoardState) => state.board[0]?.columns ?? [],
  getCurrentBoardTeamId: (state: TRetroBoardState) => state.board[0]?.teamId ?? null,
  getIsAllCardsHidden: (state: TRetroBoardState) => state.board[0]?.isAllCardsHidden ?? false,
  getCardUiState:
    (state: TRetroBoardState) => (_itemId: number, isEditing: boolean, draftText: string) => {
      const isHidden = state.board[0]?.isAllCardsHidden ?? false
      const canStartEditing = !isHidden
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
  getIsBoardLoading: (state: TRetroBoardState) => state.isBoardLoading,
  getCurrentUser: (state: TRetroBoardState) => state.currentUser,
  getCurrentUserId: (state: TRetroBoardState) => state.currentUser.id ?? '',
  getCurrentUserEmail: (state: TRetroBoardState) => state.currentUser.email ?? '',
  getCurrentUserName: (state: TRetroBoardState) =>
    state.currentUser.name ?? state.currentUser.email ?? '',
  getCurrentUserTeamRole: (state: TRetroBoardState) => state.currentUserTeamRole,
}
