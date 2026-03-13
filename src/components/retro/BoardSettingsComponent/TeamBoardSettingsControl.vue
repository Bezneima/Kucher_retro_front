<template>
  <button
    type="button"
    class="board-action-button board-team-settings-trigger"
    :disabled="isTeamSettingsLoading || isTeamSettingsSaving || !teamId"
    aria-label="Настройки"
    title="Настройки"
    @click="openTeamSettingsModal"
  >
    <SvgIcon name="settings" class="board-team-settings-trigger__icon" />
  </button>

  <div
    v-if="isTeamSettingsModalOpen"
    class="board-team-settings-modal-overlay"
    @pointerdown="onTeamSettingsOverlayPointerDown"
    @pointerup="onTeamSettingsOverlayPointerUp"
  >
    <div class="board-team-settings-modal" role="dialog" aria-modal="true" aria-label="Настройки команды">
      <button
        class="board-team-settings-modal-close"
        type="button"
        :disabled="isTeamSettingsSaving || isBoardLikesSaving"
        @click="closeTeamSettingsModal"
      >
        ×
      </button>

      <h3 class="board-team-settings-modal-title">Настройки команды</h3>

      <div class="board-team-settings-field">
        <div class="board-team-settings-field-content">
          <p class="board-team-settings-field-title">Доступ анонимным пользователям</p>
          <p class="board-team-settings-field-description">
            Разрешить доступ к доске по прямой ссылке без авторизации.
          </p>
        </div>

        <label class="board-team-settings-switch">
          <input v-model="teamSettingsAnonymousAccessDraft" type="checkbox" :disabled="isTeamSettingsToggleDisabled" />
          <span class="board-team-settings-switch__slider" aria-hidden="true" />
        </label>
      </div>

      <div class="board-team-settings-field">
        <div class="board-team-settings-field-content">
          <p class="board-team-settings-field-title">Лайки карточек</p>
          <p class="board-team-settings-field-description">
            Управление отображением и доступностью лайков на доске.
          </p>
        </div>

        <button
          type="button"
          class="board-team-settings-like-toggle"
          :disabled="isBoardLikesToggleDisabled"
          @click="onBoardLikesToggleClick"
        >
          <SvgIcon :name="boardLikesButtonIcon" class="board-team-settings-like-toggle__icon" />
          <span>{{ boardLikesButtonLabel }}</span>
        </button>
      </div>

      <div class="board-team-settings-actions">
        <button
          type="button"
          class="board-team-settings-button"
          :disabled="isTeamSettingsSaving || isBoardLikesSaving"
          @click="closeTeamSettingsModal"
        >
          Cancel
        </button>
        <button
          type="button"
          class="board-team-settings-button board-team-settings-button--primary"
          :disabled="isTeamSettingsToggleDisabled || isBoardLikesSaving"
          @click="submitTeamSettingsModal"
        >
          {{ isTeamSettingsSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import { retroBoardService, type RetroBoardApiError } from '@/api/services/retroBoardService'
import { useBoardNotifications } from '@/composables/useBoardNotifications'
import { teamsApiClient, toTeamBoardsApiError } from '@/features/teams/api/teamBoardsClient'
import type { TeamSummary } from '@/features/teams/types'
import { useRetroStore } from '@/stores/RetroStore'

const props = defineProps<{
  teamId: number | null
  boardId: number | null
}>()

const retroStore = useRetroStore()
const currentTeamSettings = ref<TeamSummary | null>(null)
const isTeamSettingsLoading = ref(false)
const isTeamSettingsSaving = ref(false)
const isTeamSettingsModalOpen = ref(false)
const teamSettingsAnonymousAccessDraft = ref(false)
const isTeamSettingsOverlayPointerDown = ref(false)
const isBoardLikesSaving = ref(false)
const isBoardLikesLocked = ref(false)
const { pushNotification } = useBoardNotifications()
let teamSettingsRequestId = 0

const currentShowLikes = computed(() => retroStore.getIsBoardLikesVisible)

const boardLikesButtonLabel = computed(() => {
  return currentShowLikes.value ? 'Выключить лайки' : 'Включить лайки'
})

const boardLikesButtonIcon = computed(() => {
  return currentShowLikes.value ? 'filledLike' : 'like'
})

const isTeamSettingsToggleDisabled = computed(() => {
  return isTeamSettingsLoading.value || isTeamSettingsSaving.value || !props.teamId
})

const isBoardLikesToggleDisabled = computed(() => {
  return (
    isBoardLikesSaving.value ||
    isTeamSettingsSaving.value ||
    isTeamSettingsLoading.value ||
    isBoardLikesLocked.value ||
    !props.boardId
  )
})

const resetLocalState = () => {
  currentTeamSettings.value = null
  isTeamSettingsModalOpen.value = false
  isTeamSettingsOverlayPointerDown.value = false
  teamSettingsAnonymousAccessDraft.value = false
  isBoardLikesLocked.value = false
}

const loadCurrentTeamSettings = async (teamId: number, notifyOnError = false) => {
  const requestId = ++teamSettingsRequestId
  isTeamSettingsLoading.value = true

  try {
    const teams = await teamsApiClient.getTeams()
    if (requestId !== teamSettingsRequestId) {
      return false
    }

    currentTeamSettings.value = teams.find((team) => team.id === teamId) ?? null
    return Boolean(currentTeamSettings.value)
  } catch (error) {
    if (requestId !== teamSettingsRequestId) {
      return false
    }

    currentTeamSettings.value = null
    if (notifyOnError) {
      const apiError = toTeamBoardsApiError(error, 'Не удалось загрузить настройки команды')
      pushNotification('error', 'Ошибка API', apiError.message)
    }
    return false
  } finally {
    if (requestId === teamSettingsRequestId) {
      isTeamSettingsLoading.value = false
    }
  }
}

const openTeamSettingsModal = async () => {
  if (isTeamSettingsSaving.value || isBoardLikesSaving.value || !props.teamId) {
    return
  }

  if (!currentTeamSettings.value || currentTeamSettings.value.id !== props.teamId) {
    const isLoaded = await loadCurrentTeamSettings(props.teamId, true)
    if (!isLoaded || !currentTeamSettings.value || currentTeamSettings.value.id !== props.teamId) {
      return
    }
  }

  teamSettingsAnonymousAccessDraft.value = currentTeamSettings.value.isAnonymousBoardAccessEnabled
  isTeamSettingsModalOpen.value = true
}

const closeTeamSettingsModal = () => {
  if (isTeamSettingsSaving.value || isBoardLikesSaving.value) {
    return
  }

  isTeamSettingsModalOpen.value = false
  isTeamSettingsOverlayPointerDown.value = false
}

const onTeamSettingsOverlayPointerDown = (event: PointerEvent) => {
  const isPrimaryPointer = event.pointerType !== 'mouse' || event.button === 0
  isTeamSettingsOverlayPointerDown.value = event.target === event.currentTarget && isPrimaryPointer
}

const onTeamSettingsOverlayPointerUp = (event: PointerEvent) => {
  const shouldClose =
    isTeamSettingsOverlayPointerDown.value &&
    event.target === event.currentTarget &&
    !isTeamSettingsSaving.value &&
    !isBoardLikesSaving.value
  isTeamSettingsOverlayPointerDown.value = false

  if (!shouldClose) {
    return
  }

  closeTeamSettingsModal()
}

const submitTeamSettingsModal = async () => {
  if (
    isTeamSettingsSaving.value ||
    isBoardLikesSaving.value ||
    isTeamSettingsLoading.value ||
    !props.teamId ||
    !currentTeamSettings.value
  ) {
    return
  }

  const currentValue = currentTeamSettings.value.isAnonymousBoardAccessEnabled
  const nextValue = teamSettingsAnonymousAccessDraft.value === true

  if (nextValue === currentValue) {
    closeTeamSettingsModal()
    return
  }

  isTeamSettingsSaving.value = true
  try {
    const response = await teamsApiClient.updateTeamAnonymousBoardAccess(props.teamId, {
      isAnonymousBoardAccessEnabled: nextValue,
    })

    currentTeamSettings.value = {
      ...currentTeamSettings.value,
      isAnonymousBoardAccessEnabled: response.isAnonymousBoardAccessEnabled,
    }
    teamSettingsAnonymousAccessDraft.value = response.isAnonymousBoardAccessEnabled
    isTeamSettingsModalOpen.value = false
    isTeamSettingsOverlayPointerDown.value = false
    pushNotification('success', 'Settings updated')
  } catch (error) {
    const apiError = toTeamBoardsApiError(error, 'Не удалось обновить настройки анонимного доступа')
    pushNotification('error', 'Ошибка API', apiError.message)
  } finally {
    isTeamSettingsSaving.value = false
  }
}

const toBoardApiError = (error: unknown): RetroBoardApiError => {
  if (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as RetroBoardApiError).message === 'string'
  ) {
    return error as RetroBoardApiError
  }

  return {
    message: 'Не удалось обновить настройки доски',
  }
}

const onBoardLikesToggleClick = async () => {
  if (isBoardLikesToggleDisabled.value || !props.boardId) {
    return
  }

  const nextShowLikes = !currentShowLikes.value
  isBoardLikesSaving.value = true

  try {
    const response = await retroBoardService.updateBoardSettings(props.boardId, {
      showLikes: nextShowLikes,
    })

    retroStore.applyBoardSettingsFromPayload(response)
    pushNotification('success', nextShowLikes ? 'Лайки включены' : 'Лайки выключены')
  } catch (error) {
    const apiError = toBoardApiError(error)
    if (apiError.status === 403) {
      isBoardLikesLocked.value = true
      pushNotification('error', 'Недостаточно прав', 'Изменение режима лайков недоступно для вашей роли')
      return
    }

    pushNotification('error', 'Ошибка API', apiError.message)
  } finally {
    isBoardLikesSaving.value = false
  }
}

watch(
  () => props.teamId,
  (teamId) => {
    if (!teamId) {
      resetLocalState()
      return
    }

    void loadCurrentTeamSettings(teamId)
  },
  { immediate: true },
)

watch(
  () => props.boardId,
  () => {
    isBoardLikesLocked.value = false
  },
)
</script>

<style scoped>
.board-team-settings-trigger {
  appearance: none;
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  background: #fff;
  color: #2f3647;
  justify-content: center;
  align-items: center;
  display: inline-flex;
  width: 36px;
  min-width: 36px;
  padding: 0;
  cursor: pointer;
}

.board-team-settings-trigger__icon {
  width: 18px;
  height: 18px;
  color: currentColor;
}

.board-team-settings-trigger:hover {
  border-color: #8ab4ff;
  color: #204380;
}

.board-team-settings-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  color: #7c8699;
}

