import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Socket } from 'socket.io-client'
import { clearAuthSession } from '@/auth/session'
import { useRetroStore } from '@/stores/RetroStore'
import { connectSocket, disconnectSocket, getOrCreateSocket } from '@/shared/socket'
import {
  WS_CLIENT_EVENT_NAMES,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type WsConnectionStatus,
  type WsDisconnectReason,
} from '@/shared/ws.types'

const UNAUTHORIZED_MESSAGE = 'Unauthorized'

export const useBoardSocket = (accessToken: string | null) => {
  const router = useRouter()
  const retroStore = useRetroStore()

  const status = ref<WsConnectionStatus>('idle')
  const lastMessage = ref('')
  const errorMessage = ref('')

  let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

  const sendDisconnectNotice = (reason: WsDisconnectReason) => {
    if (!socket?.connected) {
      return
    }

    socket.emit(WS_CLIENT_EVENT_NAMES.PRESENCE_DISCONNECTING, {
      reason,
      at: new Date().toISOString(),
    })
  }

  const removeWindowListeners = () => {
    if (typeof window === 'undefined') {
      return
    }

    window.removeEventListener('offline', handleWindowOffline)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }

  const disconnect = (reason: WsDisconnectReason = 'manual', notifyServer = true) => {
    if (!socket) {
      status.value = status.value === 'connected' ? 'idle' : status.value
      removeWindowListeners()
      return
    }

    if (notifyServer) {
      sendDisconnectNotice(reason)
    }

    socket.off('connect', handleConnect)
    socket.off('message', handleMessage)
    socket.off('connect_error', handleConnectError)
    socket = null
    disconnectSocket()
    removeWindowListeners()

    if (status.value === 'connected' || status.value === 'connecting') {
      status.value = 'idle'
    }
  }

  const handleWindowOffline = () => {
    errorMessage.value = 'Network offline'
    status.value = 'error'
    disconnect('offline')
  }

  const handleBeforeUnload = () => {
    disconnect('page_unload')
  }

  const handleConnect = () => {
    status.value = 'connected'
    errorMessage.value = ''
  }

  const handleMessage = (payload: string) => {
    lastMessage.value = payload
  }

  const handleConnectError = (error: Error) => {
    const message = typeof error?.message === 'string' ? error.message : 'Connection error'
    errorMessage.value = message

    if (message === UNAUTHORIZED_MESSAGE) {
      status.value = 'unauthorized'
      disconnect('unauthorized', false)
      clearAuthSession()
      retroStore.clearCurrentUser()
      void router.replace({ name: 'auth' })
      return
    }

    status.value = 'error'
  }

  const connect = () => {
    if (socket) {
      return
    }

    status.value = 'connecting'
    errorMessage.value = ''

    const token = accessToken?.trim() ?? ''
    socket = getOrCreateSocket(token)

    socket.on('connect', handleConnect)
    socket.on('message', handleMessage)
    socket.on('connect_error', handleConnectError)

    void connectSocket(token).catch(() => {
      // connect_error is handled by socket listeners above.
    })

    if (typeof window !== 'undefined') {
      window.addEventListener('offline', handleWindowOffline)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  }

  onBeforeUnmount(() => {
    disconnect('manual')
  })

  return {
    status,
    lastMessage,
    errorMessage,
    connect,
    disconnect,
  }
}
