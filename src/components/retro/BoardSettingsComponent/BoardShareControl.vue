<template>
  <NotificationStack
    :notifications="notifications"
    @dismiss="dismissNotification"
  />

  <button
    v-if="canShareBoard"
    type="button"
    class="board-share-trigger"
    title="Поделиться доской"
    @click="onShareButtonClick"
  >
    <span>Поделиться</span>
    <SvgIcon name="share" class="board-share-trigger__icon" />
  </button>

  <div
    v-if="boardShareLink.isModalOpen.value"
    class="board-share-modal-overlay"
    @click.self="onCloseShareModal"
  >
    <div class="board-share-modal" role="dialog" aria-modal="true" aria-label="Поделиться доской">
      <button
        class="board-share-modal-close"
        type="button"
        :disabled="isShareActionPending"
        @click="onCloseShareModal"
      >
        ×
      </button>

      <h3 class="board-share-modal-title">Поделиться доской</h3>

      <div v-if="boardShareLink.isLoading.value" class="board-share-state">
        Получаем ссылку...
      </div>

      <div v-else-if="boardShareLink.errorMessage.value" class="board-share-state board-share-state--error">
        <p>{{ boardShareLink.errorMessage.value }}</p>
        <button
          v-if="boardShareLink.canRetry.value"
          class="board-share-secondary-button"
          type="button"
          :disabled="isShareActionPending"
          @click="onRetryShareLink"
        >
          Попробовать снова
        </button>
      </div>

      <div v-else-if="boardShareLink.wasRevoked.value" class="board-share-state">
        <p>Ссылка отозвана.</p>
        <button
          class="board-share-secondary-button"
          type="button"
          :disabled="isShareActionPending"
          @click="onRetryShareLink"
        >
          Создать новую ссылку
        </button>
      </div>

      <div v-else class="board-share-content">
        <label class="board-share-label" for="board-share-link-input">Ссылка для приглашения</label>
        <input
          id="board-share-link-input"
          class="board-share-input"
          type="text"
          readonly
          :value="boardShareLink.shareUrl.value"
        />

        <div class="board-share-actions">
          <button
            class="board-share-primary-button"
            type="button"
            :disabled="isShareActionPending || !boardShareLink.shareUrl.value"
            @click="onCopyShareLink"
          >
            Скопировать ссылку
          </button>
          <button
            class="board-share-secondary-button"
            type="button"
            :disabled="isShareActionPending"
            @click="onRegenerateShareLink"
          >
            {{ boardShareLink.isRegenerating.value ? 'Обновление...' : 'Обновить ссылку' }}
          </button>
          <button
            class="board-share-danger-button"
            type="button"
            :disabled="isShareActionPending"
            @click="onRevokeShareLink"
          >
            {{ boardShareLink.isRevoking.value ? 'Отзыв...' : 'Отозвать ссылку' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRetroStore } from '@/stores/RetroStore'
import { useUiNotifications } from '@/composables/useUiNotifications'
import NotificationStack from '@/components/teams/NotificationStack.vue'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import { useBoardShareLink } from '@/features/invite/composables/useBoardShareLink'

const retroStore = useRetroStore()
const { notifications, pushNotification, dismissNotification } = useUiNotifications()

const currentBoardId = computed(() => retroStore.getBoard[0]?.id ?? null)
const canShareBoard = computed(() => {
  const canManageBoard =
    retroStore.getCurrentUserTeamRole === 'OWNER' || retroStore.getCurrentUserTeamRole === 'ADMIN'
  return canManageBoard && Boolean(currentBoardId.value)
})

const boardShareLink = useBoardShareLink(currentBoardId)
const isShareActionPending = computed(() => {
  return (
    boardShareLink.isLoading.value ||
    boardShareLink.isRegenerating.value ||
    boardShareLink.isRevoking.value
  )
})

const onShareButtonClick = () => {
  if (!canShareBoard.value) {
    return
  }

  void boardShareLink.openModal()
}

const onCloseShareModal = () => {
  if (isShareActionPending.value) {
    return
  }

  boardShareLink.closeModal()
}

const onRetryShareLink = () => {
  void boardShareLink.retry()
}

const onCopyShareLink = async () => {
  const isCopied = await boardShareLink.copyShareLink()
  if (isCopied) {
    pushNotification('success', 'Ссылка скопирована')
    return
  }

  pushNotification('error', 'Не удалось скопировать ссылку')
}

const onRegenerateShareLink = async () => {
  const nextShareLink = await boardShareLink.regenerateShareLink()
  if (nextShareLink) {
    pushNotification('success', 'Ссылка обновлена')
  }
}

const onRevokeShareLink = async () => {
  const isRevoked = await boardShareLink.revokeShareLink()
  if (isRevoked) {
    pushNotification('info', 'Ссылка отозвана')
  }
}
</script>

<style scoped>
.board-share-trigger {
  height: 36px;
  border: 1px solid #1e88e5;
  border-radius: 8px;
  background: #1e88e5;
  color: #fff;
  padding: 0 9px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.board-share-trigger:hover {
  border-color: #1565c0;
  background: #1565c0;
}

.board-share-trigger__icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.board-share-modal-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 1100;
  padding: 16px;
  background: rgba(17, 30, 54, 0.52);
}

.board-share-modal {
  width: min(560px, 100%);
  border: 1px solid #d5e0f0;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
  box-sizing: border-box;
  position: relative;
  display: grid;
  gap: 12px;
}

.board-share-modal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: #eff5ff;
  color: #1a4f8d;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.board-share-modal-close:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-share-modal-title {
  margin: 0;
  font-size: 20px;
  padding-right: 32px;
}

.board-share-state {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d6e2f3;
  background: #f5f9ff;
  color: #2c3f5f;
  display: grid;
  gap: 10px;
}

.board-share-state p {
  margin: 0;
}

.board-share-state--error {
  border-color: #efc3c3;
  background: #fff5f5;
  color: #7b2b2b;
}

.board-share-content {
  display: grid;
  gap: 10px;
}

.board-share-label {
  font-size: 13px;
  color: #3d4e68;
}

.board-share-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cfdbed;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
  color: #263249;
}

.board-share-input:focus {
  outline: none;
  border-color: #78a7e8;
  box-shadow: 0 0 0 3px rgba(120, 167, 232, 0.2);
}

.board-share-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.board-share-primary-button,
.board-share-secondary-button,
.board-share-danger-button {
  border: 1px solid #ccdaef;
  border-radius: 8px;
  padding: 9px 12px;
  background: #fff;
  color: #1f2f49;
  font-weight: 500;
  cursor: pointer;
}

.board-share-primary-button {
  background: #1e88e5;
  border-color: #1e88e5;
  color: #fff;
}

.board-share-danger-button {
  border-color: #e3b7b7;
  color: #8c2c2c;
}

.board-share-primary-button:disabled,
.board-share-secondary-button:disabled,
.board-share-danger-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
