import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'
import { getAccessToken } from '@/auth/session'
import type { TRetroBoardState } from '../types'

type TCurrentUserPayload = {
  id?: unknown
  email?: unknown
  name?: unknown
}

type TCurrentUserActionsContext = TRetroBoardState & {
  setCurrentUser: (payload?: TCurrentUserPayload | null) => void
}

let currentUserRequest: Promise<void> | null = null

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  return normalized ? normalized : null
}

const hasOwn = (payload: object, key: keyof TCurrentUserPayload) => {
  return Object.prototype.hasOwnProperty.call(payload, key)
}

const hasCurrentUserProfile = (state: Pick<TRetroBoardState, 'currentUser'>) => {
  return Boolean(state.currentUser.id && state.currentUser.email)
}

const requestCurrentUser = async (context: TCurrentUserActionsContext) => {
  try {
    const response = await httpClient.get<TCurrentUserPayload>('/me')
    context.setCurrentUser(response.data ?? {})
    return
  } catch (error) {
    const status = error instanceof AxiosError ? error.response?.status : undefined

    if (status === 404) {
      const fallbackResponse = await httpClient.get<TCurrentUserPayload>('/auth/me')
      context.setCurrentUser(fallbackResponse.data ?? {})
      return
    }

    throw error
  }
}

export const currentUserActions = {
  setCurrentUser(this: TRetroBoardState, payload?: TCurrentUserPayload | null) {
    if (!payload) return

    this.currentUser = {
      id:
        typeof payload === 'object' && hasOwn(payload, 'id')
          ? normalizeNullableString(payload.id)
          : this.currentUser.id,
      email:
        typeof payload === 'object' && hasOwn(payload, 'email')
          ? normalizeNullableString(payload.email)
          : this.currentUser.email,
      name:
        typeof payload === 'object' && hasOwn(payload, 'name')
          ? normalizeNullableString(payload.name)
          : this.currentUser.name,
    }
  },
  clearCurrentUser(this: TRetroBoardState) {
    this.currentUser = {
      id: null,
      email: null,
      name: null,
    }
  },
  async ensureCurrentUserLoaded(this: TCurrentUserActionsContext) {
    if (!getAccessToken() || hasCurrentUserProfile(this)) return

    if (currentUserRequest) {
      return currentUserRequest
    }

    currentUserRequest = requestCurrentUser(this)
      .catch((error) => {
        console.error('[auth] failed to load current user profile', error)
      })
      .finally(() => {
        currentUserRequest = null
      })

    await currentUserRequest
  },
}
