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
  name: string
  teamId?: number | null
  date?: string
  description?: string
  isAllCardsHidden?: boolean
  columns?: unknown
}

export type WsColumn = {
  id: number
  name?: string
  description?: string
  color?: unknown
  items?: unknown
}

export type BoardColumnsReorderedEventPayload = {
  boardId: number
  columns: WsColumn[]
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
  BOARD_RENAMED: 'board.renamed',
  BOARD_COLUMNS_REORDERED: 'board.columns.reordered',
} as const

export type WsDomainEventName = (typeof WS_DOMAIN_EVENT_NAMES)[keyof typeof WS_DOMAIN_EVENT_NAMES]

export interface ServerToClientEvents {
  message: (payload: string) => void
  [WS_SERVER_EVENT_NAMES.BOARD_RENAMED]: (payload: WsBoard) => void
  [WS_SERVER_EVENT_NAMES.BOARD_COLUMNS_REORDERED]: (payload: BoardColumnsReorderedEventPayload) => void
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
