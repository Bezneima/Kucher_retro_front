import type { TRetroBoardState } from './types'

export const retroGetters = {
  getBoard: (state: TRetroBoardState) => state.board,
  getBoardColumns: (state: TRetroBoardState) => state.board[0]?.columns ?? [],
  getIsBoardLoading: (state: TRetroBoardState) => state.isBoardLoading,
}
