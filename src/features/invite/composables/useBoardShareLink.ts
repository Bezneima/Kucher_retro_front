import { computed, ref, unref, type MaybeRef } from 'vue'
import { getApiStatus } from '../api/errors'
import {
  createBoardShareLink,
  regenerateBoardShareLink,
  revokeBoardShareLink,
} from '../api/inviteClient'
import type { ShareLinkResponse } from '../types'

type ShareLinkErrorCode = 'forbidden' | 'network' | null

const resolveBoardId = (boardId: MaybeRef<number | null | undefined>) => {
  const normalizedBoardId = Number(unref(boardId))
  return Number.isInteger(normalizedBoardId) && normalizedBoardId > 0
    ? normalizedBoardId
    : null
}

const copyTextFallback = (text: string) => {
  if (typeof document === 'undefined') {
    return false
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  textarea.style.left = '-9999px'

  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, text.length)

  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}

export const useBoardShareLink = (boardId: MaybeRef<number | null | undefined>) => {
  const shareLink = ref<ShareLinkResponse | null>(null)
  const isModalOpen = ref(false)
  const isLoading = ref(false)
  const isRegenerating = ref(false)
  const isRevoking = ref(false)
  const wasRevoked = ref(false)
  const errorCode = ref<ShareLinkErrorCode>(null)

  const shareUrl = computed(() => shareLink.value?.shareUrl ?? '')
  const canRetry = computed(() => errorCode.value === 'network')
  const errorMessage = computed(() => {
    if (errorCode.value === 'forbidden') {
      return 'Недостаточно прав'
    }
    if (errorCode.value === 'network') {
      return 'Не удалось получить ссылку. Попробуйте снова.'
    }

    return ''
  })

  const resetError = () => {
    errorCode.value = null
  }

  const setErrorFromApi = (error: unknown) => {
    const status = getApiStatus(error)
    errorCode.value = status === 403 ? 'forbidden' : 'network'
  }

  const requestShareLink = async () => {
    const normalizedBoardId = resolveBoardId(boardId)
    if (!normalizedBoardId) {
      errorCode.value = 'network'
      return null
    }

    isLoading.value = true
    resetError()
    wasRevoked.value = false

    try {
      const payload = await createBoardShareLink(normalizedBoardId)
      shareLink.value = payload
      return payload
    } catch (error) {
      shareLink.value = null
      setErrorFromApi(error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  const openModal = async () => {
    isModalOpen.value = true
    await requestShareLink()
  }

  const closeModal = () => {
    isModalOpen.value = false
  }

  const regenerateShareLink = async () => {
    const normalizedBoardId = resolveBoardId(boardId)
    if (!normalizedBoardId) {
      errorCode.value = 'network'
      return null
    }

    isRegenerating.value = true
    resetError()
    wasRevoked.value = false

    try {
      const payload = await regenerateBoardShareLink(normalizedBoardId)
      shareLink.value = payload
      return payload
    } catch (error) {
      setErrorFromApi(error)
      return null
    } finally {
      isRegenerating.value = false
    }
  }

  const revokeShareLink = async () => {
    const normalizedBoardId = resolveBoardId(boardId)
    if (!normalizedBoardId) {
      errorCode.value = 'network'
      return false
    }

    isRevoking.value = true
    resetError()

    try {
      const payload = await revokeBoardShareLink(normalizedBoardId)
      if (!payload.revoked) {
        throw new Error('Share link was not revoked')
      }

      shareLink.value = null
      wasRevoked.value = true
      return true
    } catch (error) {
      setErrorFromApi(error)
      return false
    } finally {
      isRevoking.value = false
    }
  }

  const retry = async () => {
    await requestShareLink()
  }

  const copyShareLink = async () => {
    const nextShareUrl = shareUrl.value
    if (!nextShareUrl) {
      return false
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(nextShareUrl)
        return true
      }

      return copyTextFallback(nextShareUrl)
    } catch (error) {
      console.error('[invite] failed to copy share link', error)
      return copyTextFallback(nextShareUrl)
    }
  }

  return {
    shareLink,
    shareUrl,
    isModalOpen,
    isLoading,
    isRegenerating,
    isRevoking,
    wasRevoked,
    errorCode,
    errorMessage,
    canRetry,
    openModal,
    closeModal,
    retry,
    regenerateShareLink,
    revokeShareLink,
    copyShareLink,
  }
}
