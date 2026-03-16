import { httpClient } from '@/api/httpClient'
import { retroBoardService } from '@/api/services/retroBoardService'
import { getAccessToken } from '@/auth/session'
import { renameBoard } from '@/shared/socket'
import { normalizeColumns } from '../helpers/normalize'
import { reorderColumnsByPayloadIds } from '../helpers/reorderColumns'
import type {
  RetroBoardSettings,
  TRetroBoard,
  TRetroBoardState,
  TRetroUserBoardRole,
} from '../types'

type TRecord = Record<string, unknown>
const DEFAULT_BOARD_SETTINGS: RetroBoardSettings = {
  showLikes: true,
  showComments: true,
  canEditCards: true,
}
const DEFAULT_BOARD_LOADING_SKELETON_COUNT = 3
const MIN_BOARD_LOADING_SKELETON_MS = 250

const resolveInitialBoardSettings = (): RetroBoardSettings => {
  return {
    ...DEFAULT_BOARD_SETTINGS,
  }
}

const resolveBoardLoadingSkeletonCount = (
  state: Pick<TRetroBoardState, 'board'>,
  fallback = DEFAULT_BOARD_LOADING_SKELETON_COUNT,
) => {
  const currentColumnsCount = state.board[0]?.columns?.length ?? 0
  return currentColumnsCount > 0 ? currentColumnsCount : fallback
}

const ensureMinimumLoadingDuration = async (loadingStartedAt: number) => {
  const elapsedMs = Date.now() - loadingStartedAt
  const remainingMs = MIN_BOARD_LOADING_SKELETON_MS - elapsedMs

  if (remainingMs <= 0) {
    return
  }

  await new Promise((resolve) => {
    setTimeout(resolve, remainingMs)
  })
}

