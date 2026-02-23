import { httpClient } from '@/api/httpClient'
import type { AcceptInviteResponse, InviteInfoResponse, ShareLinkResponse } from '../types'

type RawShareLinkResponse = Partial<ShareLinkResponse> & {
  shareUrl?: unknown
  code?: unknown
  teamId?: unknown
  boardId?: unknown
}

type RawInviteInfoResponse = Partial<InviteInfoResponse> & {
  valid?: unknown
  teamId?: unknown
  teamName?: unknown
  boardId?: unknown
  boardName?: unknown
}

type RawAcceptInviteResponse = Partial<AcceptInviteResponse> & {
  joined?: unknown
  alreadyMember?: unknown
  teamId?: unknown
  boardId?: unknown
  redirectPath?: unknown
}

type RevokeShareLinkResponse = {
  revoked: boolean
}

const asPositiveNumber = (value: unknown): number => {
  const normalized = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(normalized) && normalized > 0 ? normalized : 0
}

const asNonEmptyString = (value: unknown): string => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

const normalizeInviteCode = (value: string): string => {
  return encodeURIComponent(value.trim())
}

export const buildFrontendInviteUrl = (code: string) => {
  const encodedCode = normalizeInviteCode(code)
  const path = `/invite/${encodedCode}`

  if (typeof window === 'undefined') {
    return path
  }

  return `${window.location.origin}${path}`
}

const normalizeShareLinkResponse = (payload: RawShareLinkResponse): ShareLinkResponse => {
  const code = asNonEmptyString(payload.code)
  if (!code) {
    throw new Error('Сервер не вернул invite code')
  }

  return {
    code,
    teamId: asPositiveNumber(payload.teamId),
    boardId: asPositiveNumber(payload.boardId),
    shareUrl: buildFrontendInviteUrl(code),
  }
}

const normalizeInviteInfoResponse = (payload: RawInviteInfoResponse): InviteInfoResponse => {
  return {
    valid: Boolean(payload.valid),
    teamId: asPositiveNumber(payload.teamId),
    teamName: asNonEmptyString(payload.teamName),
    boardId: asPositiveNumber(payload.boardId),
    boardName: asNonEmptyString(payload.boardName),
  }
}

const normalizeAcceptInviteResponse = (payload: RawAcceptInviteResponse): AcceptInviteResponse => {
  const redirectPath = asNonEmptyString(payload.redirectPath)

  return {
    joined: Boolean(payload.joined),
    alreadyMember: Boolean(payload.alreadyMember),
    teamId: asPositiveNumber(payload.teamId),
    boardId: asPositiveNumber(payload.boardId),
    redirectPath: redirectPath || '/teams',
  }
}

const normalizeInviteCodeForRequest = (code: string) => {
  return encodeURIComponent(code.trim())
}

export const createBoardShareLink = async (boardId: number): Promise<ShareLinkResponse> => {
  const response = await httpClient.post<RawShareLinkResponse>(`/retro/boards/${boardId}/share-link`)
  return normalizeShareLinkResponse(response.data ?? {})
}

export const regenerateBoardShareLink = async (boardId: number): Promise<ShareLinkResponse> => {
  const response = await httpClient.post<RawShareLinkResponse>(
    `/retro/boards/${boardId}/share-link/regenerate`,
  )
  return normalizeShareLinkResponse(response.data ?? {})
}

export const revokeBoardShareLink = async (boardId: number): Promise<RevokeShareLinkResponse> => {
  const response = await httpClient.delete<Partial<RevokeShareLinkResponse>>(
    `/retro/boards/${boardId}/share-link`,
  )

  return {
    revoked: Boolean(response.data?.revoked),
  }
}

export const getInviteInfo = async (code: string): Promise<InviteInfoResponse> => {
  const normalizedCode = normalizeInviteCodeForRequest(code)
  const response = await httpClient.get<RawInviteInfoResponse>(`/team-invites/${normalizedCode}`)
  return normalizeInviteInfoResponse(response.data ?? {})
}

export const acceptTeamInvite = async (code: string): Promise<AcceptInviteResponse> => {
  const normalizedCode = normalizeInviteCodeForRequest(code)
  const response = await httpClient.post<RawAcceptInviteResponse>(
    `/team-invites/${normalizedCode}/accept`,
  )

  return normalizeAcceptInviteResponse(response.data ?? {})
}
