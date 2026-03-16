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
  async getBoardSettings(boardId: number): Promise<unknown> {
    const response = await httpClient.get(`/retro/boards/${boardId}/settings`)
    return response.data
  },

  async getBoardColumns(boardId: number): Promise<unknown> {
    const response = await httpClient.get(`/retro/boards/${boardId}/columns`)
    return response.data
  },

  async createGroup(
    columnId: number,
    payload: { boardId: number; name: string; description?: string; color?: ColumnColor },
  ) {
    try {
      const response = await httpClient.post(`/retro/columns/${columnId}/groups`, payload)
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось создать группу')
    }
  },

  async updateColumnCommon(
    columnId: number,
    payload: { common: boolean; boardId: number },
  ): Promise<TRetroColumn> {
    try {
      const response = await httpClient.patch(`/retro/columns/${columnId}/common`, payload)
      return response.data as TRetroColumn
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить признак общей колонки')
    }
  },

  async updateColumnName(columnId: number, payload: { name: string; boardId: number }) {
    try {
      const response = await httpClient.patch(`/retro/columns/${columnId}/name`, payload)
      return response.data as TRetroColumn
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить название колонки')
    }
  },

  async updateColumnColor(columnId: number, payload: { color: ColumnColor; boardId: number }) {
    try {
      const response = await httpClient.patch(`/retro/columns/${columnId}/color`, payload)
      return response.data as TRetroColumn
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить цвет колонки')
    }
  },

  async updateColumnDescription(
    columnId: number,
    payload: { description: string; boardId: number },
  ) {
    try {
      const response = await httpClient.patch(`/retro/columns/${columnId}/description`, payload)
      return response.data as TRetroColumn
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить описание колонки')
    }
  },

  async deleteColumn(columnId: number, boardId: number) {
    try {
      await httpClient.delete(`/retro/columns/${columnId}`, {
        params: { boardId },
      })
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось удалить колонку')
    }
  },

  async updateGroupName(groupId: number, payload: { name: string; boardId: number }) {
    try {
      const response = await httpClient.patch(`/retro/groups/${groupId}/name`, payload)
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить название группы')
    }
  },

  async updateGroupColor(groupId: number, payload: { color: ColumnColor; boardId: number }) {
    try {
      const response = await httpClient.patch(`/retro/groups/${groupId}/color`, payload)
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить цвет группы')
    }
  },

  async updateGroupDescription(
    groupId: number,
    payload: { description: string; boardId: number },
  ) {
    try {
      const response = await httpClient.patch(`/retro/groups/${groupId}/description`, payload)
      return response.data as TRetroGroup
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить описание группы')
    }
  },

  async deleteGroup(groupId: number, boardId: number) {
    try {
      await httpClient.delete(`/retro/groups/${groupId}`, {
        params: { boardId },
      })
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
    payload: { description: string; groupId?: number | null; boardId: number },
  ): Promise<TRetroColumnItem> {
    try {
      const response = await httpClient.post(`/retro/columns/${columnId}/items`, payload)
      return response.data as TRetroColumnItem
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось создать карточку')
    }
  },

  async updateItemDescription(itemId: number, payload: { description: string; boardId: number }) {
    try {
      const response = await httpClient.patch(`/retro/items/${itemId}/description`, payload)
      return response.data as TRetroColumnItem
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить текст карточки')
    }
  },

  async updateItemLike(itemId: number, boardId: number) {
    try {
      const response = await httpClient.patch(`/retro/items/${itemId}/like`, { boardId })
      return response.data as TRetroColumnItem
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить лайк карточки')
    }
  },

  async updateItemColor(itemId: number, payload: { color?: string; boardId: number }) {
    try {
      const response = await httpClient.patch(`/retro/items/${itemId}/color`, payload)
      return response.data as TRetroColumnItem
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить цвет карточки')
    }
  },

  async deleteItem(itemId: number, boardId: number) {
    try {
      await httpClient.delete(`/retro/items/${itemId}`, {
        params: { boardId },
      })
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось удалить карточку')
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
  async updateBoardSettings(
    boardId: number,
    payload: { showLikes: boolean; showComments: boolean; canEditCards: boolean },
  ) {
    try {
      const response = await httpClient.patch(`/retro/boards/${boardId}/settings`, payload)
      return response.data
    } catch (error) {
      throw getApiErrorMessage(error, 'Не удалось обновить настройки доски')
    }
  },
}

export type { RetroBoardApiError }