const normalizeUserBoardRole = (value: unknown): TRetroUserBoardRole | null => {
  return value === 'OWNER' || value === 'ADMIN' || value === 'MEMBER' ? value : null
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

const asBoolean = (value: unknown): boolean => {
  return value === true
}

const asBoardSettings = (
  value: unknown,
  fallback: RetroBoardSettings = DEFAULT_BOARD_SETTINGS,
): RetroBoardSettings => {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  return {
    showLikes: typeof value.showLikes === 'boolean' ? value.showLikes : fallback.showLikes,
    showComments:
      typeof value.showComments === 'boolean' ? value.showComments : fallback.showComments,
    canEditCards:
      typeof value.canEditCards === 'boolean' ? value.canEditCards : fallback.canEditCards,
  }
}

const clearBoardLikes = (board: TRetroBoard) => {
  for (const column of board.columns) {
    for (const item of column.items) {
      item.likes = []
    }
    for (const group of column.groups) {
      for (const item of group.items) {
        item.likes = []
      }
    }
  }
}

const clearBoardCommentsCache = (
  state: Pick<TRetroBoardState, 'commentsByItemId' | 'commentItemIdByCommentId'>,
) => {
  state.commentsByItemId = {}
  state.commentItemIdByCommentId = {}
}

const resolveBoardPayload = (payload: unknown): TRecord | null => {
  if (!isRecord(payload)) {
    return null
  }

  if (isRecord(payload.board)) {
    return payload.board
  }

  return payload
}

const extractTeamRoleFromBoardPayload = (payload: unknown): TRetroUserBoardRole | null => {
  const boardPayload = resolveBoardPayload(payload)
  if (!boardPayload) {
    return null
  }

  const teamPayload = isRecord(boardPayload.team) ? boardPayload.team : undefined

  return normalizeUserBoardRole(
    boardPayload.role ??
      boardPayload.membershipRole ??
      teamPayload?.role ??
      teamPayload?.membershipRole,
  )
}

const extractTeamIdFromBoardPayload = (payload: unknown): number | null => {
  const boardPayload = resolveBoardPayload(payload)
  if (!boardPayload) {
    return null
  }

  const teamPayload = isRecord(boardPayload.team) ? boardPayload.team : undefined
  return asPositiveNumber(boardPayload.teamId ?? teamPayload?.id)
}

const extractIsAllCardsHiddenFromBoardPayload = (payload: unknown): boolean => {
  const boardPayload = resolveBoardPayload(payload)
  if (!boardPayload) {
    return false
  }

  return asBoolean(boardPayload.isAllCardsHidden)
}

const extractOptionalIsAllCardsHiddenFromBoardPayload = (payload: unknown): boolean | null => {
  const boardPayload = resolveBoardPayload(payload)
  if (!boardPayload || typeof boardPayload.isAllCardsHidden !== 'boolean') {
    return null
  }

  return boardPayload.isAllCardsHidden
}

const extractBoardSettingsFromBoardPayload = (
  payload: unknown,
  fallback: RetroBoardSettings = DEFAULT_BOARD_SETTINGS,
): RetroBoardSettings => {
  return extractBoardSettingsFromAnyPayload(payload, fallback)
}

const extractBoardSettingsFromAnyPayload = (
  payload: unknown,
  fallback: RetroBoardSettings = DEFAULT_BOARD_SETTINGS,
): RetroBoardSettings => {
  if (isRecord(payload)) {
    if (isRecord(payload.settings)) {
      return asBoardSettings(payload.settings, fallback)
    }
    if (
      typeof payload.showLikes === 'boolean' ||
      typeof payload.showComments === 'boolean' ||
      typeof payload.canEditCards === 'boolean'
    ) {
      return asBoardSettings(payload, fallback)
    }
  }

  const boardPayload = resolveBoardPayload(payload)
  if (boardPayload) {
    if ('settings' in boardPayload) {
      return asBoardSettings(boardPayload.settings, fallback)
    }
    if (
      'showLikes' in boardPayload ||
      'showComments' in boardPayload ||
      'canEditCards' in boardPayload
    ) {
      return asBoardSettings(boardPayload, fallback)
    }
  }

  if (
    isRecord(payload) &&
    ('showLikes' in payload || 'showComments' in payload || 'canEditCards' in payload)
  ) {
    return asBoardSettings(payload, fallback)
  }

  return { ...fallback }
}

const hasBoardSettingsInPayload = (payload: unknown): boolean => {
  if (isRecord(payload)) {
    if (
      isRecord(payload.settings) &&
      (typeof payload.settings.showLikes === 'boolean' ||
        typeof payload.settings.showComments === 'boolean' ||
        typeof payload.settings.canEditCards === 'boolean')
    ) {
      return true
    }
    if (
      typeof payload.showLikes === 'boolean' ||
      typeof payload.showComments === 'boolean' ||
      typeof payload.canEditCards === 'boolean'
    ) {
      return true
    }
  }

  const boardPayload = resolveBoardPayload(payload)
  if (boardPayload) {
    if (
      isRecord(boardPayload.settings) &&
      (typeof boardPayload.settings.showLikes === 'boolean' ||
        typeof boardPayload.settings.showComments === 'boolean' ||
        typeof boardPayload.settings.canEditCards === 'boolean')
    ) {
      return true
    }

    if (
      typeof boardPayload.showLikes === 'boolean' ||
      typeof boardPayload.showComments === 'boolean' ||
      typeof boardPayload.canEditCards === 'boolean'
    ) {
      return true
    }
  }
  return false
}

const extractColumnsPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }

  const boardPayload = resolveBoardPayload(payload)
  if (!boardPayload) {
    return []
  }

  if (Array.isArray(boardPayload.columns)) {
    return boardPayload.columns
  }

  return []
}

const extractCollectionPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload
  }
  if (!isRecord(payload)) {
    return []
  }
  if (Array.isArray(payload.items)) {
    return payload.items
  }
  if (Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

const resolveTeamRoleFromTeamsPayload = (
  teamsPayload: unknown,
  targetTeamId: number,
): TRetroUserBoardRole | null => {
  const teamsCollection = extractCollectionPayload(teamsPayload)

  for (const entry of teamsCollection) {
    if (!isRecord(entry)) continue

    const teamPayload = isRecord(entry.team) ? entry.team : entry
    const teamId = asPositiveNumber(entry.teamId ?? teamPayload.id)
    if (teamId !== targetTeamId) continue

    const resolvedRole = normalizeUserBoardRole(
      entry.role ?? entry.membershipRole ?? teamPayload.role ?? teamPayload.membershipRole,
    )
    if (resolvedRole) {
      return resolvedRole
    }
  }

  return null
}

const resolveCurrentUserBoardRole = async (
  boardPayload: unknown,
): Promise<TRetroUserBoardRole | null> => {
  const roleFromBoard = extractTeamRoleFromBoardPayload(boardPayload)
  if (roleFromBoard) {
    return roleFromBoard
  }

  const boardTeamId = extractTeamIdFromBoardPayload(boardPayload)
  if (!boardTeamId) {
    return null
  }
  if (!getAccessToken()) {
    return null
  }

  try {
    const teamsResponse = await httpClient.get('/teams')
    return resolveTeamRoleFromTeamsPayload(teamsResponse.data, boardTeamId)
  } catch (error) {
    console.error('[retro] failed to resolve team role for board', error)
    return null
  }
}

const loadBoardMetaForBoardById = async (
  boardId: number,
): Promise<Partial<TRetroBoard> | undefined> => {
  const hasAccessToken = Boolean(getAccessToken())

  if (hasAccessToken) {
    try {
      const boardsResponse = await httpClient.get('/retro/boards')
      const boardsData = Array.isArray(boardsResponse.data) ? boardsResponse.data : []

      const boardFromList = boardsData.find((item) => {
        return Number((item as Partial<TRetroBoard>)?.id) === boardId
      }) as Partial<TRetroBoard> | undefined

      if (boardFromList) {
        return boardFromList
      }
    } catch (error) {
      console.error('[retro] failed to load board list for board by id', boardId, error)
    }
  }

  try {
    const boardResponse = await httpClient.get(`/retro/boards/${boardId}`)
    const boardPayload = resolveBoardPayload(boardResponse.data)
    return boardPayload as Partial<TRetroBoard> | undefined
  } catch (error) {
    if (hasAccessToken) {
      console.error('[retro] failed to load board meta by id', boardId, error)
    }

    return undefined
  }
}

type TBoardActionsContext = TRetroBoardState & {
  loadBoardData: (boardData: Partial<TRetroBoard> | undefined) => Promise<void>
  loadBoardColumns: (boardId: number) => Promise<void>
  normalizeColumns: (columnsData: unknown) => TRetroBoard['columns']
  setLastSyncedPositions: () => void
  setBoardSettings: (settings: RetroBoardSettings) => void
}

export const boardActions = {
  setCardSearchQuery(this: TBoardActionsContext, query: string) {
    this.cardSearchQuery = typeof query === 'string' ? query : ''
  },
  clearActiveItemIfCardsHidden(this: TBoardActionsContext, itemId: number) {
    if (!Number.isFinite(itemId)) {
      return
    }

    const isAllCardsHidden = this.board[0]?.isAllCardsHidden ?? false
    if (!isAllCardsHidden || this.activeItemId !== itemId) {
      return
    }

    this.activeItemId = null
  },
  setBoardCardsHidden(this: TBoardActionsContext, isAllCardsHidden: boolean) {
    const currentBoard = this.board[0]
    if (!currentBoard) {
      return
    }

    currentBoard.isAllCardsHidden = isAllCardsHidden
    this.board = [{ ...currentBoard }]
  },
  setBoardSettings(this: TBoardActionsContext, settings: RetroBoardSettings) {
    const currentBoard = this.board[0]
    if (!currentBoard) {
      return
    }

    currentBoard.settings = {
      ...settings,
    }
    if (currentBoard.settings.showLikes === false) {
      clearBoardLikes(currentBoard)
    }
    if (currentBoard.settings.showComments === false) {
      clearBoardCommentsCache(this)
    }
    this.board = [{ ...currentBoard }]
  },
  normalizeColumns(this: TBoardActionsContext, columnsData: unknown) {
    return normalizeColumns(columnsData)
  },
  async loadBoardData(this: TBoardActionsContext, boardData: Partial<TRetroBoard> | undefined) {
    if (!boardData) {
      this.board = []
      this.currentUserTeamRole = null
      clearBoardCommentsCache(this)
      this.lastSyncedPositions = {}
      return
    }

    const boardId = Number(boardData.id)
    if (!boardId) {
      this.board = []
      this.currentUserTeamRole = null
      clearBoardCommentsCache(this)
      this.lastSyncedPositions = {}
      return
    }

    this.currentUserTeamRole = await resolveCurrentUserBoardRole(boardData)

    const initialBoardSettings = resolveInitialBoardSettings()

    const board: TRetroBoard = {
      id: boardId,
      teamId: extractTeamIdFromBoardPayload(boardData),
      name: boardData.name ?? '',
      date: boardData.date ?? '',
      description: boardData.description ?? '',
      isAllCardsHidden: extractIsAllCardsHiddenFromBoardPayload(boardData),
      settings: extractBoardSettingsFromBoardPayload(boardData, initialBoardSettings),
      columns: [],
    }

    const boardWithColumns = boardData as Partial<TRetroBoard> & { columns?: unknown }
    if (Array.isArray(boardWithColumns.columns)) {
      board.columns = this.normalizeColumns(boardWithColumns.columns)
    } else {
      const columnsPayload = await retroBoardService.getBoardColumns(boardId)
      board.columns = this.normalizeColumns(extractColumnsPayload(columnsPayload))
      board.settings = extractBoardSettingsFromBoardPayload(columnsPayload, board.settings)
    }
    if (board.settings.showLikes === false) {
      clearBoardLikes(board)
    }

    this.board = [board]
    clearBoardCommentsCache(this)
    this.setLastSyncedPositions()
  },
  async loadBoardForUser(this: TBoardActionsContext) {
    const loadingStartedAt = Date.now()
    this.boardLoadingSkeletonCount = resolveBoardLoadingSkeletonCount(this)
    this.isBoardLoading = true
    try {
      const boardsResponse = await httpClient.get('/retro/boards')

      const boardsData = Array.isArray(boardsResponse.data) ? boardsResponse.data : []
      const firstBoard = boardsData[0] as Partial<TRetroBoard> | undefined

      await this.loadBoardData(firstBoard)
    } catch (error) {
      console.error('[retro] failed to load board for user', error)
    } finally {
      await ensureMinimumLoadingDuration(loadingStartedAt)
      this.isBoardLoading = false
    }
  },
  async loadBoardById(this: TBoardActionsContext, boardId: number) {
    const loadingStartedAt = Date.now()
    this.boardLoadingSkeletonCount = resolveBoardLoadingSkeletonCount(this)
    this.isBoardLoading = true
    try {
      const initialBoardSettings = resolveInitialBoardSettings()
      const columnsResponse = await retroBoardService.getBoardColumns(boardId)
      let rawBoard: Partial<TRetroBoard> | undefined = await loadBoardMetaForBoardById(boardId)

      const columnsBoardPayload = resolveBoardPayload(columnsResponse)
      if (!rawBoard && columnsBoardPayload) {
        rawBoard = columnsBoardPayload as Partial<TRetroBoard>
      }

      this.currentUserTeamRole = await resolveCurrentUserBoardRole(rawBoard)

      const board: TRetroBoard = {
        id: boardId,
        teamId: extractTeamIdFromBoardPayload(rawBoard),
        name: typeof rawBoard?.name === 'string' ? rawBoard.name : `Board ${boardId}`,
        date: typeof rawBoard?.date === 'string' ? rawBoard.date : '',
        description: typeof rawBoard?.description === 'string' ? rawBoard.description : '',
        isAllCardsHidden: extractIsAllCardsHiddenFromBoardPayload(rawBoard),
        settings: extractBoardSettingsFromBoardPayload(rawBoard, initialBoardSettings),
        columns: this.normalizeColumns(extractColumnsPayload(columnsResponse)),
      }
      board.settings = extractBoardSettingsFromBoardPayload(columnsResponse, board.settings)
      if (!hasBoardSettingsInPayload(rawBoard) && !hasBoardSettingsInPayload(columnsResponse)) {
        try {
          const settingsPayload = await retroBoardService.getBoardSettings(boardId)
          board.settings = extractBoardSettingsFromAnyPayload(settingsPayload, board.settings)
        } catch (error) {
          if (getAccessToken()) {
            console.error('[retro] failed to load board settings by id', boardId, error)
          }
        }
      }

      if (board.settings.showLikes === false) {
        clearBoardLikes(board)
      }

      this.board = [board]
      clearBoardCommentsCache(this)
      this.setLastSyncedPositions()
    } catch (error) {
      console.error('[retro] failed to load board by id', boardId, error)
      this.board = []
      this.currentUserTeamRole = null
      clearBoardCommentsCache(this)
      this.lastSyncedPositions = {}
      throw error
    } finally {
      await ensureMinimumLoadingDuration(loadingStartedAt)
      this.isBoardLoading = false
    }
  },
  async loadBoardColumns(this: TBoardActionsContext, boardId: number) {
    if (!Number.isInteger(boardId) || boardId <= 0) {
      return
    }

    const currentBoard = this.board[0]
    if (!currentBoard || currentBoard.id !== boardId) {
      return
    }

    try {
      const columnsPayload = await retroBoardService.getBoardColumns(boardId)
      currentBoard.columns = this.normalizeColumns(extractColumnsPayload(columnsPayload))
      const nextIsAllCardsHidden = extractOptionalIsAllCardsHiddenFromBoardPayload(columnsPayload)
      if (nextIsAllCardsHidden != null) {
        currentBoard.isAllCardsHidden = nextIsAllCardsHidden
      }
      currentBoard.settings = extractBoardSettingsFromBoardPayload(
        columnsPayload,
        currentBoard.settings,
      )
      if (currentBoard.settings.showLikes === false) {
        clearBoardLikes(currentBoard)
      }
      if (currentBoard.settings.showComments === false) {
        clearBoardCommentsCache(this)
      }
      this.board = [{ ...currentBoard }]
      this.setLastSyncedPositions()
    } catch (error) {
      console.error('[retro] failed to load board columns', boardId, error)
    }
  },
  async updateBoardName(this: TBoardActionsContext, boardId: number, name: string) {
    const normalizedName = name.trim()
    if (!normalizedName) {
      return
    }

    try {
      const response = await renameBoard(boardId, normalizedName)

      const responseName = typeof response?.name === 'string' ? response.name.trim() : ''
      if (!responseName) {
        throw new Error('Invalid board response')
      }

      const currentBoard = this.board[0]
      if (!currentBoard || Number(currentBoard.id) !== boardId) {
        return
      }

      currentBoard.name = responseName
      this.board = [{ ...currentBoard }]
    } catch (error) {
      console.error('[retro] failed to update board name', boardId, error)
      throw error
    }
  },
  applyBoardRenamedFromSocket(this: TBoardActionsContext, boardPayload: unknown) {
    if (!isRecord(boardPayload)) {
      return
    }

    const boardId = asPositiveNumber(boardPayload.id)
    const boardName =
      typeof boardPayload.name === 'string' && boardPayload.name.trim()
        ? boardPayload.name.trim()
        : ''
    if (!boardId || !boardName) {
      return
    }

    const currentBoard = this.board[0]
    if (!currentBoard || currentBoard.id !== boardId) {
      return
    }

    currentBoard.name = boardName
    this.board = [{ ...currentBoard }]
  },
  applyBoardColumnsReorderedFromSocket(
    this: TBoardActionsContext,
    payload: { boardId: number; columns: unknown },
  ) {
    const currentBoard = this.board[0]
    if (!currentBoard || currentBoard.id !== payload.boardId) {
      return
    }

    try {
      currentBoard.columns = reorderColumnsByPayloadIds(currentBoard.columns, payload.columns)
      this.board = [{ ...currentBoard }]
      this.columnsReorderError = ''
    } catch (error) {
      console.error('[retro] failed to apply realtime columns reorder', error)
    }
  },
  applyBoardSettingsFromPayload(this: TBoardActionsContext, payload: unknown) {
    const boardPayload = resolveBoardPayload(payload)
    if (!boardPayload) {
      return
    }

    const boardId = asPositiveNumber(boardPayload.id ?? boardPayload.boardId)
    const currentBoard = this.board[0]
    if (!boardId || !currentBoard || currentBoard.id !== boardId) {
      return
    }

    const nextSettings = extractBoardSettingsFromBoardPayload(payload, currentBoard.settings)
    this.setBoardSettings(nextSettings)
  },
  applyBoardSettingsUpdatedFromSocket(
    this: TBoardActionsContext,
    payload: { boardId?: unknown; settings?: unknown },
  ) {
    const boardId = asPositiveNumber(payload.boardId)
    const currentBoard = this.board[0]
    if (!boardId || !currentBoard || currentBoard.id !== boardId) {
      return
    }

    const nextSettings = asBoardSettings(payload.settings, currentBoard.settings)
    this.setBoardSettings(nextSettings)
  },
}
