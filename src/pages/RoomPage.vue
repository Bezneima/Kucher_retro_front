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
    <WsConnectionStatus :access-token="accessToken" />
    <p v-if="realtimeSyncError" class="room-realtime-error">{{ realtimeSyncError }}</p>

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
      :is-submitting="isBoardNameUpdating"
      :error-message="boardNameUpdateError"
      title="Изменить название доски"
      placeholder="Введите название доски"
      :confirm-text="isBoardNameUpdating ? 'Сохранение...' : 'Сохранить'"
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

.room-realtime-error {
  margin: 8px 0 0;
  color: #b3261e;
  font-size: 13px;
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
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Socket } from 'socket.io-client'
import { clearAuthSession, getAccessToken } from '@/auth/session'
import TextEditModal from '@/components/common/TextEditModal/TextEditModal.vue'
import GlobalHeader from '@/components/teams/GlobalHeader.vue'
import BoardSettingsComponent from '@/components/retro/BoardSettingsComponent/BoardSettingsComponent.vue'
import WsConnectionStatus from '@/components/retro/WsConnectionStatus.vue'
import { bindRetroSocketListeners } from '@/shared/bindRetroSocketListeners'
import { connectSocket, joinBoard } from '@/shared/socket'
import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/ws.types'
import RetroBoardComponent from '../components/retro/RetroBoardComponent/RetroBoardComponent.vue'
import Loader from '../components/common/Loader/Loader.vue'
import { useRetroStore } from '../stores/RetroStore'

const retroStore = useRetroStore()
const route = useRoute()
const router = useRouter()
const accessToken = getAccessToken()
const userName = computed(() => retroStore.getCurrentUserName || 'Пользователь')
const boardTitle = computed(() => retroStore.getBoard[0]?.name ?? '')
const currentBoardId = computed(() => retroStore.getBoard[0]?.id ?? null)
const currentUserRole = computed(() => retroStore.getCurrentUserTeamRole)
const canEditBoardName = computed(() => {
  return currentUserRole.value === 'OWNER' || currentUserRole.value === 'ADMIN'
})
const isBoardNameEditModalOpen = ref(false)
const isBoardNameUpdating = ref(false)
const boardNameUpdateError = ref('')
const realtimeSyncError = ref('')
let boardSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let unsubscribeRetroListeners: (() => void) | null = null
let boardJoinRequestId = 0

const openProfile = async () => {
  await router.push({ name: 'profile' })
}

const logout = async () => {
  boardJoinRequestId += 1
  unsubscribeRetroListeners?.()
  unsubscribeRetroListeners = null
  boardSocket = null
  retroStore.clearCurrentUser()
  clearAuthSession()
  await router.replace({ name: 'auth' })
}

const openBoardNameEditModal = () => {
  if (!canEditBoardName.value || !boardTitle.value) {
    return
  }

  boardNameUpdateError.value = ''
  isBoardNameEditModalOpen.value = true
}

const closeBoardNameEditModal = () => {
  boardNameUpdateError.value = ''
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
  boardNameUpdateError.value = ''
  try {
    await retroStore.updateBoardName(boardId, normalizedName)
    closeBoardNameEditModal()
  } catch (error) {
    console.error('[room] failed to rename board', error)
    boardNameUpdateError.value =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось переименовать доску'
  } finally {
    isBoardNameUpdating.value = false
  }
}

const resolveRouteBoardId = () => {
  const routeBoardId = Number(route.params.id)
  return Number.isFinite(routeBoardId) && routeBoardId > 0 ? routeBoardId : null
}

const loadBoardFromRoute = (boardId: number | null) => {
  if (!boardId) {
    return
  }

  void retroStore.loadBoardById(boardId)
}

const unsubscribeBoardRealtimeEvents = () => {
  unsubscribeRetroListeners?.()
  unsubscribeRetroListeners = null
}

const subscribeBoardRealtime = async (boardId: number) => {
  const requestId = ++boardJoinRequestId
  realtimeSyncError.value = ''

  try {
    const socket = await connectSocket(accessToken)

    if (requestId !== boardJoinRequestId) {
      return
    }

    boardSocket = socket
    unsubscribeBoardRealtimeEvents()
    unsubscribeRetroListeners = bindRetroSocketListeners(socket, {
      onBoardRenamed: (payload) => {
        retroStore.applyRealtimeBoardRenamed(payload)
      },
      onBoardColumnsReordered: (payload) => {
        retroStore.applyRealtimeBoardColumnsReordered(payload)
      },
      onBoardItemsPositionsSynced: (payload) => {
        retroStore.applyRealtimeBoardItemsPositionsSynced(payload)
      },
      onColumnCreated: (payload) => {
        retroStore.applyRealtimeColumnCreated(payload)
      },
      onColumnNameUpdated: (payload) => {
        retroStore.applyRealtimeColumnNameUpdated(payload)
      },
      onColumnColorUpdated: (payload) => {
        retroStore.applyRealtimeColumnColorUpdated(payload)
      },
      onColumnDescriptionUpdated: (payload) => {
        retroStore.applyRealtimeColumnDescriptionUpdated(payload)
      },
      onColumnDeleted: (payload) => {
        retroStore.applyRealtimeColumnDeleted(payload)
      },
      onItemCreated: (payload) => {
        retroStore.applyRealtimeItemCreated(payload)
      },
      onItemDescriptionUpdated: (payload) => {
        retroStore.applyRealtimeItemDescriptionUpdated(payload)
      },
      onItemLikeToggled: (payload) => {
        retroStore.applyRealtimeItemLikeToggled(payload)
      },
      onItemColorUpdated: (payload) => {
        retroStore.applyRealtimeItemColorUpdated(payload)
      },
      onItemDeleted: (payload) => {
        retroStore.applyRealtimeItemDeleted(payload)
      },
      onItemCommentsFetched: (payload) => {
        retroStore.applyRealtimeItemCommentsFetched(payload)
      },
      onItemCommentCreated: (payload) => {
        retroStore.applyRealtimeItemCommentCreated(payload)
      },
      onItemCommentUpdated: (payload) => {
        retroStore.applyRealtimeItemCommentUpdated(payload)
      },
      onItemCommentDeleted: (payload) => {
        retroStore.applyRealtimeItemCommentDeleted(payload)
      },
      onTeamAllCardsVisibilityUpdated: (payload) => {
        retroStore.applyRealtimeTeamAllCardsVisibilityUpdated(payload)
      },
    })

    await joinBoard(boardId)
  } catch (error) {
    if (requestId !== boardJoinRequestId) {
      return
    }

    realtimeSyncError.value =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось подключить realtime синхронизацию'
  }
}

watch(
  () => route.params.id,
  () => {
    const boardId = resolveRouteBoardId()
    loadBoardFromRoute(boardId)

    if (!boardId) {
      boardJoinRequestId += 1
      unsubscribeBoardRealtimeEvents()
      boardSocket = null
      return
    }

    void subscribeBoardRealtime(boardId)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  boardJoinRequestId += 1
  unsubscribeBoardRealtimeEvents()
  boardSocket = null
})
</script>
