import type { TRetroBoardState } from './types'

export const createRetroState = (): TRetroBoardState => ({
  isBoardLoading: false,
  activeItemId: null,
  currentUser: {
    id: null,
    email: null,
    name: null,
  },
  currentUserTeamRole: null,
  lastSyncedPositions: {},
  board: [],
})
