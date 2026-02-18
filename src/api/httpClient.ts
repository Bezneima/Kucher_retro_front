import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearAuthSession, getAccessToken } from '@/auth/session'

const RETRO_API_BASE_URL = import.meta.env.VITE_RETRO_API_BASE_URL?.trim() ?? ''

export const httpClient = axios.create({
  baseURL: RETRO_API_BASE_URL,
  timeout: 15000,
})

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
    if (error.response?.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/auth') {
      clearAuthSession()
      window.location.assign('/auth')
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
