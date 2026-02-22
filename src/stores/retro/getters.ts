import type { TRetroBoardState } from './types'

export const retroGetters = {
  getBoard: (state: TRetroBoardState) => state.board,
  getBoardColumns: (state: TRetroBoardState) => state.board[0]?.columns ?? [],
  getIsBoardLoading: (state: TRetroBoardState) => state.isBoardLoading,
  getCurrentUser: (state: TRetroBoardState) => state.currentUser,
  getCurrentUserId: (state: TRetroBoardState) => state.currentUser.id ?? '',
  getCurrentUserEmail: (state: TRetroBoardState) => state.currentUser.email ?? '',
  getCurrentUserName: (state: TRetroBoardState) =>
    state.currentUser.name ?? state.currentUser.email ?? '',
  getCurrentUserTeamRole: (state: TRetroBoardState) => state.currentUserTeamRole,
}
