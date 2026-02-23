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
      await navigator.clipboard.writeText(nextShareUrl)
      return true
    } catch (error) {
      console.error('[invite] failed to copy share link', error)
      return false
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
