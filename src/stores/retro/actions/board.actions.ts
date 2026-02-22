import { httpClient } from '@/api/httpClient'
import { normalizeColumns } from '../helpers/normalize'
import type { TRetroBoard, TRetroUserBoardRole } from '../types'

type TRecord = Record<string, unknown>

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

const extractTeamRoleFromBoardPayload = (payload: unknown): TRetroUserBoardRole | null => {
  if (!isRecord(payload)) {
    return null
  }

  const boardPayload = payload
  const teamPayload = isRecord(boardPayload.team) ? boardPayload.team : undefined

  return normalizeUserBoardRole(
    boardPayload.role ?? boardPayload.membershipRole ?? teamPayload?.role ?? teamPayload?.membershipRole,
  )
}

const extractTeamIdFromBoardPayload = (payload: unknown): number | null => {
  if (!isRecord(payload)) {
    return null
  }

  const teamPayload = isRecord(payload.team) ? payload.team : undefined
  return asPositiveNumber(payload.teamId ?? teamPayload?.id)
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

const resolveCurrentUserBoardRole = async (boardPayload: unknown): Promise<TRetroUserBoardRole | null> => {
  const roleFromBoard = extractTeamRoleFromBoardPayload(boardPayload)
  if (roleFromBoard) {
    return roleFromBoard
  }

  const boardTeamId = extractTeamIdFromBoardPayload(boardPayload)
  if (!boardTeamId) {
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

export const boardActions = {
  normalizeColumns(this: any, columnsData: unknown) {
    return normalizeColumns(columnsData)
  },
  async loadBoardData(this: any, boardData: Partial<TRetroBoard> | undefined) {
    if (!boardData) {
      this.board = []
      this.currentUserTeamRole = null
      this.lastSyncedPositions = {}
      return
    }

    const boardId = Number(boardData.id)
    if (!boardId) {
      this.board = []
      this.currentUserTeamRole = null
      this.lastSyncedPositions = {}
      return
    }

    this.currentUserTeamRole = await resolveCurrentUserBoardRole(boardData)

    const board: TRetroBoard = {
      id: boardId,
      name: boardData.name ?? '',
      date: boardData.date ?? '',
      description: boardData.description ?? '',
      columns: [],
    }

    const boardWithColumns = boardData as Partial<TRetroBoard> & { columns?: unknown }
    if (Array.isArray(boardWithColumns.columns)) {
      board.columns = this.normalizeColumns(boardWithColumns.columns)
    } else {
      const columnsResponse = await httpClient.get(`/retro/boards/${boardId}/columns`)
      board.columns = this.normalizeColumns(columnsResponse.data)
    }

    this.board = [board]
    this.setLastSyncedPositions()
  },
  async loadBoardForUser(this: any) {
    this.isBoardLoading = true
    try {
      const boardsResponse = await httpClient.get('/retro/boards')

      const boardsData = Array.isArray(boardsResponse.data) ? boardsResponse.data : []
      const firstBoard = boardsData[0] as Partial<TRetroBoard> | undefined

      await this.loadBoardData(firstBoard)
    } catch (error) {
      console.error('[retro] failed to load board for user', error)
    } finally {
      this.isBoardLoading = false
    }
  },
  async loadBoardById(this: any, boardId: number) {
    this.isBoardLoading = true
    try {
      const [boardsResponse, columnsResponse] = await Promise.all([
        httpClient.get('/retro/boards'),
        httpClient.get(`/retro/boards/${boardId}/columns`),
      ])

      const boardsData = Array.isArray(boardsResponse.data) ? boardsResponse.data : []
      const rawBoard = boardsData.find(
        (item) => Number((item as Partial<TRetroBoard>)?.id) === boardId,
      ) as Partial<TRetroBoard> | undefined
      this.currentUserTeamRole = await resolveCurrentUserBoardRole(rawBoard)

      const board: TRetroBoard = {
        id: boardId,
        name: typeof rawBoard?.name === 'string' ? rawBoard.name : `Board ${boardId}`,
        date: typeof rawBoard?.date === 'string' ? rawBoard.date : '',
        description: typeof rawBoard?.description === 'string' ? rawBoard.description : '',
        columns: this.normalizeColumns(columnsResponse.data),
      }

      this.board = [board]
      this.setLastSyncedPositions()
    } catch (error) {
      console.error('[retro] failed to load board by id', boardId, error)
      this.board = []
      this.currentUserTeamRole = null
      this.lastSyncedPositions = {}
    } finally {
      this.isBoardLoading = false
    }
  },
  async updateBoardName(this: any, boardId: number, name: string) {
    const normalizedName = name.trim()
    if (!normalizedName) {
      return
    }

    try {
      const response = await httpClient.patch(`/retro/boards/${boardId}/name`, {
        name: normalizedName,
      })

      const responseName = isRecord(response.data) && typeof response.data.name === 'string'
        ? response.data.name.trim()
        : ''
      const nextBoardName = responseName || normalizedName

      const currentBoard = this.board[0]
      if (!currentBoard || Number(currentBoard.id) !== boardId) {
        return
      }

      currentBoard.name = nextBoardName
      this.board = [{ ...currentBoard }]
    } catch (error) {
      console.error('[retro] failed to update board name', boardId, error)
      throw error
    }
  },
}
