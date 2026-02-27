import { retroCommentsService, type RetroItemCommentResponseDto } from '@/api/services/retroCommentsService'
import {
  type BoardColumnsReorderedEventPayload,
  type RetroColumnResponseDto,
  type RetroItemResponseDto,
  type SyncPositionsPayload,
  type TeamAllCardsVisibilityUpdatedPayload,
  type WsBoard,
  type WsColumn,
  type WsComment,
  type WsDeletedPayload,
  type WsItem,
  type WsItemCommentDeletedPayload,
  type WsItemCommentsFetchedPayload,
} from '@/shared/ws.types'
import { availableColors, goodCardColors } from '../constants'
import { normalizeColumns } from '../helpers/normalize'
import { recalculateItemIndices } from '../helpers/positions'
import { reorderColumnsByPayloadIds } from '../helpers/reorderColumns'
import type {
  TRetroBoard,
  TRetroBoardState,
  TRetroColumn,
  TRetroColumnColor,
  TRetroColumnItem,
} from '../types'

type TRecord = Record<string, unknown>

type TRealtimeActionsContext = TRetroBoardState & {
  loadBoardColumns: (boardId: number) => Promise<void>
  setBoardCardsHidden: (isAllCardsHidden: boolean) => void
  setItemCommentsCount: (itemId: number, commentsCount: number) => void
  setLastSyncedPositions: () => void
  refetchItemComments: (itemId: number) => Promise<RetroItemCommentResponseDto[]>
  refetchActiveItemComments: () => Promise<RetroItemCommentResponseDto[]>
  setCommentsCache: (itemId: number, comments: RetroItemCommentResponseDto[]) => void
  mergeCommentCache: (comment: RetroItemCommentResponseDto) => void
  clearItemCommentsCache: (itemId: number) => void
  removeCommentFromCache: (commentId: number, itemId?: number) => void
}

const isRecord = (value: unknown): value is TRecord => {
  return typeof value === 'object' && value !== null
}

const asPositiveNumber = (value: unknown): number | null => {
  const normalized = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null
  }

  return normalized
}

const asNonNegativeNumber = (value: unknown): number | null => {
  const normalized = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(normalized) || normalized < 0) {
    return null
  }

  return normalized
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  return value
}

const asTrimmedString = (value: unknown): string | null => {
  const normalized = asString(value)?.trim()
  return normalized || null
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

const toComment = (value: unknown): RetroItemCommentResponseDto | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asPositiveNumber(value.id)
  const itemId = asPositiveNumber(value.itemId)
  const text = asString(value.text)
  const createdAt = asTrimmedString(value.createdAt)
  const creator = isRecord(value.creator) ? value.creator : null
  const creatorId = creator ? asTrimmedString(creator.id) : null
  const creatorEmail = creator ? asTrimmedString(creator.email) : null

  if (!id || !itemId || !text || !createdAt || !creatorId || !creatorEmail) {
    return null
  }

  return {
    id,
    itemId,
    text,
    createdAt,
    creator: {
      id: creatorId,
      email: creatorEmail,
      name: asTrimmedString(creator?.name),
    },
  }
}

const getCurrentBoard = (state: TRealtimeActionsContext): TRetroBoard | null => {
  return state.board[0] ?? null
}

const isCurrentBoardEvent = (state: TRealtimeActionsContext, boardId: number | null) => {
  if (!boardId) {
    return false
  }

  return state.board[0]?.id === boardId
}

const findColumnById = (columns: TRetroColumn[], columnId: number) => {
  return columns.find((column) => column.id === columnId) ?? null
}

const findColumnByIndex = (columns: TRetroColumn[], columnIndex: number | null) => {
  if (columnIndex == null || columnIndex < 0 || columnIndex >= columns.length) {
    return null
  }

  return columns[columnIndex] ?? null
}

const findItemLocationById = (columns: TRetroColumn[], itemId: number) => {
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex]
    if (!column) continue

    const itemIndex = column.items.findIndex((item) => item.id === itemId)
    if (itemIndex < 0) continue

    const item = column.items[itemIndex]
    if (!item) continue

    return {
      column,
      columnIndex,
      item,
      itemIndex,
    }
  }

  return null
}