.board-team-settings-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(17, 30, 54, 0.52);
}

.board-team-settings-modal {
  width: min(560px, 100%);
  border: 1px solid #d5e0f0;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
  box-sizing: border-box;
  position: relative;
  display: grid;
  gap: 14px;
}

.board-team-settings-modal-close {
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

.board-team-settings-modal-close:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-team-settings-modal-title {
  margin: 0;
  padding-right: 32px;
  font-size: 20px;
}

.board-team-settings-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #d6e2f3;
  border-radius: 10px;
  background: #f5f9ff;
  padding: 10px 12px;
}

.board-team-settings-field-content {
  display: grid;
  gap: 4px;
}

.board-team-settings-field-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #263249;
}

.board-team-settings-field-description {
  margin: 0;
  font-size: 12px;
  color: #465a7b;
}

.board-team-settings-switch {
  position: relative;
  display: inline-flex;
  width: 46px;
  height: 26px;
  flex-shrink: 0;
}

.board-team-settings-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.board-team-settings-switch__slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #c6d3e6;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.board-team-settings-switch__slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s ease;
}

.board-team-settings-switch input:checked + .board-team-settings-switch__slider {
  background: #1e88e5;
}

.board-team-settings-switch input:checked + .board-team-settings-switch__slider::before {
  transform: translateX(20px);
}

.board-team-settings-switch input:disabled + .board-team-settings-switch__slider {
  opacity: 0.6;
  cursor: not-allowed;
}

.board-team-settings-like-toggle {
  border: 1px solid #ccdaef;
  border-radius: 8px;
  padding: 8px 12px;
  background: #fff;
  color: #1f2f49;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.board-team-settings-like-toggle__icon {
  width: 14px;
  height: 14px;
  color: currentColor;
}

.board-team-settings-like-toggle:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-team-settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.board-team-settings-button {
  border: 1px solid #ccdaef;
  border-radius: 8px;
  padding: 9px 12px;
  background: #fff;
  color: #1f2f49;
  font-weight: 500;
  cursor: pointer;
}

.board-team-settings-button--primary {
  background: #1e88e5;
  border-color: #1e88e5;
  color: #fff;
}

.board-team-settings-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .board-team-settings-modal-title {
    font-size: 18px;
  }

  .board-team-settings-field {
    align-items: flex-start;
  }
}
</style>
