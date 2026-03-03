const ANONYMOUS_ID_STORAGE_KEY = 'retro.anonymousId'

const normalizeStoredAnonymousId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

const createAnonymousId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  const randomPart = Math.random().toString(36).slice(2)
  return `anon-${Date.now()}-${randomPart}`
}

export const getAnonymousId = () => {
  return normalizeStoredAnonymousId(localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY))
}

export const getOrCreateAnonymousId = () => {
  const existing = getAnonymousId()
  if (existing) {
    return existing
  }

  const created = createAnonymousId()
  localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, created)
  return created
}
