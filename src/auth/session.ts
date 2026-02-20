const ACCESS_TOKEN_STORAGE_KEY = 'retro.accessToken'
const REFRESH_TOKEN_STORAGE_KEY = 'retro.refreshToken'
const USER_NAME_STORAGE_KEY = 'retro.userName'
const USER_EMAIL_STORAGE_KEY = 'retro.email'

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
}

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

export const setAuthSession = (params: {
  accessToken: string
  refreshToken?: string
  user?: {
    name?: string
    email?: string
  }
}) => {
  localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, params.accessToken)

  if (params.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, params.refreshToken)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  }

  if (params.user?.name) {
    localStorage.setItem(USER_NAME_STORAGE_KEY, params.user.name)
  } else {
    localStorage.removeItem(USER_NAME_STORAGE_KEY)
  }

  if (params.user?.email) {
    localStorage.setItem(USER_EMAIL_STORAGE_KEY, params.user.email)
  } else {
    localStorage.removeItem(USER_EMAIL_STORAGE_KEY)
  }
}

export const setAuthTokens = (params: {
  accessToken: string
  refreshToken?: string
}) => {
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
  localStorage.removeItem(USER_NAME_STORAGE_KEY)
  localStorage.removeItem(USER_EMAIL_STORAGE_KEY)
}

export const getUserName = () => {
  return localStorage.getItem(USER_NAME_STORAGE_KEY) ?? localStorage.getItem(USER_EMAIL_STORAGE_KEY)
}
