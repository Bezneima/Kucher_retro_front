import type { Socket } from 'socket.io-client'
import {
  WS_SERVER_EVENT_NAMES,
  type BoardColumnsReorderedEventPayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type SyncPositionsPayload,
  type TeamAllCardsVisibilityUpdatedPayload,
  type WsBoard,
  type WsColumn,
  type WsComment,
  type WsDeletedPayload,
  type WsItem,
  type WsItemCommentDeletedPayload,
  type WsItemCommentsFetchedPayload,
} from './ws.types'

export type RetroSocketHandlers = {
  onBoardRenamed: (payload: WsBoard) => void
  onBoardColumnsReordered: (payload: BoardColumnsReorderedEventPayload) => void
  onBoardItemsPositionsSynced: (payload: SyncPositionsPayload) => void
  onColumnCreated: (payload: WsColumn & { boardId: number }) => void
  onColumnNameUpdated: (payload: WsColumn & { boardId: number }) => void
  onColumnColorUpdated: (payload: WsColumn & { boardId: number }) => void
  onColumnDescriptionUpdated: (payload: WsColumn & { boardId: number }) => void
  onColumnDeleted: (payload: WsDeletedPayload & { boardId: number }) => void
  onItemCreated: (payload: WsItem) => void
  onItemDescriptionUpdated: (payload: WsItem) => void
  onItemLikeToggled: (payload: WsItem) => void
  onItemColorUpdated: (payload: WsItem) => void
  onItemDeleted: (payload: WsDeletedPayload & { boardId: number }) => void
  onItemCommentsFetched: (payload: WsItemCommentsFetchedPayload) => void
  onItemCommentCreated: (payload: WsComment) => void
  onItemCommentUpdated: (payload: WsComment) => void
  onItemCommentDeleted: (payload: WsItemCommentDeletedPayload) => void
  onTeamAllCardsVisibilityUpdated: (payload: TeamAllCardsVisibilityUpdatedPayload) => void
}

export const bindRetroSocketListeners = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  handlers: RetroSocketHandlers,
) => {
  socket.on(WS_SERVER_EVENT_NAMES.BOARD_RENAMED, handlers.onBoardRenamed)
  socket.on(WS_SERVER_EVENT_NAMES.BOARD_COLUMNS_REORDERED, handlers.onBoardColumnsReordered)
  socket.on(WS_SERVER_EVENT_NAMES.BOARD_ITEMS_POSITIONS_SYNCED, handlers.onBoardItemsPositionsSynced)
  socket.on(WS_SERVER_EVENT_NAMES.COLUMN_CREATED, handlers.onColumnCreated)
  socket.on(WS_SERVER_EVENT_NAMES.COLUMN_NAME_UPDATED, handlers.onColumnNameUpdated)
  socket.on(WS_SERVER_EVENT_NAMES.COLUMN_COLOR_UPDATED, handlers.onColumnColorUpdated)
  socket.on(WS_SERVER_EVENT_NAMES.COLUMN_DESCRIPTION_UPDATED, handlers.onColumnDescriptionUpdated)
  socket.on(WS_SERVER_EVENT_NAMES.COLUMN_DELETED, handlers.onColumnDeleted)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_CREATED, handlers.onItemCreated)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_DESCRIPTION_UPDATED, handlers.onItemDescriptionUpdated)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_LIKE_TOGGLED, handlers.onItemLikeToggled)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_COLOR_UPDATED, handlers.onItemColorUpdated)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_DELETED, handlers.onItemDeleted)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_COMMENTS_FETCHED, handlers.onItemCommentsFetched)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_COMMENT_CREATED, handlers.onItemCommentCreated)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_COMMENT_UPDATED, handlers.onItemCommentUpdated)
  socket.on(WS_SERVER_EVENT_NAMES.ITEM_COMMENT_DELETED, handlers.onItemCommentDeleted)
  socket.on(
    WS_SERVER_EVENT_NAMES.TEAM_ALL_CARDS_VISIBILITY_UPDATED,
    handlers.onTeamAllCardsVisibilityUpdated,
  )

  return () => {
    socket.off(WS_SERVER_EVENT_NAMES.BOARD_RENAMED, handlers.onBoardRenamed)
    socket.off(WS_SERVER_EVENT_NAMES.BOARD_COLUMNS_REORDERED, handlers.onBoardColumnsReordered)
    socket.off(
      WS_SERVER_EVENT_NAMES.BOARD_ITEMS_POSITIONS_SYNCED,
      handlers.onBoardItemsPositionsSynced,
    )
    socket.off(WS_SERVER_EVENT_NAMES.COLUMN_CREATED, handlers.onColumnCreated)
    socket.off(WS_SERVER_EVENT_NAMES.COLUMN_NAME_UPDATED, handlers.onColumnNameUpdated)
    socket.off(WS_SERVER_EVENT_NAMES.COLUMN_COLOR_UPDATED, handlers.onColumnColorUpdated)
    socket.off(
      WS_SERVER_EVENT_NAMES.COLUMN_DESCRIPTION_UPDATED,
      handlers.onColumnDescriptionUpdated,
    )
    socket.off(WS_SERVER_EVENT_NAMES.COLUMN_DELETED, handlers.onColumnDeleted)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_CREATED, handlers.onItemCreated)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_DESCRIPTION_UPDATED, handlers.onItemDescriptionUpdated)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_LIKE_TOGGLED, handlers.onItemLikeToggled)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_COLOR_UPDATED, handlers.onItemColorUpdated)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_DELETED, handlers.onItemDeleted)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_COMMENTS_FETCHED, handlers.onItemCommentsFetched)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_COMMENT_CREATED, handlers.onItemCommentCreated)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_COMMENT_UPDATED, handlers.onItemCommentUpdated)
    socket.off(WS_SERVER_EVENT_NAMES.ITEM_COMMENT_DELETED, handlers.onItemCommentDeleted)
    socket.off(
      WS_SERVER_EVENT_NAMES.TEAM_ALL_CARDS_VISIBILITY_UPDATED,
      handlers.onTeamAllCardsVisibilityUpdated,
    )
  }
}
