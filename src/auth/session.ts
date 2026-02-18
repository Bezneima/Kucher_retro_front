const ACCESS_TOKEN_STORAGE_KEY = 'retro.accessToken'
const REFRESH_TOKEN_STORAGE_KEY = 'retro.refreshToken'
const USER_NAME_STORAGE_KEY = 'retro.userName'

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

export const setAuthSession = (params: {
  accessToken: string
  refreshToken?: string
  userName?: string
}) => {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, params.accessToken)

  if (params.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, params.refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  }

  if (params.userName) {
    localStorage.setItem(USER_NAME_STORAGE_KEY, params.userName)
  } else {
    localStorage.removeItem(USER_NAME_STORAGE_KEY)
  }
}

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_NAME_STORAGE_KEY)
}
