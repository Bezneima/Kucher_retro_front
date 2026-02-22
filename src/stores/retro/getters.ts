import type { TRetroBoardState } from './types'

export const retroGetters = {
  getBoard: (state: TRetroBoardState) => state.board,
  getBoardColumns: (state: TRetroBoardState) => state.board[0]?.columns ?? [],
  getCardSearchQuery: (state: TRetroBoardState) => state.cardSearchQuery,
  getHasCardSearchQuery: (state: TRetroBoardState) => Boolean(state.cardSearchQuery.trim()),
  getFilteredColumnItems: (state: TRetroBoardState) => (columnId: number) => {
    const column = state.board[0]?.columns?.find((item) => item.id === columnId)
    if (!column) return []

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
