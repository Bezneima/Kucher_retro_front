import type { PendingInvitePayload } from '../types'

export const PENDING_INVITE_STORAGE_KEY = 'retro.pendingInvite'
const PENDING_INVITE_VERSION = 1

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

const normalizePendingInvitePayload = (payload: unknown): PendingInvitePayload | null => {
  if (!isRecord(payload)) {
    return null
  }

  const v = Number(payload.v)
  if (v !== PENDING_INVITE_VERSION) {
    return null
  }

  const code = asString(payload.code)
  const source = asString(payload.source)
  const createdAt = asString(payload.createdAt)
  if (!code || source !== 'invite' || !createdAt) {
    return null
  }

  return {
    v: PENDING_INVITE_VERSION,
    code,
    source: 'invite',
    createdAt,
  }
}

export const readPendingInvite = (): PendingInvitePayload | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const rawPayload = localStorage.getItem(PENDING_INVITE_STORAGE_KEY)
  if (!rawPayload) {
    return null
  }

  try {
    const parsedPayload = JSON.parse(rawPayload)
    const normalized = normalizePendingInvitePayload(parsedPayload)
    if (!normalized) {
      localStorage.removeItem(PENDING_INVITE_STORAGE_KEY)
      return null
    }

    return normalized
  } catch (error) {
    console.error('[invite] failed to parse pending invite payload', error)
    localStorage.removeItem(PENDING_INVITE_STORAGE_KEY)
    return null
  }
}

export const savePendingInvite = (code: string): PendingInvitePayload => {
  const payload: PendingInvitePayload = {
    v: PENDING_INVITE_VERSION,
    code: code.trim(),
    source: 'invite',
    createdAt: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(payload))
  }

  return payload
}

export const clearPendingInvite = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PENDING_INVITE_STORAGE_KEY)
  }
}