const buildFallbackColumnColor = (columnIndex: number): TRetroColumnColor => {
  const fallback = availableColors[columnIndex % availableColors.length]
  if (fallback) {
    return { ...fallback }
  }

  const legacy = goodCardColors[columnIndex % goodCardColors.length] ?? '#f0f0f0'
  return {
    columnColor: legacy,
    itemColor: legacy,
    buttonColor: legacy,
  }
}

const normalizeColumnColorPayload = (
  payload: unknown,
  fallback: TRetroColumnColor,
): TRetroColumnColor => {
  if (typeof payload === 'string') {
    const normalized = payload.trim()
    if (!normalized) return fallback

    return {
      columnColor: normalized,
      itemColor: normalized,
      buttonColor: normalized,
    }
  }

  if (!isRecord(payload)) {
    return fallback
  }

  const columnColor =
    typeof payload.columnColor === 'string' && payload.columnColor.trim()
      ? payload.columnColor
      : fallback.columnColor
  const itemColor =
    typeof payload.itemColor === 'string' && payload.itemColor.trim()
      ? payload.itemColor
      : columnColor
  const buttonColor =
    typeof payload.buttonColor === 'string' && payload.buttonColor.trim()
      ? payload.buttonColor
      : columnColor

  return {
    columnColor,
    itemColor,
    buttonColor,
  }
}

const normalizeNewColumn = (payload: WsColumn, fallbackIndex: number): TRetroColumn | null => {
  const normalized = normalizeColumns([{ ...payload }])[0]
  if (!normalized) {
    return null
  }

  const columnId = asPositiveNumber(payload.id)
  if (!columnId) {
    return null
  }

  normalized.id = columnId
  if (typeof payload.name === 'string' && payload.name.trim()) {
    normalized.name = payload.name
  }
  if (typeof payload.description === 'string') {
    normalized.description = payload.description
  }
  normalized.color = normalizeColumnColorPayload(payload.color, buildFallbackColumnColor(fallbackIndex))
  normalized.isDraft = false
  normalized.items = []

  return normalized
}

const applyColumnFieldMerge = (
  column: TRetroColumn,
  payload: WsColumn,
  fields: { name?: boolean; description?: boolean; color?: boolean },
) => {
  if (fields.name && typeof payload.name === 'string' && payload.name.trim()) {
    column.name = payload.name
  }
  if (fields.description && typeof payload.description === 'string') {
    column.description = payload.description
  }
  if (fields.color && 'color' in payload) {
    column.color = normalizeColumnColorPayload(payload.color, column.color)
  }
}

const findDraftColumnMatchIndex = (
  columns: TRetroColumn[],
  payload: WsColumn,
  targetIndex: number | null,
): number => {
  if (targetIndex != null) {
    const columnAtTarget = columns[targetIndex]
    if (columnAtTarget?.isDraft) {
      return targetIndex
    }
  }

  const payloadName = asTrimmedString(payload.name)
  if (payloadName) {
    const byName = columns.findIndex(
      (column) => column.isDraft && column.name.trim() === payloadName,
    )
    if (byName >= 0) {
      return byName
    }
  }

  return -1
}

const resolveItemTargetColumn = (columns: TRetroColumn[], payload: WsItem): TRetroColumn | null => {
  const columnId = asPositiveNumber(payload.columnId)
  if (columnId) {
    const byId = findColumnById(columns, columnId)
    if (byId) return byId
  }

  const columnIndex = asNonNegativeNumber(payload.columnIndex)
  if (columnIndex != null) {
    return findColumnByIndex(columns, columnIndex)
  }

  return null
}

const mergeItemPayload = (targetItem: TRetroColumnItem, payload: WsItem) => {
  if (typeof payload.description === 'string') {
    targetItem.description = payload.description
    targetItem.syncedDescription = payload.description
  }

  if (typeof payload.createdAt === 'string' && payload.createdAt.trim()) {
    targetItem.createdAt = payload.createdAt
  }

  if (Array.isArray(payload.likes)) {
    targetItem.likes = asStringArray(payload.likes)
  }

  const commentsCount = asNonNegativeNumber(payload.commentsCount)
  if (commentsCount != null) {
    targetItem.commentsCount = commentsCount
  }

  if ('color' in payload) {
    targetItem.color = typeof payload.color === 'string' ? payload.color : undefined
  }

  const columnIndex = asNonNegativeNumber(payload.columnIndex)
  if (columnIndex != null) {
    targetItem.columnIndex = columnIndex
  }

  const rowIndex = asNonNegativeNumber(payload.rowIndex)
  if (rowIndex != null) {
    targetItem.rowIndex = rowIndex
  }
}

