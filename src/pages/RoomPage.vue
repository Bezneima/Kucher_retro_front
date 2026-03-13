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
    <NotificationStack
      :notifications="notifications"
      @dismiss="dismissNotification"
    />
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
import { AxiosError } from 'axios'
import type { Socket } from 'socket.io-client'
import { clearAuthSession, getAccessToken } from '@/auth/session'
import TextEditModal from '@/components/common/TextEditModal/TextEditModal.vue'
import GlobalHeader from '@/components/teams/GlobalHeader.vue'
import BoardSettingsComponent from '@/components/retro/BoardSettingsComponent/BoardSettingsComponent.vue'
import WsConnectionStatus from '@/components/retro/WsConnectionStatus.vue'
import NotificationStack from '@/components/teams/NotificationStack.vue'
import { bindRetroSocketListeners } from '@/shared/bindRetroSocketListeners'
import { connectSocket, joinBoard } from '@/shared/socket'
import type { ClientToServerEvents, ServerToClientEvents } from '@/shared/ws.types'
import { provideBoardNotifications } from '@/composables/useBoardNotifications'
import { useUiNotifications } from '@/composables/useUiNotifications'
import RetroBoardComponent from '../components/retro/RetroBoardComponent/RetroBoardComponent.vue'
import Loader from '../components/common/Loader/Loader.vue'
import { useRetroStore } from '../stores/RetroStore'

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null
}

const asErrorMessage = (value: unknown): string => {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

const extractErrorStatus = (error: unknown): number | null => {
  if (error instanceof AxiosError && typeof error.response?.status === 'number') {
    return error.response.status
  }

  if (!isRecord(error)) {
    return null
  }

  if (typeof error.status === 'number') {
    return error.status
  }

  const response = isRecord(error.response) ? error.response : null
  if (typeof response?.status === 'number') {
    return response.status
  }

  return null
}

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const directMessage = asErrorMessage(error.message)
    if (directMessage) {
      return directMessage
    }
  }

  if (!isRecord(error)) {
    return ''
  }

  const directMessage = asErrorMessage(error.message)
  if (directMessage) {
    return directMessage
  }

  const response = isRecord(error.response) ? error.response : null
  const data = isRecord(response?.data) ? response.data : null
  if (Array.isArray(data?.message)) {
    const normalizedMessages = data.message
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
    if (normalizedMessages.length > 0) {
      return normalizedMessages.join(', ')
    }
  }

  return asErrorMessage(data?.message)
}

const getNormalizedAccessToken = () => {
  const rawToken = getAccessToken()
  if (typeof rawToken !== 'string') {
    return null
  }

  const normalizedToken = rawToken.trim()
  return normalizedToken || null
}

const retroStore = useRetroStore()
const route = useRoute()
const router = useRouter()
const accessToken = getNormalizedAccessToken()
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
const { notifications, pushNotification, dismissNotification } = useUiNotifications()
let boardSocket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let unsubscribeRetroListeners: (() => void) | null = null
let boardJoinRequestId = 0
let boardLoadRequestId = 0

provideBoardNotifications({
  notifications,
  pushNotification,
  dismissNotification,
})

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

const isAnonymousSession = () => {
  return !getNormalizedAccessToken()
}

const isAnonymousAccessDeniedError = (error: unknown) => {
  const status = extractErrorStatus(error)
  if (status === 401 || status === 403 || status === 404) {
    return true
  }

  const normalizedMessage = extractErrorMessage(error).toLowerCase()
  if (!normalizedMessage) {
    return false
  }

  return (
    normalizedMessage.includes('unauthorized') ||
    normalizedMessage.includes('forbidden') ||
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('не найден') ||
    normalizedMessage.includes('доступ запрещен')
  )
}

const redirectAnonymousToAuth = async () => {
  if (!isAnonymousSession()) {
    return false
  }

  await router.replace({ name: 'auth' })
  return true
}

const loadBoardFromRoute = async (boardId: number | null) => {
  if (!boardId) {
    return false
  }

  const requestId = ++boardLoadRequestId

  try {
    await retroStore.loadBoardById(boardId)
    return requestId === boardLoadRequestId
  } catch (error) {
    if (requestId !== boardLoadRequestId) {
      return false
    }

    if (isAnonymousAccessDeniedError(error)) {
      await redirectAnonymousToAuth()
    }
    return false
  }
}

const unsubscribeBoardRealtimeEvents = () => {
  unsubscribeRetroListeners?.()
  unsubscribeRetroListeners = null
}

const subscribeBoardRealtime = async (boardId: number) => {
  const requestId = ++boardJoinRequestId
  realtimeSyncError.value = ''

  try {
    const socket = await connectSocket(getNormalizedAccessToken())

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
      onBoardGroupsPositionsSynced: (payload) => {
        retroStore.applyRealtimeBoardGroupsPositionsSynced(payload)
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
      onGroupCreated: (payload) => {
        retroStore.applyRealtimeGroupCreated(payload)
      },
      onGroupNameUpdated: (payload) => {
        retroStore.applyRealtimeGroupNameUpdated(payload)
      },
      onGroupColorUpdated: (payload) => {
        retroStore.applyRealtimeGroupColorUpdated(payload)
      },
      onGroupDescriptionUpdated: (payload) => {
        retroStore.applyRealtimeGroupDescriptionUpdated(payload)
      },
      onGroupDeleted: (payload) => {
        retroStore.applyRealtimeGroupDeleted(payload)
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
      onBoardSettingsUpdated: (payload) => {
        retroStore.applyBoardSettingsUpdatedFromSocket(payload)
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

    if (isAnonymousAccessDeniedError(error)) {
      const isRedirected = await redirectAnonymousToAuth()
      if (isRedirected) {
        return
      }
    }

    realtimeSyncError.value = extractErrorMessage(error) || 'Не удалось подключить realtime синхронизацию'
  }
}

watch(
  () => route.params.id,
  () => {
    void (async () => {
      const boardId = resolveRouteBoardId()
      const isBoardLoaded = await loadBoardFromRoute(boardId)

      if (!boardId || !isBoardLoaded) {
        boardJoinRequestId += 1
        unsubscribeBoardRealtimeEvents()
        boardSocket = null
        return
      }

      void subscribeBoardRealtime(boardId)
    })()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  boardJoinRequestId += 1
  unsubscribeBoardRealtimeEvents()
  boardSocket = null
})
</script>
