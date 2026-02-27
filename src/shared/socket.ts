import { io, type Socket } from 'socket.io-client'
import { getAccessToken } from '@/auth/session'
import {
  WS_CLIENT_EVENT_NAMES,
  type BoardColumnsReorderPayload,
  type BoardJoinAck,
  type BoardJoinPayload,
  type BoardRenamePayload,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type WsBoard,
  type WsColumn,
} from './ws.types'

type Column = WsColumn

const DEFAULT_WS_URL = 'http://localhost:3000/ws'
const ACK_TIMEOUT_MS = 10000

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
let socketToken: string | null = null
let connectInFlight: Promise<Socket<ServerToClientEvents, ClientToServerEvents>> | null = null

const resolveWsUrl = () => {
  const explicitWsUrl = import.meta.env.VITE_RETRO_WS_URL?.trim()
  if (explicitWsUrl) {
    return explicitWsUrl
  }

  const apiUrl = import.meta.env.VITE_RETRO_API_BASE_URL?.trim()
  if (apiUrl) {
    const normalizedApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
    return `${normalizedApiUrl}/ws`
  }

  return DEFAULT_WS_URL
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized || null
}

const toSocketErrorMessage = (value: unknown, fallback = 'Connection error') => {
  const directMessage = asNonEmptyString(value)
  if (directMessage) {
    return directMessage
  }

  if (isRecord(value)) {
    const message = asNonEmptyString(value.message)
    if (message) {
      return message
    }

    const errorValue = value.error
    const nestedMessage = asNonEmptyString(errorValue)
    if (nestedMessage) {
      return nestedMessage
    }
    if (isRecord(errorValue)) {
      const nested = asNonEmptyString(errorValue.message)
      if (nested) {
        return nested
      }
    }
  }

  return fallback
}

const isWsBoard = (value: unknown): value is WsBoard => {
  if (!isRecord(value)) {
    return false
  }

  const id = Number(value.id)
  return Number.isInteger(id) && id > 0 && typeof value.name === 'string'
}

const isWsColumn = (value: unknown): value is WsColumn => {
  if (!isRecord(value)) {
    return false
  }

  const id = Number(value.id)
  return Number.isInteger(id) && id > 0
}

const isBoardJoinAck = (value: unknown): value is BoardJoinAck => {
  if (!isRecord(value)) {
    return false
  }

  return value.joined === true && Number.isInteger(value.boardId) && Number(value.boardId) > 0
}

const resolveBoardRenameAck = (args: unknown[]): WsBoard => {
  if (args.length === 0) {
    throw new Error('Invalid board response')
  }

  if (args.length === 1) {
    const [single] = args
    if (isWsBoard(single)) {
      return single
    }

    throw new Error(toSocketErrorMessage(single, 'Invalid board response'))
  }

  const [ackError, ackPayload] = args
  const errorMessage = toSocketErrorMessage(ackError, '')
  if (errorMessage) {
    throw new Error(errorMessage)
  }

  if (isWsBoard(ackPayload)) {
    return ackPayload
  }

  throw new Error(toSocketErrorMessage(ackPayload, 'Invalid board response'))
}

const ensureSocket = (accessToken: string) => {
  if (socket && socketToken === accessToken) {
    return socket
  }

  if (socket && socketToken !== accessToken) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
    socketToken = null
    connectInFlight = null
  }

  if (!socket) {
    socket = createWs(accessToken)
    socketToken = accessToken
  }

  return socket
}

export const createWs = (
  accessToken: string,
): Socket<ServerToClientEvents, ClientToServerEvents> => {
  return io(resolveWsUrl(), {
    auth: {
      token: accessToken,
    },
  })
}

export const getOrCreateSocket = (accessToken: string) => {
  return ensureSocket(accessToken.trim())
}

export const connectSocket = async (accessToken?: string | null) => {
  const normalizedToken = (accessToken ?? getAccessToken() ?? '').trim()
  const ws = ensureSocket(normalizedToken)

  if (ws.connected) {
    return ws
  }

  if (connectInFlight) {
    return connectInFlight
  }

  const pendingConnection = new Promise<Socket<ServerToClientEvents, ClientToServerEvents>>(
    (resolve, reject) => {
      const onConnect = () => {
        cleanup()
        resolve(ws)
      }

      const onConnectError = (error: Error) => {
        cleanup()
        reject(new Error(toSocketErrorMessage(error)))
      }

      const cleanup = () => {
        ws.off('connect', onConnect)
        ws.off('connect_error', onConnectError)
      }

      ws.on('connect', onConnect)
      ws.on('connect_error', onConnectError)

      if (!ws.connected && !ws.active) {
        ws.connect()
      }
    },
  )

  connectInFlight = pendingConnection

  try {
    return await pendingConnection
  } finally {
    connectInFlight = null
  }
}

