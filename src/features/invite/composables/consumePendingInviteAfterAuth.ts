import { getApiStatus } from '../api/errors'
import { acceptTeamInvite } from '../api/inviteClient'
import { clearPendingInvite, readPendingInvite } from '../storage/pendingInvite'

export type ConsumePendingInviteResult =
  | { status: 'none' }
  | { status: 'accepted'; redirectPath: string; alreadyMember: boolean }
  | { status: 'invalid' }
  | { status: 'unauthorized' }
  | { status: 'error' }

export const consumePendingInviteAfterAuth = async (): Promise<ConsumePendingInviteResult> => {
  const pendingInvite = readPendingInvite()
  if (!pendingInvite) {
    return { status: 'none' }
  }

  try {
    const response = await acceptTeamInvite(pendingInvite.code)
    clearPendingInvite()
    return {
      status: 'accepted',
      redirectPath: response.redirectPath,
      alreadyMember: response.alreadyMember,
    }
  } catch (error) {
    const status = getApiStatus(error)

    if (status === 401) {
      return { status: 'unauthorized' }
    }

    clearPendingInvite()

    if (status === 404) {
      return { status: 'invalid' }
    }

    console.error('[invite] failed to consume pending invite after auth', error)
    return { status: 'error' }
  }
}
