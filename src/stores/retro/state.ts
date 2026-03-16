import type { TRetroBoardState } from './types'

export const createRetroState = (): TRetroBoardState => ({
  isBoardLoading: false,
  boardLoadingSkeletonCount: 3,
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
  commentsByItemId: {},
  commentItemIdByCommentId: {},
  lastSyncedPositions: {},
  board: [],
})
