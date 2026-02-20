import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'
import type {
  AddTeamMemberRequest,
  ApiErrorCode,
  CreateRetroBoardRequest,
  CreateTeamRequest,
  RetroBoardSummary,
  TeamMember,
  TeamRole,
  TeamSummary,
  UpdateTeamMemberRoleRequest,
} from '../types'

type TRecord = Record<string, unknown>

const isRecord = (value: unknown): value is TRecord => {
  return typeof value === 'object' && value !== null
}

const asString = (value: unknown) => {
  return typeof value === 'string' ? value : undefined
}

const asMemberId = (value: unknown) => {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? normalized : undefined
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return undefined
}

const asPositiveNumber = (value: unknown) => {
  const numberValue = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : undefined
}

const getRole = (value: unknown): TeamRole => {
  return value === 'OWNER' || value === 'ADMIN' || value === 'MEMBER' ? value : 'MEMBER'
}

const getCollectionPayload = (payload: unknown): unknown[] => {
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

const getNestedRecord = (record: TRecord, key: string): TRecord | undefined => {
  const nested = record[key]
  return isRecord(nested) ? nested : undefined
}

const normalizeTeam = (payload: unknown): TeamSummary | null => {
  if (!isRecord(payload)) {
    return null
  }

  const nestedTeam = getNestedRecord(payload, 'team')
  const root = nestedTeam ?? payload

  const id = asPositiveNumber(root.id ?? payload.teamId)
  if (!id) {
    return null
  }

  return {
    id,
    name: asString(root.name) ?? `Team ${id}`,
    role: getRole(payload.role ?? root.role ?? payload.membershipRole),
  }
}

const normalizeMember = (payload: unknown): TeamMember | null => {
  if (!isRecord(payload)) {
    return null
  }

  const nestedUser = getNestedRecord(payload, 'user')
  const root = nestedUser ?? payload

  const id = asMemberId(payload.userId ?? root.id ?? payload.id)
  const email = asString(root.email ?? payload.email)
  if (!id || !email) {
    return null
  }

  return {
    id,
    email,
    name: asString(root.name ?? payload.name) ?? null,
    role: getRole(payload.role ?? root.role),
  }
}

const normalizeBoard = (payload: unknown, fallbackTeamId?: number): RetroBoardSummary | null => {
  if (!isRecord(payload)) {
    return null
  }

  const nestedTeam = getNestedRecord(payload, 'team')

  const id = asPositiveNumber(payload.id)
  const teamId = asPositiveNumber(payload.teamId ?? nestedTeam?.id) ?? fallbackTeamId
  if (!id || !teamId) {
    return null
  }

  return {
    id,
    teamId,
    name: asString(payload.name) ?? `Board ${id}`,
    date: asString(payload.date) ?? null,
    description: asString(payload.description) ?? null,
  }
}

const extractMessage = (payload: unknown): string | undefined => {
  if (typeof payload === 'string') {
    return payload
  }

  if (!isRecord(payload)) {
    return undefined
  }

  if (typeof payload.message === 'string') {
    return payload.message
  }
  if (Array.isArray(payload.message)) {
    const details = payload.message.filter((item): item is string => typeof item === 'string')
    if (details.length > 0) {
      return details.join(', ')
    }
  }
  if (typeof payload.error === 'string') {
    return payload.error
  }

  return undefined
}

export class TeamBoardsApiError extends Error {
  readonly status?: number
  readonly code: ApiErrorCode

  constructor(message: string, options?: { status?: number; code?: ApiErrorCode }) {
    super(message)
    this.name = 'TeamBoardsApiError'
    this.status = options?.status
    this.code = options?.code ?? 'UNKNOWN'
  }
}

export const toTeamBoardsApiError = (error: unknown, fallbackMessage: string): TeamBoardsApiError => {
  if (error instanceof TeamBoardsApiError) {
    return error
  }

  if (error instanceof AxiosError) {
    return new TeamBoardsApiError(extractMessage(error.response?.data) ?? fallbackMessage, {
      status: error.response?.status,
    })
  }

  if (error instanceof Error && error.message) {
    return new TeamBoardsApiError(error.message)
  }

  return new TeamBoardsApiError(fallbackMessage)
}

export const teamsApiClient = {
  async createTeam(payload: CreateTeamRequest): Promise<TeamSummary | null> {
    try {
      const response = await httpClient.post('/teams', payload)
      return normalizeTeam(response.data)
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось создать команду')
    }
  },
  async getTeams(): Promise<TeamSummary[]> {
    try {
      const response = await httpClient.get('/teams')
      return getCollectionPayload(response.data)
        .map(normalizeTeam)
        .filter((team): team is TeamSummary => Boolean(team))
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось загрузить команды')
    }
  },
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    try {
      const response = await httpClient.get(`/teams/${teamId}/members`)
      return getCollectionPayload(response.data)
        .map(normalizeMember)
        .filter((member): member is TeamMember => Boolean(member))
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось загрузить участников команды')
    }
  },
  async addTeamMember(teamId: number, payload: AddTeamMemberRequest): Promise<TeamMember | null> {
    try {
      const response = await httpClient.post(`/teams/${teamId}/members`, payload)
      return normalizeMember(response.data)
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось добавить участника')
    }
  },
  async removeTeamMember(teamId: number, memberId: string): Promise<void> {
    try {
      await httpClient.delete(`/teams/${teamId}/members/${memberId}`)
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось удалить участника')
    }
  },
  async updateTeamMemberRole(
    teamId: number,
    memberId: string,
    payload: UpdateTeamMemberRoleRequest,
  ): Promise<TeamMember | null> {
    try {
      const response = await httpClient.patch(`/teams/${teamId}/members/${memberId}/role`, payload)
      return normalizeMember(response.data)
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось изменить роль участника')
    }
  },
}

export const retroBoardsApiClient = {
  async getBoards(teamId?: number): Promise<RetroBoardSummary[]> {
    try {
      const response = await httpClient.get('/retro/boards', {
        params: teamId ? { teamId } : undefined,
      })

      return getCollectionPayload(response.data)
        .map((item) => normalizeBoard(item, teamId))
        .filter((board): board is RetroBoardSummary => Boolean(board))
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось загрузить доски')
    }
  },
  async createBoard(payload: CreateRetroBoardRequest): Promise<RetroBoardSummary | null> {
    try {
      const response = await httpClient.post('/retro/boards', payload)
      return normalizeBoard(response.data, payload.teamId)
    } catch (error) {
      throw toTeamBoardsApiError(error, 'Не удалось создать доску')
    }
  },
}
