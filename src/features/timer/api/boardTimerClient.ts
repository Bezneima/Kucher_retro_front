import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'

export type BoardTimerStatus = 'RUNNING' | 'PAUSED'

export type BoardTimerDto = {
  status: BoardTimerStatus
  remainingSeconds: number
  durationSeconds: number
}

export type StartBoardTimerRequest = {
  seconds: number
}

type TRecord = Record<string, unknown>

const isRecord = (value: unknown): value is TRecord => {
  return typeof value === 'object' && value !== null
}

const asBoardTimerStatus = (value: unknown): BoardTimerStatus | null => {
  return value === 'RUNNING' || value === 'PAUSED' ? value : null
}

const asNonNegativeInteger = (value: unknown): number | null => {
  const normalizedValue = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(normalizedValue) && normalizedValue >= 0 ? normalizedValue : null
}

const asTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeBoardTimer = (payload: unknown): BoardTimerDto | null => {
  if (!isRecord(payload)) {
    return null
  }

  const status = asBoardTimerStatus(payload.status)
  let remainingSeconds = asNonNegativeInteger(payload.remainingSeconds)
  const durationSeconds = asNonNegativeInteger(payload.durationSeconds)
  if (!status || remainingSeconds === null) {
    return null
  }

  if (status === 'RUNNING') {
    const endsAtTimestamp = asTimestamp(payload.endsAt)
    if (endsAtTimestamp !== null) {
      const remainingByDeadline = Math.max(0, Math.ceil((endsAtTimestamp - Date.now()) / 1000))
      remainingSeconds = remainingByDeadline
    }
  }

  return {
    status: status === 'RUNNING' && remainingSeconds === 0 ? 'PAUSED' : status,
    remainingSeconds,
    durationSeconds: Math.max(durationSeconds ?? remainingSeconds, remainingSeconds),
  }
}

const extractMessage = (payload: unknown): string | undefined => {
  if (typeof payload === 'string') {
    return payload
  }
  if (!isRecord(payload)) {
    return undefined
  }
  if (typeof payload.message === 'string') {
    return payload.message
  }
  if (Array.isArray(payload.message)) {
    const details = payload.message.filter((item): item is string => typeof item === 'string')
    if (details.length > 0) {
      return details.join(', ')
    }
  }
  if (typeof payload.error === 'string') {
    return payload.error
  }

  return undefined
}

export class BoardTimerApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'BoardTimerApiError'
    this.status = status
  }
}

const toBoardTimerApiError = (error: unknown, fallbackMessage: string): BoardTimerApiError => {
  if (error instanceof BoardTimerApiError) {
    return error
  }

  if (error instanceof AxiosError) {
    return new BoardTimerApiError(extractMessage(error.response?.data) ?? fallbackMessage, error.response?.status)
  }

  return new BoardTimerApiError(fallbackMessage)
}

export const boardTimerClient = {
  async getBoardTimer(boardId: number): Promise<BoardTimerDto | null> {
    try {
      const response = await httpClient.get(`/retro/boards/${boardId}/timer`)
      if (response.data == null) {
        return null
      }

      return normalizeBoardTimer(response.data)
    } catch (error) {
      throw toBoardTimerApiError(error, 'Не удалось загрузить таймер')
    }
  },

  async startBoardTimer(boardId: number, payload: StartBoardTimerRequest): Promise<BoardTimerDto> {
    try {
      const response = await httpClient.post(`/retro/boards/${boardId}/timer/start`, payload)
      const timer = normalizeBoardTimer(response.data)
      if (!timer) {
        throw new BoardTimerApiError('Некорректный ответ таймера')
      }

      return timer
    } catch (error) {
      throw toBoardTimerApiError(error, 'Не удалось запустить таймер')
    }
  },

  async pauseBoardTimer(boardId: number): Promise<BoardTimerDto> {
    try {
      const response = await httpClient.post(`/retro/boards/${boardId}/timer/pause`)
      const timer = normalizeBoardTimer(response.data)
      if (!timer) {
        throw new BoardTimerApiError('Некорректный ответ таймера')
      }

      return timer
    } catch (error) {
      throw toBoardTimerApiError(error, 'Не удалось поставить таймер на паузу')
    }
  },

  async resumeBoardTimer(boardId: number): Promise<BoardTimerDto> {
    try {
      const response = await httpClient.post(`/retro/boards/${boardId}/timer/resume`)
      const timer = normalizeBoardTimer(response.data)
      if (!timer) {
        throw new BoardTimerApiError('Некорректный ответ таймера')
      }

      return timer
    } catch (error) {
      throw toBoardTimerApiError(error, 'Не удалось продолжить таймер')
    }
  },

  async deleteBoardTimer(boardId: number): Promise<void> {
    try {
      await httpClient.delete(`/retro/boards/${boardId}/timer`)
    } catch (error) {
      throw toBoardTimerApiError(error, 'Не удалось удалить таймер')
    }
  },
}
