import type { Router } from 'vue-router'

const isAbsoluteUrl = (value: string) => {
  return /^https?:\/\//i.test(value)
}

const toRelativePath = (value: string) => {
  const normalized = value.trim()
  return normalized || '/teams'
}

export const navigateToInviteRedirectPath = async (
  router: Router,
  redirectPath: string,
) => {
  const normalizedPath = toRelativePath(redirectPath)
  if (isAbsoluteUrl(normalizedPath)) {
    window.location.assign(normalizedPath)
    return
  }

  await router.replace(normalizedPath)
}