export const disconnectSocket = () => {
  if (!socket) {
    return
  }

  socket.removeAllListeners()
  socket.disconnect()
  socket = null
  socketToken = null
  connectInFlight = null
}

export const renameBoard = async (boardId: number, name: string): Promise<WsBoard> => {
  if (!Number.isInteger(boardId) || boardId <= 0) {
    throw new Error('boardId must be a positive integer')
  }

  const normalizedName = name.trim()
  if (!normalizedName) {
    throw new Error('name must be a non-empty string')
  }

  const ws = await connectSocket()
  const payload: BoardRenamePayload = {
    boardId,
    name: normalizedName,
  }

  return new Promise<WsBoard>((resolve, reject) => {
    const ackTimeout = globalThis.setTimeout(() => {
      reject(new Error('Socket ack timeout'))
    }, ACK_TIMEOUT_MS)

    ws.emit(WS_CLIENT_EVENT_NAMES.BOARD_RENAME, payload, (...ackArgs: unknown[]) => {
      globalThis.clearTimeout(ackTimeout)

      try {
        const board = resolveBoardRenameAck(ackArgs)
        resolve(board)
      } catch (error) {
        reject(error)
      }
    })
  })
}

export const joinBoard = async (boardId: number): Promise<BoardJoinAck> => {
  if (!Number.isInteger(boardId) || boardId <= 0) {
    throw new Error('boardId must be a positive integer')
  }

  const ws = await connectSocket()
  const payload: BoardJoinPayload = { boardId }

  return new Promise<BoardJoinAck>((resolve, reject) => {
    const ackTimeout = globalThis.setTimeout(() => {
      reject(new Error('Socket ack timeout'))
    }, ACK_TIMEOUT_MS)

    ws.emit(WS_CLIENT_EVENT_NAMES.BOARD_JOIN, payload, (...ackArgs: unknown[]) => {
      globalThis.clearTimeout(ackTimeout)

      try {
        if (ackArgs.length === 0) {
          throw new Error('Invalid join response')
        }

        if (ackArgs.length === 1) {
          const [single] = ackArgs
          if (isBoardJoinAck(single)) {
            resolve(single)
            return
          }

          throw new Error(toSocketErrorMessage(single, 'Invalid join response'))
        }

        const [ackError, ackPayload] = ackArgs
        const errorMessage = toSocketErrorMessage(ackError, '')
        if (errorMessage) {
          throw new Error(errorMessage)
        }

        if (isBoardJoinAck(ackPayload)) {
          resolve(ackPayload)
          return
        }

        throw new Error(toSocketErrorMessage(ackPayload, 'Invalid join response'))
      } catch (error) {
        reject(error)
      }
    })
  })
}

export const reorderBoardColumns = async (
  boardId: number,
  oldIndex: number,
  newIndex: number,
): Promise<Column[]> => {
  if (!Number.isInteger(boardId) || boardId <= 0) {
    throw new Error('boardId must be a positive integer')
  }
  if (!Number.isInteger(oldIndex) || oldIndex < 0) {
    throw new Error('oldIndex must be a non-negative integer')
  }
  if (!Number.isInteger(newIndex) || newIndex < 0) {
    throw new Error('newIndex must be a non-negative integer')
  }

  const ws = await connectSocket()
  const payload: BoardColumnsReorderPayload = {
    boardId,
    oldIndex,
    newIndex,
  }

  return new Promise<Column[]>((resolve, reject) => {
    const ackTimeout = globalThis.setTimeout(() => {
      reject(new Error('Socket ack timeout'))
    }, ACK_TIMEOUT_MS)

    ws.emit(WS_CLIENT_EVENT_NAMES.BOARD_COLUMNS_REORDER, payload, (...ackArgs: unknown[]) => {
      globalThis.clearTimeout(ackTimeout)

      try {
        if (ackArgs.length === 0) {
          throw new Error('Invalid columns response')
        }

        if (ackArgs.length === 1) {
          const [single] = ackArgs
          if (Array.isArray(single) && single.every(isWsColumn)) {
            resolve(single)
            return
          }

          throw new Error(toSocketErrorMessage(single, 'Invalid columns response'))
        }

        const [ackError, ackPayload] = ackArgs
        const errorMessage = toSocketErrorMessage(ackError, '')
        if (errorMessage) {
          throw new Error(errorMessage)
        }

        if (Array.isArray(ackPayload) && ackPayload.every(isWsColumn)) {
          resolve(ackPayload)
          return
        }

        throw new Error(toSocketErrorMessage(ackPayload, 'Invalid columns response'))
      } catch (error) {
        reject(error)
      }
    })
  })
}
