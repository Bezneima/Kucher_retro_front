<script setup lang="ts">
import type { UiNotification } from '@/features/teams/types'

defineProps<{
  notifications: UiNotification[]
}>()

const emit = defineEmits<{
  dismiss: [notificationId: number]
}>()
</script>

<template>
  <div class="notifications" aria-live="polite" aria-atomic="true">
    <article
      v-for="notification in notifications"
      :key="notification.id"
      class="notification"
      :class="`notification--${notification.kind}`"
    >
      <div class="notification-content">
        <p class="notification-title">{{ notification.title }}</p>
        <p v-if="notification.description" class="notification-description">
          {{ notification.description }}
        </p>
      </div>
      <button
        class="notification-close"
        type="button"
        aria-label="Закрыть уведомление"
        @click="emit('dismiss', notification.id)"
      >
        ×
      </button>
    </article>
  </div>
</template>

<style scoped>
.notifications {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 1300;
  width: min(360px, calc(100vw - 28px));
  display: grid;
  gap: 10px;
}

.notification {
  border-radius: 12px;
  border: 1px solid #d4deeb;
  background: #fff;
  box-shadow: 0 14px 32px rgba(16, 35, 64, 0.13);
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.notification--success {
  border-color: #79c9a5;
}

.notification--error {
  border-color: #e5a3a3;
}

.notification--info {
  border-color: #95b5e6;
}

.notification-content {
  min-width: 0;
}

.notification-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.notification-description {
  margin: 5px 0 0;
  font-size: 13px;
  color: #425472;
  line-height: 1.35;
}

.notification-close {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1px solid #d6e1ee;
  background: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}

@media (max-width: 768px) {
  .notifications {
    top: 10px;
    right: 10px;
    width: calc(100vw - 20px);
  }
}
</style>