const normalizeSyncItem = (
  payload: RetroItemResponseDto,
  fallbackColumnIndex: number,
  fallbackRowIndex: number,
): TRetroColumnItem | null => {
  const itemId = asPositiveNumber(payload.id)
  if (!itemId) {
    return null
  }

  const rowIndex = asNonNegativeNumber(payload.rowIndex) ?? fallbackRowIndex
  const columnIndex = asNonNegativeNumber(payload.columnIndex) ?? fallbackColumnIndex
  const commentsCount = asNonNegativeNumber(payload.commentsCount) ?? 0

  return {
    id: itemId,
    description: asString(payload.description) ?? '',
    createdAt: asTrimmedString(payload.createdAt) ?? undefined,
    syncedDescription: asString(payload.description) ?? '',
    likes: asStringArray(payload.likes),
    commentsCount,
    color: typeof payload.color === 'string' ? payload.color : undefined,
    isDraft: false,
    columnIndex,
    rowIndex,
  }
}

const normalizeSyncColumn = (
  payload: RetroColumnResponseDto,
  existingColumn: TRetroColumn,
  fallbackColumnIndex: number,
): TRetroColumn | null => {
  const columnId = asPositiveNumber(payload.id)
  if (!columnId) {
    return null
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : []
  const items = rawItems
    .map((item, rowIndex) => normalizeSyncItem(item, fallbackColumnIndex, rowIndex))
    .filter((item): item is TRetroColumnItem => Boolean(item))
    .sort((a, b) => a.rowIndex - b.rowIndex)

  return {
    id: columnId,
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name : existingColumn.name,
    description:
      typeof payload.description === 'string' ? payload.description : existingColumn.description,
    color: normalizeColumnColorPayload(payload.color, existingColumn.color),
    isNameEditing:
      typeof payload.isNameEditing === 'boolean' ? payload.isNameEditing : existingColumn.isNameEditing,
    items,
  }
}

const toPositiveNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => asPositiveNumber(entry))
    .filter((entry): entry is number => entry !== null)
}

const isSameNumberArray = (left: number[], right: number[]) => {
  if (left.length !== right.length) {
    return false
  }

  return left.every((value, index) => value === right[index])
}

const normalizeNewItem = (payload: WsItem, fallbackColumnIndex: number): TRetroColumnItem | null => {
  const itemId = asPositiveNumber(payload.id)
  if (!itemId) {
    return null
  }

  const rowIndex = asNonNegativeNumber(payload.rowIndex) ?? 0
  const columnIndex = asNonNegativeNumber(payload.columnIndex) ?? fallbackColumnIndex

  return {
    id: itemId,
    description: asString(payload.description) ?? '',
    createdAt: asTrimmedString(payload.createdAt) ?? undefined,
    syncedDescription: asString(payload.description) ?? '',
    likes: asStringArray(payload.likes),
    commentsCount:
      Number.isInteger(payload.commentsCount) && (payload.commentsCount ?? 0) >= 0
        ? payload.commentsCount ?? 0
        : 0,
    color: typeof payload.color === 'string' ? payload.color : undefined,
    isDraft: false,
    columnIndex,
    rowIndex,
  }
}

const patchBoardReference = (state: TRealtimeActionsContext) => {
  const currentBoard = state.board[0]
  if (!currentBoard) {
    return
  }

  state.board = [{ ...currentBoard }]
}

const bumpItemCommentsCount = (state: TRealtimeActionsContext, itemId: number, delta: number) => {
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return
  }

  for (const column of state.board[0]?.columns ?? []) {
    const item = column.items.find((entry) => entry.id === itemId)
    if (!item) continue

    item.commentsCount = Math.max(0, item.commentsCount + delta)
    return
  }
}

