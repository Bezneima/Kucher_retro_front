<script setup lang="ts">
import { ref, watch } from 'vue'
import type { TeamSummary } from '@/features/teams/types'
import pencilIcon from '@/assets/icons/svg/pencil.svg'
import leaveIcon from '@/assets/icons/svg/leave.svg'
import usersIcon from '@/assets/icons/svg/users.svg'
import dashboardIcon from '@/assets/icons/svg/dashboard.svg'

const props = defineProps<{
  team: TeamSummary | null
  membersCount: number
  boardsCount: number
  canManage: boolean
  isRenaming: boolean
  isLeaving: boolean
}>()

const emit = defineEmits<{
  rename: [name: string]
  leave: []
}>()

const isRenameModalOpen = ref(false)
const nextTeamName = ref('')
const submittedTeamName = ref('')
const isOverlayPointerDown = ref(false)

const openRenameModal = () => {
  if (!props.team || !props.canManage) {
    return
  }

  nextTeamName.value = props.team.name
  submittedTeamName.value = ''
  isRenameModalOpen.value = true
}

const closeRenameModal = () => {
  if (props.isRenaming) {
    return
  }

  isRenameModalOpen.value = false
  submittedTeamName.value = ''
  isOverlayPointerDown.value = false
}

const onOverlayPointerDown = (event: PointerEvent) => {
  const isPrimaryPointer = event.pointerType !== 'mouse' || event.button === 0
  isOverlayPointerDown.value = event.target === event.currentTarget && isPrimaryPointer
}

const onOverlayPointerUp = (event: PointerEvent) => {
  const shouldClose =
    isOverlayPointerDown.value && event.target === event.currentTarget && !props.isRenaming

  isOverlayPointerDown.value = false

  if (!shouldClose) {
    return
  }

  closeRenameModal()
}

const submitRename = () => {
  if (!props.team || props.isRenaming) {
    return
  }

  const normalizedName = nextTeamName.value.trim()
  if (!normalizedName) {
    return
  }

  if (normalizedName === props.team.name) {
    isRenameModalOpen.value = false
    return
  }

  submittedTeamName.value = normalizedName
  emit('rename', normalizedName)
}

watch(
  () => props.team?.id,
  () => {
    nextTeamName.value = props.team?.name ?? ''
    submittedTeamName.value = ''
    if (!props.team) {
      isRenameModalOpen.value = false
    }
  },
)

watch([() => props.isRenaming, () => props.team?.name], ([isRenaming, teamName]) => {
  if (isRenaming || !submittedTeamName.value) {
    return
  }

  if (teamName === submittedTeamName.value) {
    isRenameModalOpen.value = false
    submittedTeamName.value = ''
  }
})

const submitLeaveTeam = () => {
  if (!props.team || props.isLeaving || props.isRenaming) {
    return
  }

  emit('leave')
}
</script>

<template>
  <section class="team-panel team-panel--team-name">
    <p class="team-panel-label">Команда</p>
    <div class="team-panel-main">
      <div v-if="team" class="team-panel-name-wrap">
        <p class="team-panel-name">{{ team.name }}</p>
        <button
          v-if="team && canManage"
          class="team-panel-edit"
          type="button"
          :disabled="isRenaming || isLeaving"
          aria-label="Переименовать команду"
          @click="openRenameModal"
        >
          <img
            class="team-panel-edit-icon"
            title="Переименовать команду"
            :src="pencilIcon"
            alt=""
          />
        </button>
        <span class="team-panel-meta">
          <img
            :src="usersIcon"
            title="Количество участников"
            alt="Количество участников"
            aria-hidden="true"
          />
          {{ membersCount }}
        </span>
        <span class="team-panel-meta">
          <img
            :src="dashboardIcon"
            title="Количество досок"
            alt="Количество досок"
            aria-hidden="true"
          />
          {{ boardsCount }}
        </span>
      </div>
      <span v-else class="team-panel-name-skeleton" aria-hidden="true" />
      <button
        v-if="team"
        class="team-panel-leave"
        type="button"
        title="Выйти из команды"
        :disabled="isLeaving || isRenaming"
        aria-label="Покинуть команду"
        @click="submitLeaveTeam"
      >
        <img class="team-panel-leave-icon" :src="leaveIcon" alt="Выйти из команды" />
      </button>
    </div>
  </section>

  <div
    v-if="isRenameModalOpen"
    class="team-modal-overlay"
    @pointerdown="onOverlayPointerDown"
    @pointerup="onOverlayPointerUp"
  >
    <div class="team-modal" role="dialog" aria-modal="true" aria-label="Переименовать команду">
      <button
        class="team-modal-close"
        type="button"
        :disabled="isRenaming"
        @click="closeRenameModal"
      >
        ×
      </button>

      <h3 class="team-modal-title">Переименовать команду</h3>

      <form class="team-modal-form" @submit.prevent="submitRename">
        <label class="team-form-label">
          <span>Новое название</span>
          <input
            v-model="nextTeamName"
            class="team-form-input"
            type="text"
            maxlength="120"
            placeholder="Введите название команды"
            :disabled="isRenaming"
          />
        </label>

        <button class="team-form-submit" type="submit" :disabled="isRenaming">
          {{ isRenaming ? 'Сохранение...' : 'Сохранить' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.team-panel {
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  padding: 14px;
  display: grid;
  gap: 4px;
  position: relative;
}

.team-panel--team-name {
  background: white;
}

.team-panel-label {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #5c7091;
}

.team-panel-main {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 28px;
}

.team-panel-name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
}

.team-panel-name {
  margin: 0;
  font-size: 20px;
  line-height: 1.25;
  font-weight: 600;
  color: #1b2f4b;
}

.team-panel-meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid #dce8f7;
  border-radius: 999px;
  color: #395173;
  font-size: 12px;
  font-weight: 600;
  background: #f8fbff;
  flex-shrink: 0;
}

.team-panel-meta img {
  width: 14px;
  height: 14px;
  display: block;
}

.team-panel-name-skeleton {
  display: block;
  width: min(280px, 100%);
  flex: 1 1 auto;
  height: 25px;
  border-radius: 7px;
  background: linear-gradient(110deg, #eaf1fb 30%, #f7faff 45%, #eaf1fb 60%);
  background-size: 220% 100%;
  animation: team-name-skeleton-pulse 1.2s ease-in-out infinite;
}

.team-panel-edit {
  padding: 0;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  line-height: 0;
}

.team-panel-edit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.team-panel-edit-icon {
  width: 16px;
  height: 16px;
  display: block;
}

.team-panel-leave {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  padding: 0;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  cursor: pointer;
  line-height: 0;
}

.team-panel-leave:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.team-panel-leave-icon {
  width: 22px;
  height: 22px;
  display: block;
}

.team-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 24, 46, 0.45);
  display: grid;
  place-items: center;
  z-index: 1200;
  padding: 16px;
}

.team-modal {
  width: min(500px, 100%);
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
  position: relative;
}

.team-modal-close {
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

.team-modal-close:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.team-modal-title {
  margin: 0 30px 14px 0;
  font-size: 18px;
}

.team-modal-form {
  display: grid;
  gap: 10px;
}

.team-form-label {
  display: grid;
  gap: 6px;
  color: #33445f;
  font-size: 13px;
}

.team-form-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cfdbec;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

.team-form-input:focus {
  outline: none;
  border-color: #79a8e4;
  box-shadow: 0 0 0 3px rgba(121, 168, 228, 0.2);
}

.team-form-submit {
  border: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.team-form-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@keyframes team-name-skeleton-pulse {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: 0 0;
  }
}
</style>
