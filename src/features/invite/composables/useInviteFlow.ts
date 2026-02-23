import { computed, ref, unref, type MaybeRef } from 'vue'
import { getApiStatus } from '../api/errors'
import { acceptTeamInvite, getInviteInfo } from '../api/inviteClient'
import type { AcceptInviteResponse, InviteInfoResponse } from '../types'

export type InviteFlowError = 'invalid' | 'unauthorized' | 'network' | null

const resolveInviteCode = (code: MaybeRef<string | null | undefined>) => {
  const rawCode = unref(code)
  const normalized = typeof rawCode === 'string' ? rawCode.trim() : ''
  return normalized || ''
}

export const useInviteFlow = (code: MaybeRef<string | null | undefined>) => {
  const inviteInfo = ref<InviteInfoResponse | null>(null)
  const isChecking = ref(false)
  const isAccepting = ref(false)
  const checkError = ref<InviteFlowError>(null)
  const acceptError = ref<InviteFlowError>(null)

  const isInvalidInvite = computed(() => {
    return checkError.value === 'invalid' || acceptError.value === 'invalid'
  })

  const loadInviteInfo = async () => {
    const inviteCode = resolveInviteCode(code)
    if (!inviteCode) {
      checkError.value = 'invalid'
      inviteInfo.value = null
      return null
    }

    isChecking.value = true
    checkError.value = null

    try {
      const payload = await getInviteInfo(inviteCode)
      inviteInfo.value = payload
      return payload
    } catch (error) {
      inviteInfo.value = null
      const status = getApiStatus(error)
      checkError.value = status === 404 ? 'invalid' : 'network'
      return null
    } finally {
      isChecking.value = false
    }
  }

  const acceptInvite = async () => {
    const inviteCode = resolveInviteCode(code)
    if (!inviteCode) {
      acceptError.value = 'invalid'
      return null
    }

    isAccepting.value = true
    acceptError.value = null

    try {
      return await acceptTeamInvite(inviteCode)
    } catch (error) {
      const status = getApiStatus(error)
      if (status === 404) {
        acceptError.value = 'invalid'
      } else if (status === 401) {
        acceptError.value = 'unauthorized'
      } else {
        acceptError.value = 'network'
      }

      return null
    } finally {
      isAccepting.value = false
    }
  }

  return {
    inviteInfo,
    isChecking,
    isAccepting,
    checkError,
    acceptError,
    isInvalidInvite,
    loadInviteInfo,
    acceptInvite,
  }
}

export type InviteFlowComposable = ReturnType<typeof useInviteFlow>
export type AcceptInviteResult = AcceptInviteResponse
