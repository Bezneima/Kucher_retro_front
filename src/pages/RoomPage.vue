<template>
  <main class="room-page">
    <GlobalHeader
      :user-name="userName"
      :center-title="boardTitle"
      :can-edit-center-title="canEditBoardName"
      full-width
      @profile="openProfile"
      @logout="logout"
      @edit-center-title="openBoardNameEditModal"
    />
    <BoardSettingsComponent />

    <section class="room-content">
      <div class="columns">
        <Loader v-if="retroStore.getIsBoardLoading" />
        <RetroBoardComponent v-else />
      </div>
    </section>

    <TextEditModal
      :is-open="isBoardNameEditModalOpen"
      :value="boardTitle"
      :multiline="false"
      title="Изменить название доски"
      placeholder="Введите название доски"
      confirm-text="Сохранить"
      cancel-text="Отмена"
      @close="closeBoardNameEditModal"
      @confirm="submitBoardNameEdit"
    />
  </main>
</template>

<style scoped>
.room-page {
  --teams-page-padding: 20px;
  min-height: 100%;
  box-sizing: border-box;
  padding: var(--teams-page-padding);
  background: linear-gradient(140deg, #f6f8fd 0%, #ecf3ff 45%, #f7fafd 100%);
  display: flex;
  flex-direction: column;
}

.room-content {
  width: calc(100% + (var(--teams-page-padding) * 2));
  margin-left: calc(var(--teams-page-padding) * -1);
  margin-right: calc(var(--teams-page-padding) * -1);
  flex: 1;
  min-height: 0;
  display: flex;
}

.columns {
  width: 100%;
  flex: 1;
  min-height: 0;
}

:deep(.columns > .loader-wrap),
:deep(.columns > .board) {
  height: 100%;
}

:deep(.teams-top-strip) {
  margin-bottom: 0;
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { clearAuthSession } from '@/auth/session'
import TextEditModal from '@/components/common/TextEditModal/TextEditModal.vue'
import GlobalHeader from '@/components/teams/GlobalHeader.vue'
import BoardSettingsComponent from '@/components/retro/BoardSettingsComponent/BoardSettingsComponent.vue'
import RetroBoardComponent from '../components/retro/RetroBoardComponent/RetroBoardComponent.vue'
import Loader from '../components/common/Loader/Loader.vue'
import { useRetroStore } from '../stores/RetroStore'

const retroStore = useRetroStore()
const route = useRoute()
const router = useRouter()
const userName = computed(() => retroStore.getCurrentUserName || 'Пользователь')
const boardTitle = computed(() => retroStore.getBoard[0]?.name ?? '')
const currentBoardId = computed(() => retroStore.getBoard[0]?.id ?? null)
const currentUserRole = computed(() => retroStore.getCurrentUserTeamRole)
const canEditBoardName = computed(() => {
  return currentUserRole.value === 'OWNER' || currentUserRole.value === 'ADMIN'
})
const isBoardNameEditModalOpen = ref(false)
const isBoardNameUpdating = ref(false)

const openProfile = async () => {
  await router.push({ name: 'profile' })
}

const logout = async () => {
  retroStore.clearCurrentUser()
  clearAuthSession()
  await router.replace({ name: 'auth' })
}

const openBoardNameEditModal = () => {
  if (!canEditBoardName.value || !boardTitle.value) {
    return
  }

  isBoardNameEditModalOpen.value = true
}

const closeBoardNameEditModal = () => {
  isBoardNameEditModalOpen.value = false
}

const submitBoardNameEdit = async (nextBoardName: string) => {
  const boardId = currentBoardId.value
  const normalizedName = nextBoardName.trim()
  const currentName = boardTitle.value.trim()

  if (!boardId || !normalizedName || normalizedName === currentName || isBoardNameUpdating.value) {
    closeBoardNameEditModal()
    return
  }

  isBoardNameUpdating.value = true
  try {
    await retroStore.updateBoardName(boardId, normalizedName)
    closeBoardNameEditModal()
  } catch (error) {
    console.error('[room] failed to rename board', error)
  } finally {
    isBoardNameUpdating.value = false
  }
}

const loadBoardFromRoute = () => {
  const routeBoardId = Number(route.params.id)

  if (Number.isFinite(routeBoardId) && routeBoardId > 0) {
    void retroStore.loadBoardById(routeBoardId)
  }
}

watch(() => route.params.id, loadBoardFromRoute, { immediate: true })
</script>
