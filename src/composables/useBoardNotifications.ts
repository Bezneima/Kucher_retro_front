import { inject, provide, type Ref } from 'vue'
import type { UiNotification, UiNotificationKind } from '@/features/teams/types'
import { useUiNotifications } from './useUiNotifications'

export type BoardNotificationsApi = {
  notifications: Ref<UiNotification[]>
  pushNotification: (
    kind: UiNotificationKind,
    title: string,
    description?: string,
    ttlMs?: number,
  ) => void
  dismissNotification: (notificationId: number) => void
}

const boardNotificationsKey = Symbol('board-notifications')

export const provideBoardNotifications = (api: BoardNotificationsApi) => {
  provide(boardNotificationsKey, api)
}

export const useBoardNotifications = (): BoardNotificationsApi => {
  const injected = inject<BoardNotificationsApi | null>(boardNotificationsKey, null)
  if (injected) {
    return injected
  }

  return useUiNotifications()
}
