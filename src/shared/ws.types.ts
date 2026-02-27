export type WsConnectionStatus = 'idle' | 'connecting' | 'connected' | 'unauthorized' | 'error'

export type WsDisconnectReason = 'offline' | 'page_unload' | 'manual' | 'unauthorized'

export type PresenceDisconnectPayload = {
  reason: WsDisconnectReason
  at: string
}

export type BoardRenamePayload = {
  boardId: number
  name: string
}

export type BoardColumnsReorderPayload = {
  boardId: number
  oldIndex: number
  newIndex: number
}

export type BoardJoinPayload = {
  boardId: number
}

export type BoardJoinAck = {
  joined: true
  boardId: number
}

export type WsBoard = {
  id: number
  name?: string
  boardId?: number
  teamId?: number | null
  date?: string
  description?: string
  isAllCardsHidden?: boolean
  updatedAt?: string
  columns?: unknown
}

export type WsColumn = {
  id: number
  boardId?: number
  columnIndex?: number
  index?: number
  name?: string
  description?: string
  color?: unknown
  items?: unknown
}

export type BoardColumnsReorderedEventPayload = {
  boardId: number
  columns: WsColumn[]
}

export type RetroItemResponseDto = {
  id: number
  description: string
  createdAt?: string
  likes: string[]
  color?: string
  columnIndex?: number
  rowIndex?: number
  commentsCount?: number
}

export type RetroColumnResponseDto = {
  id: number
  name: string
  description: string
  color?: unknown
  isNameEditing?: boolean
  items: RetroItemResponseDto[]
}

export type SyncPositionsPayload = {
  boardId: number
  updated: number
  changedColumnIds: number[]
  columns: RetroColumnResponseDto[]
}

export type WsItem = {
  id: number
  boardId: number
  columnId?: number
  columnIndex?: number
  rowIndex?: number
  description?: string
  createdAt?: string
  likes?: unknown
  commentsCount?: number
  color?: string
}

export type WsCommentCreator = {
  id: string
  email: string
  name: string | null
}

export type WsComment = {
  id: number
  boardId: number
  itemId: number
  text: string
  createdAt: string
  creator: WsCommentCreator
}

export type WsDeletedPayload = {
  deleted: boolean
}

export type WsItemCommentsFetchedPayload =
  | {
      boardId: number
      itemId?: number
      comments: WsComment[]
    }
  | WsComment[]

export type WsItemCommentDeletedPayload = WsDeletedPayload & {
  boardId: number
  itemId?: number
  commentId?: number
  id?: number
  commentsCount?: number
}

export type TeamAllCardsVisibilityUpdatedPayload = {
  id: number
  isAllCardsHidden: boolean
  updatedAt: string
}

/**
 * Foundation for future realtime migration of board/column/item actions.
 * The server currently guarantees only the built-in "message" event.
 */
export const WS_DOMAIN_EVENT_NAMES = {
  BOARD_UPDATED: 'board.updated',
  COLUMN_UPDATED: 'column.updated',
  ITEM_UPDATED: 'item.updated',
  ITEM_REORDERED: 'item.reordered',
} as const

export const WS_CLIENT_EVENT_NAMES = {
  PRESENCE_DISCONNECTING: 'presence:disconnecting',
  BOARD_JOIN: 'board.join',
  BOARD_RENAME: 'board.rename',
  BOARD_COLUMNS_REORDER: 'board.columns.reorder',
} as const

export const WS_SERVER_EVENT_NAMES = {
  BOARD_RENAMED: 'retro.board.renamed',
  BOARD_COLUMNS_REORDERED: 'retro.board.columns.reordered',
  BOARD_ITEMS_POSITIONS_SYNCED: 'retro.board.items.positions.synced',
  COLUMN_CREATED: 'retro.column.created',
  COLUMN_NAME_UPDATED: 'retro.column.name.updated',
  COLUMN_COLOR_UPDATED: 'retro.column.color.updated',
  COLUMN_DESCRIPTION_UPDATED: 'retro.column.description.updated',
  COLUMN_DELETED: 'retro.column.deleted',
  ITEM_CREATED: 'retro.item.created',
  ITEM_DESCRIPTION_UPDATED: 'retro.item.description.updated',
  ITEM_LIKE_TOGGLED: 'retro.item.like.toggled',
  ITEM_COLOR_UPDATED: 'retro.item.color.updated',
  ITEM_DELETED: 'retro.item.deleted',
  ITEM_COMMENTS_FETCHED: 'retro.item.comments.fetched',
  ITEM_COMMENT_CREATED: 'retro.item.comment.created',
  ITEM_COMMENT_UPDATED: 'retro.item.comment.updated',
  ITEM_COMMENT_DELETED: 'retro.item.comment.deleted',
  TEAM_ALL_CARDS_VISIBILITY_UPDATED: 'team.all-cards-visibility.updated',
} as const

