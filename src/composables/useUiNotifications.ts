import { onBeforeUnmount, ref } from 'vue'
import type { UiNotification, UiNotificationKind } from '@/features/teams/types'

export const useUiNotifications = () => {
  const notifications = ref<UiNotification[]>([])
  const notificationTimers = new Map<number, number>()
  let notificationIdCounter = 0

  const dismissNotification = (notificationId: number) => {
    const timerId = notificationTimers.get(notificationId)
    if (timerId) {
      window.clearTimeout(timerId)
      notificationTimers.delete(notificationId)
    }

    notifications.value = notifications.value.filter((notification) => notification.id !== notificationId)
  }

  const pushNotification = (
    kind: UiNotificationKind,
    title: string,
    description?: string,
    ttlMs = 4200,
  ) => {
    notificationIdCounter += 1
    const notificationId = notificationIdCounter

    notifications.value = [
      { id: notificationId, kind, title, description },
      ...notifications.value,
    ]

    if (typeof window !== 'undefined') {
      const timerId = window.setTimeout(() => {
        dismissNotification(notificationId)
      }, ttlMs)
      notificationTimers.set(notificationId, timerId)
    }
  }

  onBeforeUnmount(() => {
    for (const timerId of notificationTimers.values()) {
      window.clearTimeout(timerId)
    }
    notificationTimers.clear()
  })

  return {
    notifications,
    pushNotification,
    dismissNotification,
  }
}
