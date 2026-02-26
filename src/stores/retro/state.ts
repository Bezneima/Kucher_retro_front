import type { TRetroBoardState } from './types'

export const createRetroState = (): TRetroBoardState => ({
  isBoardLoading: false,
  isColumnsReorderPending: false,
  columnsReorderError: '',
  activeItemId: null,
  cardSearchQuery: '',
  currentUser: {
    id: null,
    email: null,
    name: null,
  },
  currentUserTeamRole: null,
  lastSyncedPositions: {},
  board: [],
})