export type WsDomainEventName = (typeof WS_DOMAIN_EVENT_NAMES)[keyof typeof WS_DOMAIN_EVENT_NAMES]
export type RetroSocketEventName = (typeof WS_SERVER_EVENT_NAMES)[keyof typeof WS_SERVER_EVENT_NAMES]

export interface ServerToClientEvents {
  message: (payload: string) => void
  [WS_SERVER_EVENT_NAMES.BOARD_RENAMED]: (payload: WsBoard) => void
  [WS_SERVER_EVENT_NAMES.BOARD_COLUMNS_REORDERED]: (payload: BoardColumnsReorderedEventPayload) => void
  [WS_SERVER_EVENT_NAMES.BOARD_ITEMS_POSITIONS_SYNCED]: (payload: SyncPositionsPayload) => void
  [WS_SERVER_EVENT_NAMES.COLUMN_CREATED]: (payload: WsColumn & { boardId: number }) => void
  [WS_SERVER_EVENT_NAMES.COLUMN_NAME_UPDATED]: (payload: WsColumn & { boardId: number }) => void
  [WS_SERVER_EVENT_NAMES.COLUMN_COLOR_UPDATED]: (payload: WsColumn & { boardId: number }) => void
  [WS_SERVER_EVENT_NAMES.COLUMN_DESCRIPTION_UPDATED]: (payload: WsColumn & { boardId: number }) => void
  [WS_SERVER_EVENT_NAMES.COLUMN_DELETED]: (payload: WsDeletedPayload & { boardId: number }) => void
  [WS_SERVER_EVENT_NAMES.ITEM_CREATED]: (payload: WsItem) => void
  [WS_SERVER_EVENT_NAMES.ITEM_DESCRIPTION_UPDATED]: (payload: WsItem) => void
  [WS_SERVER_EVENT_NAMES.ITEM_LIKE_TOGGLED]: (payload: WsItem) => void
  [WS_SERVER_EVENT_NAMES.ITEM_COLOR_UPDATED]: (payload: WsItem) => void
  [WS_SERVER_EVENT_NAMES.ITEM_DELETED]: (payload: WsDeletedPayload & { boardId: number }) => void
  [WS_SERVER_EVENT_NAMES.ITEM_COMMENTS_FETCHED]: (payload: WsItemCommentsFetchedPayload) => void
  [WS_SERVER_EVENT_NAMES.ITEM_COMMENT_CREATED]: (payload: WsComment) => void
  [WS_SERVER_EVENT_NAMES.ITEM_COMMENT_UPDATED]: (payload: WsComment) => void
  [WS_SERVER_EVENT_NAMES.ITEM_COMMENT_DELETED]: (payload: WsItemCommentDeletedPayload) => void
  [WS_SERVER_EVENT_NAMES.TEAM_ALL_CARDS_VISIBILITY_UPDATED]: (
    payload: TeamAllCardsVisibilityUpdatedPayload,
  ) => void
}

export interface ClientToServerEvents {
  [WS_CLIENT_EVENT_NAMES.PRESENCE_DISCONNECTING]: (payload: PresenceDisconnectPayload) => void
  [WS_CLIENT_EVENT_NAMES.BOARD_JOIN]: (
    payload: BoardJoinPayload,
    ack: (...args: unknown[]) => void,
  ) => void
  [WS_CLIENT_EVENT_NAMES.BOARD_RENAME]: (
    payload: BoardRenamePayload,
    ack: (...args: unknown[]) => void,
  ) => void
  [WS_CLIENT_EVENT_NAMES.BOARD_COLUMNS_REORDER]: (
    payload: BoardColumnsReorderPayload,
    ack: (...args: unknown[]) => void,
  ) => void
  // TODO: add board/column/item command events when moving mutations to websocket.
}
