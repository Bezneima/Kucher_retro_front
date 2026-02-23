import { AxiosError } from 'axios'

type ErrorWithMessagePayload = {
  message?: unknown
}

export const getApiStatus = (error: unknown): number | undefined => {
  return error instanceof AxiosError ? error.response?.status : undefined
}

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (!(error instanceof AxiosError)) {
    return fallbackMessage
  }

  const payload = error.response?.data as ErrorWithMessagePayload | undefined
  if (typeof payload?.message === 'string') {
    return payload.message
  }
  if (Array.isArray(payload?.message)) {
    const details = payload.message.filter((item): item is string => typeof item === 'string')
    if (details.length > 0) {
      return details.join(', ')
    }
  }

  return error.message || fallbackMessage
}
