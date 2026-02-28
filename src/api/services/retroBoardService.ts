import { httpClient } from '@/api/httpClient'
import type {
  ColumnColor,
  SyncPositionsResult,
  TGroupPositionPayloadChange,
  TItemPositionPayloadChange,
  TRetroColumn,
  TRetroGroup,
  TRetroColumnItem,
} from '@/stores/retro/types'

type RetroBoardApiError = {
  status?: number
  message: string
}

type TRecord = Record<string, unknown>

const isRecord = (value: unknown): value is TRecord => {
  return typeof value === 'object' && value !== null
}

const getApiErrorMessage = (error: unknown, fallback: string): RetroBoardApiError => {
  if (!isRecord(error)) {
    return { message: fallback }
  }

  const status = typeof error.status === 'number' ? error.status : undefined

  const response = isRecord(error.response) ? error.response : null
  const responseStatus = typeof response?.status === 'number' ? response.status : status
  const data = isRecord(response?.data) ? response.data : null

  let message = fallback
  if (Array.isArray(data?.message)) {
    message = data.message.filter((entry): entry is string => typeof entry === 'string').join(', ') || fallback
  } else if (typeof data?.message === 'string' && data.message.trim()) {
    message = data.message
  } else if (typeof error.message === 'string' && error.message.trim()) {
    message = error.message
  }

  return {
    status: responseStatus,
    message,
  }
}

const ensureSyncPositionsResult = (payload: unknown): SyncPositionsResult => {
  const raw = isRecord(payload) ? payload : {}

  return {
    boardId: Number(raw.boardId) || 0,
    updated: Number(raw.updated) || 0,
    changedColumnIds: Array.isArray(raw.changedColumnIds)
      ? raw.changedColumnIds.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry > 0)
      : [],
    columns: Array.isArray(raw.columns) ? (raw.columns as TRetroColumn[]) : [],
  }
}

export const retroBoardService = {
  async getBoardColumns(boardId: number): Promise<unknown> {
    const response = await httpClient.get(`/retro/boards/${boardId}/columns`)
    return response.data
  },

  async createGroup(columnId: number, payload: { name: string; description?: string; color?: ColumnColor }) {
    try {
      const response = await httpClient.post(`/retro/columns/${columnId}/groups`, payload)
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось создать группу')
    }
  },

  async updateGroupName(groupId: number, name: string) {
    try {
      const response = await httpClient.patch(`/retro/groups/${groupId}/name`, { name })
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить название группы')
    }
  },

  async updateGroupColor(groupId: number, color: ColumnColor) {
    try {
      const response = await httpClient.patch(`/retro/groups/${groupId}/color`, { color })
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить цвет группы')
    }
  },

  async updateGroupDescription(groupId: number, description: string) {
    try {
      const response = await httpClient.patch(`/retro/groups/${groupId}/description`, { description })
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить описание группы')
    }
  },

  async deleteGroup(groupId: number) {
    try {
      await httpClient.delete(`/retro/groups/${groupId}`)
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось удалить группу')
    }
  },

  async syncGroupPositions(boardId: number, changes: TGroupPositionPayloadChange[]) {
    try {
      const response = await httpClient.patch(`/retro/boards/${boardId}/groups/positions`, { changes })
      return ensureSyncPositionsResult(response.data)
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось синхронизировать позиции групп')
    }
  },

  async createItem(
    columnId: number,
    payload: { description: string; groupId?: number | null },
  ): Promise<TRetroColumnItem> {
    try {
      const response = await httpClient.post(`/retro/columns/${columnId}/items`, payload)
      return response.data as TRetroColumnItem
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось создать карточку')
    }
  },

  async syncItemPositions(boardId: number, changes: TItemPositionPayloadChange[]) {
    try {
      const response = await httpClient.patch(`/retro/boards/${boardId}/items/positions`, { changes })
      return ensureSyncPositionsResult(response.data)
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось синхронизировать позиции карточек')
    }
  },
}

export type { RetroBoardApiError }