export const realtimeActions = {
  setCommentsCache(
    this: TRealtimeActionsContext,
    itemId: number,
    comments: RetroItemCommentResponseDto[],
  ) {
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return
    }

    const uniqueById = new Map<number, RetroItemCommentResponseDto>()
    for (const comment of comments) {
      if (!Number.isInteger(comment.id) || comment.id <= 0) continue
      uniqueById.set(comment.id, comment)
    }

    const nextComments = Array.from(uniqueById.values())
    const previousComments = this.commentsByItemId[itemId] ?? []
    const nextMap = { ...this.commentItemIdByCommentId }

    for (const previous of previousComments) {
      delete nextMap[previous.id]
    }
    for (const comment of nextComments) {
      nextMap[comment.id] = itemId
    }

    this.commentsByItemId = {
      ...this.commentsByItemId,
      [itemId]: nextComments,
    }
    this.commentItemIdByCommentId = nextMap
    this.setItemCommentsCount(itemId, nextComments.length)
  },
  mergeCommentCache(this: TRealtimeActionsContext, comment: RetroItemCommentResponseDto) {
    const itemId = asPositiveNumber(comment.itemId)
    if (!itemId) {
      return
    }

    const commentsForItem = this.commentsByItemId[itemId]
    if (!commentsForItem) {
      return
    }

    const existingIndex = commentsForItem.findIndex((entry) => entry.id === comment.id)
    const nextComments = [...commentsForItem]

    if (existingIndex >= 0) {
      const existing = nextComments[existingIndex]
      if (!existing) {
        return
      }
      nextComments[existingIndex] = {
        ...existing,
        ...comment,
      }
    } else {
      nextComments.push(comment)
    }

    this.commentsByItemId = {
      ...this.commentsByItemId,
      [itemId]: nextComments,
    }
    this.commentItemIdByCommentId = {
      ...this.commentItemIdByCommentId,
      [comment.id]: itemId,
    }
    this.setItemCommentsCount(itemId, nextComments.length)
  },
  clearItemCommentsCache(this: TRealtimeActionsContext, itemId: number) {
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return
    }

    const current = this.commentsByItemId[itemId]
    if (!current) {
      return
    }

    const nextByItem = { ...this.commentsByItemId }
    delete nextByItem[itemId]

    const nextMap = { ...this.commentItemIdByCommentId }
    for (const comment of current) {
      delete nextMap[comment.id]
    }

    this.commentsByItemId = nextByItem
    this.commentItemIdByCommentId = nextMap
  },
  removeCommentFromCache(this: TRealtimeActionsContext, commentId: number, itemId?: number) {
    const resolvedCommentId = asPositiveNumber(commentId)
    if (!resolvedCommentId) {
      return
    }

    const resolvedItemId =
      asPositiveNumber(itemId) ?? asPositiveNumber(this.commentItemIdByCommentId[resolvedCommentId])
    if (!resolvedItemId) {
      return
    }

    const comments = this.commentsByItemId[resolvedItemId]
    if (!comments) {
      delete this.commentItemIdByCommentId[resolvedCommentId]
      this.commentItemIdByCommentId = { ...this.commentItemIdByCommentId }
      return
    }

    const nextComments = comments.filter((comment) => comment.id !== resolvedCommentId)
    const nextMap = { ...this.commentItemIdByCommentId }
    delete nextMap[resolvedCommentId]

    this.commentsByItemId = {
      ...this.commentsByItemId,
      [resolvedItemId]: nextComments,
    }
    this.commentItemIdByCommentId = nextMap
    this.setItemCommentsCount(resolvedItemId, nextComments.length)
  },
  async refetchItemComments(this: TRealtimeActionsContext, itemId: number) {
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return []
    }

    const comments = await retroCommentsService.getItemComments(itemId)
    this.setCommentsCache(itemId, comments)
    return comments
  },
  async refetchActiveItemComments(this: TRealtimeActionsContext) {
    const activeItemId = this.activeItemId
    if (!activeItemId) {
      return []
    }

    return this.refetchItemComments(activeItemId)
  },
  applyRealtimeBoardRenamed(this: TRealtimeActionsContext, payload: WsBoard) {
    const board = getCurrentBoard(this)
    const boardId = asPositiveNumber(payload.id ?? payload.boardId)
    if (!board || !boardId || board.id !== boardId) {
      return
    }

    if (typeof payload.name === 'string' && payload.name.trim()) {
      board.name = payload.name
    }
    if ('description' in payload && typeof payload.description === 'string') {
      board.description = payload.description
    }
    if ('date' in payload && typeof payload.date === 'string') {
      board.date = payload.date
    }
    if ('isAllCardsHidden' in payload && typeof payload.isAllCardsHidden === 'boolean') {
      board.isAllCardsHidden = payload.isAllCardsHidden
    }

    patchBoardReference(this)
  },
  applyRealtimeBoardColumnsReordered(
    this: TRealtimeActionsContext,
    payload: BoardColumnsReorderedEventPayload,
  ) {
    const boardId = asPositiveNumber(payload.boardId)
    if (!isCurrentBoardEvent(this, boardId)) {
      return
    }

    const board = getCurrentBoard(this)
    if (!board) {
      return
    }

    try {
      board.columns = reorderColumnsByPayloadIds(board.columns, payload.columns)
      recalculateItemIndices(board.columns)
      patchBoardReference(this)
      this.setLastSyncedPositions()
      this.columnsReorderError = ''
    } catch (error) {
      console.error('[retro] failed to apply realtime columns reorder', error)
    }
  },
  applyRealtimeBoardItemsPositionsSynced(this: TRealtimeActionsContext, payload: SyncPositionsPayload) {
    const boardId = asPositiveNumber(payload.boardId)
    if (!isCurrentBoardEvent(this, boardId)) {
      return
    }
    if (!boardId) {
      return
    }

    const columnsPayload = Array.isArray(payload.columns) ? payload.columns : []
    if (payload.updated === 0 && columnsPayload.length === 0) {
      return
    }

    const board = getCurrentBoard(this)
    if (!board) {
      return
    }

    const changedColumnIds = toPositiveNumberArray(payload.changedColumnIds)
    const payloadColumnIds = toPositiveNumberArray(columnsPayload.map((column) => column.id))
    const changedColumnIdsSet = new Set(changedColumnIds)

    if (import.meta.env.DEV && !isSameNumberArray(payloadColumnIds, changedColumnIds)) {
      console.warn('[retro] synced positions payload mismatch', {
        boardId,
        changedColumnIds,
        payloadColumnIds,
      })
    }

    let shouldFallbackRefetch = false
    let appliedColumnsCount = 0

    for (const payloadColumn of columnsPayload) {
      const payloadColumnId = asPositiveNumber(payloadColumn.id)
      if (!payloadColumnId) {
        continue
      }

      if (changedColumnIdsSet.size > 0 && !changedColumnIdsSet.has(payloadColumnId)) {
        continue
      }

      const localColumnIndex = board.columns.findIndex((column) => column.id === payloadColumnId)
      if (localColumnIndex < 0) {
        shouldFallbackRefetch = true
        break
      }

      const localColumn = board.columns[localColumnIndex]
      if (!localColumn) {
        shouldFallbackRefetch = true
        break
      }

      const normalizedColumn = normalizeSyncColumn(payloadColumn, localColumn, localColumnIndex)
      if (!normalizedColumn) {
        shouldFallbackRefetch = true
        break
      }

      board.columns[localColumnIndex] = normalizedColumn
      appliedColumnsCount += 1
    }

    if (
      changedColumnIdsSet.size > 0 &&
      columnsPayload.length > 0 &&
      appliedColumnsCount < changedColumnIdsSet.size
    ) {
      shouldFallbackRefetch = true
    }

    if (shouldFallbackRefetch) {
      void this.loadBoardColumns(boardId)
      return
    }

    recalculateItemIndices(board.columns)
    patchBoardReference(this)
    this.setLastSyncedPositions()
  },
  applyRealtimeColumnCreated(this: TRealtimeActionsContext, payload: WsColumn & { boardId: number }) {
    const boardId = asPositiveNumber(payload.boardId)
    const board = getCurrentBoard(this)
    if (!board || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const columnId = asPositiveNumber(payload.id)
    if (!columnId) {
      return
    }

    const existingIndex = board.columns.findIndex((column) => column.id === columnId)
    if (existingIndex >= 0) {
      const existing = board.columns[existingIndex]
      if (!existing) {
        return
      }
      applyColumnFieldMerge(existing, payload, {
        name: true,
        description: true,
        color: true,
      })
      patchBoardReference(this)
      return
    }

    const targetIndex = asNonNegativeNumber(payload.columnIndex ?? payload.index)
    const draftIndex = findDraftColumnMatchIndex(board.columns, payload, targetIndex)
    if (draftIndex >= 0) {
      const draftColumn = board.columns[draftIndex]
      if (!draftColumn) {
        return
      }

      draftColumn.id = columnId
      draftColumn.isDraft = false
      applyColumnFieldMerge(draftColumn, payload, {
        name: true,
        description: true,
        color: true,
      })

      if (targetIndex != null && targetIndex < board.columns.length && targetIndex !== draftIndex) {
        const [moved] = board.columns.splice(draftIndex, 1)
        if (moved) {
          board.columns.splice(targetIndex, 0, moved)
        }
      }

      recalculateItemIndices(board.columns)
      patchBoardReference(this)
      this.setLastSyncedPositions()
      return
    }

    const newColumn = normalizeNewColumn(payload, board.columns.length)
    if (!newColumn) {
      return
    }

    if (targetIndex == null || targetIndex > board.columns.length) {
      board.columns.push(newColumn)
    } else {
      board.columns.splice(targetIndex, 0, newColumn)
    }

    recalculateItemIndices(board.columns)
    patchBoardReference(this)
    this.setLastSyncedPositions()
  },
  applyRealtimeColumnNameUpdated(this: TRealtimeActionsContext, payload: WsColumn & { boardId: number }) {
    const boardId = asPositiveNumber(payload.boardId)
    const columnId = asPositiveNumber(payload.id)
    const board = getCurrentBoard(this)
    if (!board || !columnId || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const column = board.columns.find((entry) => entry.id === columnId)
    if (!column) {
      return
    }

    applyColumnFieldMerge(column, payload, { name: true })
    patchBoardReference(this)
  },
  applyRealtimeColumnColorUpdated(this: TRealtimeActionsContext, payload: WsColumn & { boardId: number }) {
    const boardId = asPositiveNumber(payload.boardId)
    const columnId = asPositiveNumber(payload.id)
    const board = getCurrentBoard(this)
    if (!board || !columnId || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const column = board.columns.find((entry) => entry.id === columnId)
    if (!column) {
      return
    }

    applyColumnFieldMerge(column, payload, { color: true })
    patchBoardReference(this)
  },
  applyRealtimeColumnDescriptionUpdated(
    this: TRealtimeActionsContext,
    payload: WsColumn & { boardId: number },
  ) {
    const boardId = asPositiveNumber(payload.boardId)
    const columnId = asPositiveNumber(payload.id)
    const board = getCurrentBoard(this)
    if (!board || !columnId || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const column = board.columns.find((entry) => entry.id === columnId)
    if (!column) {
      return
    }

    applyColumnFieldMerge(column, payload, { description: true })
    patchBoardReference(this)
  },
  applyRealtimeColumnDeleted(
    this: TRealtimeActionsContext,
    payload: WsDeletedPayload & { boardId: number },
  ) {
    if (payload.deleted !== true) {
      return
    }

    const boardId = asPositiveNumber(payload.boardId)
    if (!isCurrentBoardEvent(this, boardId)) {
      return
    }
    if (!boardId) {
      return
    }

    void this.loadBoardColumns(boardId)
  },
  applyRealtimeItemCreated(this: TRealtimeActionsContext, payload: WsItem) {
    const board = getCurrentBoard(this)
    const boardId = asPositiveNumber(payload.boardId)
    const itemId = asPositiveNumber(payload.id)
    if (!board || !boardId || !itemId || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const existingLocation = findItemLocationById(board.columns, itemId)
    if (existingLocation) {
      mergeItemPayload(existingLocation.item, payload)
      existingLocation.item.isDraft = false
      patchBoardReference(this)
      return
    }

    const targetColumn = resolveItemTargetColumn(board.columns, payload)
    if (!targetColumn) {
      void this.loadBoardColumns(boardId)
      return
    }

    const columnIndex = board.columns.findIndex((column) => column.id === targetColumn.id)
    const newItem = normalizeNewItem(payload, columnIndex)
    if (!newItem) {
      return
    }

    const incomingDescription = newItem.description.trim()
    if (incomingDescription) {
      const draftIndex = targetColumn.items.findIndex(
        (entry) => entry.isDraft && entry.description.trim() === incomingDescription,
      )
      if (draftIndex >= 0) {
        const draftItem = targetColumn.items[draftIndex]
        if (!draftItem) {
          return
        }

        targetColumn.items[draftIndex] = {
          ...draftItem,
          ...newItem,
          id: newItem.id,
          isDraft: false,
          syncedDescription: newItem.description,
        }
        recalculateItemIndices(board.columns)
        patchBoardReference(this)
        this.setLastSyncedPositions()
        return
      }
    }

    const payloadRowIndex = asNonNegativeNumber(payload.rowIndex)
    const insertIndex = payloadRowIndex == null ? 0 : Math.min(payloadRowIndex, targetColumn.items.length)
    targetColumn.items.splice(insertIndex, 0, newItem)

    recalculateItemIndices(board.columns)
    patchBoardReference(this)
    this.setLastSyncedPositions()
  },
  applyRealtimeItemDescriptionUpdated(this: TRealtimeActionsContext, payload: WsItem) {
    const board = getCurrentBoard(this)
    const boardId = asPositiveNumber(payload.boardId)
    const itemId = asPositiveNumber(payload.id)
    if (!board || !boardId || !itemId || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const location = findItemLocationById(board.columns, itemId)
    if (!location) {
      return
    }

    mergeItemPayload(location.item, payload)
    patchBoardReference(this)
  },
  applyRealtimeItemLikeToggled(this: TRealtimeActionsContext, payload: WsItem) {
    const board = getCurrentBoard(this)
    const boardId = asPositiveNumber(payload.boardId)
    const itemId = asPositiveNumber(payload.id)
    if (!board || !boardId || !itemId || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const location = findItemLocationById(board.columns, itemId)
    if (!location) {
      return
    }

    mergeItemPayload(location.item, payload)
    patchBoardReference(this)
  },
  applyRealtimeItemColorUpdated(this: TRealtimeActionsContext, payload: WsItem) {
    const board = getCurrentBoard(this)
    const boardId = asPositiveNumber(payload.boardId)
    const itemId = asPositiveNumber(payload.id)
    if (!board || !boardId || !itemId || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const location = findItemLocationById(board.columns, itemId)
    if (!location) {
      return
    }

    mergeItemPayload(location.item, payload)
    patchBoardReference(this)
  },
  applyRealtimeItemDeleted(this: TRealtimeActionsContext, payload: WsDeletedPayload & { boardId: number }) {
    if (payload.deleted !== true) {
      return
    }

    const boardId = asPositiveNumber(payload.boardId)
    if (!isCurrentBoardEvent(this, boardId)) {
      return
    }
    if (!boardId) {
      return
    }

    void this.loadBoardColumns(boardId)
  },
  applyRealtimeItemCommentsFetched(this: TRealtimeActionsContext, payload: WsItemCommentsFetchedPayload) {
    const board = getCurrentBoard(this)
    if (!board) {
      return
    }

    let commentsPayload: unknown[] = []
    let payloadBoardId: number | null = null
    let payloadItemId: number | null = null

    if (Array.isArray(payload)) {
      commentsPayload = payload
    } else if (isRecord(payload)) {
      payloadBoardId = asPositiveNumber(payload.boardId)
      payloadItemId = asPositiveNumber(payload.itemId)
      commentsPayload = Array.isArray(payload.comments) ? payload.comments : []
    }

    const comments = commentsPayload
      .map((entry) => toComment(entry))
      .filter((entry): entry is RetroItemCommentResponseDto => Boolean(entry))

    if (!payloadBoardId && comments.length > 0) {
      payloadBoardId = asPositiveNumber((commentsPayload[0] as WsComment | undefined)?.boardId)
    }
    if (!isCurrentBoardEvent(this, payloadBoardId)) {
      return
    }

    const resolvedItemId = payloadItemId ?? (comments[0]?.itemId ?? null)
    if (!resolvedItemId) {
      const activeItemId = this.activeItemId
      if (activeItemId) {
        this.clearItemCommentsCache(activeItemId)
      }
      void this.refetchActiveItemComments()
      return
    }

    this.setCommentsCache(resolvedItemId, comments)
  },
  applyRealtimeItemCommentCreated(this: TRealtimeActionsContext, payload: WsComment) {
    const boardId = asPositiveNumber(payload.boardId)
    const comment = toComment(payload)
    if (!comment || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    const hasCache = Object.prototype.hasOwnProperty.call(this.commentsByItemId, comment.itemId)
    const wasKnownComment = this.commentItemIdByCommentId[comment.id] === comment.itemId
    this.commentItemIdByCommentId = {
      ...this.commentItemIdByCommentId,
      [comment.id]: comment.itemId,
    }

    if (hasCache) {
      this.mergeCommentCache(comment)
      return
    }

    if (wasKnownComment) {
      return
    }

    bumpItemCommentsCount(this, comment.itemId, 1)
    patchBoardReference(this)
  },
  applyRealtimeItemCommentUpdated(this: TRealtimeActionsContext, payload: WsComment) {
    const boardId = asPositiveNumber(payload.boardId)
    const comment = toComment(payload)
    if (!comment || !isCurrentBoardEvent(this, boardId)) {
      return
    }

    this.commentItemIdByCommentId = {
      ...this.commentItemIdByCommentId,
      [comment.id]: comment.itemId,
    }
    this.mergeCommentCache(comment)
  },
  applyRealtimeItemCommentDeleted(
    this: TRealtimeActionsContext,
    payload: WsItemCommentDeletedPayload,
  ) {
    if (payload.deleted !== true) {
      return
    }

    const boardId = asPositiveNumber(payload.boardId)
    if (!isCurrentBoardEvent(this, boardId)) {
      return
    }
    if (!boardId) {
      return
    }

    const payloadCommentId = asPositiveNumber(payload.commentId) ?? asPositiveNumber(payload.id)
    const payloadItemId = asPositiveNumber(payload.itemId)
    const resolvedItemId =
      payloadItemId ?? (payloadCommentId ? asPositiveNumber(this.commentItemIdByCommentId[payloadCommentId]) : null)
    const payloadCommentsCount = asNonNegativeNumber(payload.commentsCount)

    if (!payloadCommentId && !resolvedItemId) {
      console.warn('[retro] malformed comment deleted payload', payload)
      void this.loadBoardColumns(boardId)
      return
    }

    if (!resolvedItemId) {
      console.warn('[retro] failed to resolve item for comment deleted payload', payload)
      void this.loadBoardColumns(boardId)
      return
    }

    const hasCommentsCache = Object.prototype.hasOwnProperty.call(this.commentsByItemId, resolvedItemId)
    const hadDeletedCommentInCache = Boolean(
      payloadCommentId &&
        this.commentsByItemId[resolvedItemId]?.some((comment) => comment.id === payloadCommentId),
    )

    if (payloadCommentId) {
      this.removeCommentFromCache(payloadCommentId, resolvedItemId)
    } else if (hasCommentsCache) {
      void this.refetchItemComments(resolvedItemId).catch((error) => {
        console.error('[retro] failed to refetch comments after deletion event', error)
        void this.loadBoardColumns(boardId)
      })
    }

    if (payloadCommentsCount != null) {
      this.setItemCommentsCount(resolvedItemId, payloadCommentsCount)
      patchBoardReference(this)
      return
    }

    if (!hasCommentsCache || (payloadCommentId ? !hadDeletedCommentInCache : false)) {
      bumpItemCommentsCount(this, resolvedItemId, -1)
      patchBoardReference(this)
    }
  },
  applyRealtimeTeamAllCardsVisibilityUpdated(
    this: TRealtimeActionsContext,
    payload: TeamAllCardsVisibilityUpdatedPayload,
  ) {
    const board = getCurrentBoard(this)
    if (!board) {
      return
    }

    const teamId = asPositiveNumber(payload.id)
    if (!teamId || board.teamId !== teamId) {
      return
    }

    this.setBoardCardsHidden(payload.isAllCardsHidden === true)
    void this.loadBoardColumns(board.id)
  },
}
