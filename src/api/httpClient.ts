import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearAuthSession, getAccessToken, getRefreshToken, setAuthTokens } from '@/auth/session'

const RETRO_API_BASE_URL = import.meta.env.VITE_RETRO_API_BASE_URL?.trim() ?? ''

export const httpClient = axios.create({
  baseURL: RETRO_API_BASE_URL,
  timeout: 15000,
})

let refreshRequest: Promise<string | null> | null = null

type RetriableRequestConfig = {
  _retry?: boolean
  url?: string
}

const shouldSkipRefresh = (url?: string) => {
  if (!url) {
    return false
  }

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/google/exchange')
  )
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshRequest) {
    return refreshRequest
  }

  refreshRequest = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      return null
    }

    const response = await axios.post(
      `${RETRO_API_BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
    )

    const nextAccessToken =
      typeof response.data?.accessToken === 'string' ? response.data.accessToken : null
    if (!nextAccessToken) {
      return null
    }

    setAuthTokens({
      accessToken: nextAccessToken,
      refreshToken: typeof response.data?.refreshToken === 'string' ? response.data.refreshToken : undefined,
    })

    return nextAccessToken
  })()

  try {
    return await refreshRequest
  } finally {
    refreshRequest = null
  }
}

httpClient.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers)

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (!headers.has('Authorization')) {
    const accessToken = getAccessToken()
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  config.headers = headers
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const requestConfig = error.config as (typeof error.config & RetriableRequestConfig) | undefined

    if (status === 401 && requestConfig && !requestConfig._retry && !shouldSkipRefresh(requestConfig.url)) {
      requestConfig._retry = true

      return refreshAccessToken()
        .then((token) => {
          if (!token) {
            throw error
          }

          const headers = AxiosHeaders.from(requestConfig.headers)
          headers.set('Authorization', `Bearer ${token}`)
          requestConfig.headers = headers

          return httpClient(requestConfig)
        })
        .catch((refreshError) => {
          if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
            clearAuthSession()
            window.location.assign('/auth')
          }

          return Promise.reject(refreshError)
        })
    }

    const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN'
    const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`

    console.error('[retro api] request failed', {
      method,
      url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    })

    return Promise.reject(error)
  },
)
