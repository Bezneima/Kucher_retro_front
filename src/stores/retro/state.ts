import type { TRetroBoardState } from './types'

export const createRetroState = (): TRetroBoardState => ({
  isBoardLoading: false,
  activeItemId: null,
  lastSyncedPositions: {},
  board: [],
})
