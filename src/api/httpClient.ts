import axios, { AxiosError, AxiosHeaders } from 'axios'

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

  config.headers = headers
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
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

