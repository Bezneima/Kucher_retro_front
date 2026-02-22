const ACCESS_TOKEN_STORAGE_KEY = 'retro.accessToken'
const REFRESH_TOKEN_STORAGE_KEY = 'retro.refreshToken'

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

export const setAuthSession = (params: { accessToken: string; refreshToken?: string }) => {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, params.accessToken)

  if (params.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, params.refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  }
}

export const setAuthTokens = (params: { accessToken: string; refreshToken?: string }) => {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, params.accessToken)

  if (params.refreshToken !== undefined) {
    if (params.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, params.refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    }
  }
}

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
}
