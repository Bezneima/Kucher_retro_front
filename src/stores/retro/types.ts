import type { RetroItemCommentResponseDto } from '@/api/services/retroCommentsService'

export type ColumnColor = {
  columnColor: string
  itemColor: string
  buttonColor: string
}

export type RetroItem = {
  id: number
  description: string
  createdAt: string
  likes: string[]
  color?: string
  columnIndex: number
  rowIndex: number
  groupId?: number | null
  commentsCount: number
  syncedDescription?: string
  isDraft?: boolean
}

export type RetroGroup = {
  id: number
  columnId: number
  name: string
  description: string
  color: ColumnColor
  orderIndex: number
  isNameEditing: boolean
  items: RetroItem[]
  isDraft?: boolean
}

export type RetroColumnEntry =
  | {
      type: 'ITEM'
      orderIndex: number
      item: RetroItem
      group?: undefined
    }
  | {
      type: 'GROUP'
      orderIndex: number
      group: RetroGroup
      item?: undefined
    }

export type RetroColumn = {
  id: number
  name: string
  description: string
  color: ColumnColor
  isNameEditing: boolean
  items: RetroItem[]
  groups: RetroGroup[]
  entries: RetroColumnEntry[]
  isDraft?: boolean
}

export type SyncPositionsResult = {
  boardId: number
  updated: number
  changedColumnIds: number[]
  columns: RetroColumn[]
}

export type TRetroColumnItem = RetroItem
export type TRetroColumnColor = ColumnColor
export type TRetroGroup = RetroGroup
export type TRetroColumnEntry = RetroColumnEntry
export type TRetroColumn = RetroColumn

export type TRetroBoard = {
  id: number
  teamId: number | null
  name: string
  date: string
  description: string
  isAllCardsHidden: boolean
  columns: TRetroColumn[]
}

export type TRetroCurrentUser = {
  id: string | null
  email: string | null
  name: string | null
}

export type TRetroUserBoardRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export type TItemPositionChange = {
  item: TRetroColumnItem
  oldColumnId: number
  oldGroupId: number | null
  oldRowIndex: number
  newColumnId: number
  newGroupId: number | null
  newRowIndex: number
}

export type TItemPositionPayloadChange = {
  itemId: number
  newColumnId: number
  newGroupId?: number | null
  newRowIndex: number
}

export type TGroupPositionPayloadChange = {
  groupId: number
  newColumnId: number
  newOrderIndex: number
}

export type TRetroBoardState = {
  board: TRetroBoard[]
  isBoardLoading: boolean
  isColumnsReorderPending: boolean
  columnsReorderError: string
  activeItemId: number | null
  cardSearchQuery: string
  currentUser: TRetroCurrentUser
  currentUserTeamRole: TRetroUserBoardRole | null
  commentsByItemId: Record<number, RetroItemCommentResponseDto[]>
  commentItemIdByCommentId: Record<number, number>
  lastSyncedPositions: Record<number, { columnId: number; groupId: number | null; rowIndex: number }>
}
