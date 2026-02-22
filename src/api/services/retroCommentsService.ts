import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'

type TRecord = Record<string, unknown>

export type RetroCommentCreatorDto = {
  id: string
  email: string
  name: string | null
}

export type RetroItemCommentResponseDto = {
  id: number
  itemId: number
  text: string
  createdAt: string
  creator: RetroCommentCreatorDto
}

export type RetroCreateCommentPayload = {
  text: string
}

export type RetroUpdateCommentPayload = {
  text: string
}

export type RetroDeleteCommentResponseDto = {
  deleted: boolean
}

const isRecord = (value: unknown): value is TRecord => {
  return typeof value === 'object' && value !== null
}

const asPositiveNumber = (value: unknown): number | null => {
  const normalized = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(normalized) || normalized <= 0) {
    return null
  }

  return normalized
}

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

const asNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized ? normalized : null
}

const normalizeCreator = (value: unknown): RetroCommentCreatorDto | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const email = asNonEmptyString(value.email)
  if (!id || !email) {
    return null
  }

  return {
    id,
    email,
    name: asNullableString(value.name),
  }
}

const normalizeComment = (value: unknown): RetroItemCommentResponseDto | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asPositiveNumber(value.id)
  const itemId = asPositiveNumber(value.itemId)
  const text = asNonEmptyString(value.text) ?? ''
  const createdAt = asNonEmptyString(value.createdAt)
  const creator = normalizeCreator(value.creator)

  if (!id || !itemId || !createdAt || !creator) {
    return null
  }

  return {
    id,
    itemId,
    text,
    createdAt,
    creator,
  }
}

const normalizeCommentCollection = (value: unknown): RetroItemCommentResponseDto[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((comment) => normalizeComment(comment))
    .filter((comment): comment is RetroItemCommentResponseDto => Boolean(comment))
}

const normalizeDeleteResponse = (value: unknown): RetroDeleteCommentResponseDto => {
  if (!isRecord(value)) {
    return { deleted: false }
  }

  return { deleted: value.deleted === true }
}

const extractErrorMessage = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || undefined
  }

  if (!isRecord(value)) {
    return undefined
  }

  if (typeof value.message === 'string') {
    const normalized = value.message.trim()
    return normalized || undefined
  }

  if (Array.isArray(value.message)) {
    const details = value.message.filter((entry): entry is string => typeof entry === 'string')
    if (details.length > 0) {
      return details.join(', ')
    }
  }

  if (typeof value.error === 'string') {
    const normalized = value.error.trim()
    return normalized || undefined
  }

  return undefined
}

export class RetroCommentsApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'RetroCommentsApiError'
    this.status = status
  }
}

export const toRetroCommentsApiError = (
  error: unknown,
  fallbackMessage: string,
): RetroCommentsApiError => {
  if (error instanceof RetroCommentsApiError) {
    return error
  }

  if (error instanceof AxiosError) {
    return new RetroCommentsApiError(
      extractErrorMessage(error.response?.data) ?? fallbackMessage,
      error.response?.status,
    )
  }

  if (error instanceof Error && error.message.trim()) {
    return new RetroCommentsApiError(error.message)
  }

  return new RetroCommentsApiError(fallbackMessage)
}

export const retroCommentsService = {
  async getItemComments(itemId: number): Promise<RetroItemCommentResponseDto[]> {
    try {
      const response = await httpClient.get(`/retro/items/${itemId}/comments`)
      return normalizeCommentCollection(response.data)
    } catch (error) {
      throw toRetroCommentsApiError(error, 'Не удалось загрузить комментарии')
    }
  },
  async createItemComment(
    itemId: number,
    payload: RetroCreateCommentPayload,
  ): Promise<RetroItemCommentResponseDto> {
    try {
      const response = await httpClient.post(`/retro/items/${itemId}/comments`, payload)
      const createdComment = normalizeComment(response.data)
      if (!createdComment) {
        throw new RetroCommentsApiError('Не удалось обработать ответ сервера')
      }

      return createdComment
    } catch (error) {
      throw toRetroCommentsApiError(error, 'Не удалось создать комментарий')
    }
  },
  async updateComment(
    commentId: number,
    payload: RetroUpdateCommentPayload,
  ): Promise<RetroItemCommentResponseDto> {
    try {
      const response = await httpClient.patch(`/retro/comments/${commentId}`, payload)
      const updatedComment = normalizeComment(response.data)
      if (!updatedComment) {
        throw new RetroCommentsApiError('Не удалось обработать ответ сервера')
      }

      return updatedComment
    } catch (error) {
      throw toRetroCommentsApiError(error, 'Не удалось обновить комментарий')
    }
  },
  async deleteComment(commentId: number): Promise<RetroDeleteCommentResponseDto> {
    try {
      const response = await httpClient.delete(`/retro/comments/${commentId}`)
      return normalizeDeleteResponse(response.data)
    } catch (error) {
      throw toRetroCommentsApiError(error, 'Не удалось удалить комментарий')
    }
  },
}
