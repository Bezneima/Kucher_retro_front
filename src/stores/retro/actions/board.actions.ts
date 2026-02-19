import { httpClient } from '@/api/httpClient'
import { RETRO_USER_ID } from '../constants'
import { normalizeColumns } from '../helpers/normalize'
import type { TRetroBoard } from '../types'

export const boardActions = {
  normalizeColumns(this: any, columnsData: unknown) {
    return normalizeColumns(columnsData)
  },
  async loadBoardData(this: any, boardData: Partial<TRetroBoard> | undefined) {
    if (!boardData) {
      this.board = []
      this.lastSyncedPositions = {}
      return
    }

    const boardId = Number(boardData.id)
    if (!boardId) {
      this.board = []
      this.lastSyncedPositions = {}
      return
    }

    const board: TRetroBoard = {
      id: boardId,
      name: boardData.name ?? '',
      date: boardData.date ?? '',
      description: boardData.description ?? '',
      columns: [],
    }

    const boardWithColumns = boardData as Partial<TRetroBoard> & { columns?: unknown }
    if (Array.isArray(boardWithColumns.columns)) {
      board.columns = this.normalizeColumns(boardWithColumns.columns)
    } else {
      const columnsResponse = await httpClient.get(`/retro/boards/${boardId}/columns`)
      board.columns = this.normalizeColumns(columnsResponse.data)
    }

    this.board = [board]
    this.setLastSyncedPositions()
  },
  async loadBoardForUser(this: any, userId = RETRO_USER_ID) {
    this.isBoardLoading = true
    try {
      const boardsResponse = await httpClient.get('/retro/boards', {
        params: { userId },
      })

      const boardsData = Array.isArray(boardsResponse.data) ? boardsResponse.data : []
      const firstBoard = boardsData[0] as Partial<TRetroBoard> | undefined

      await this.loadBoardData(firstBoard)
    } catch (error) {
      console.error('[retro] failed to load board for user', userId, error)
    } finally {
      this.isBoardLoading = false
    }
  },
  async loadBoardById(this: any, boardId: number) {
    this.isBoardLoading = true
    try {
      const [boardsResponse, columnsResponse] = await Promise.all([
        httpClient.get('/retro/boards', {
          params: { userId: RETRO_USER_ID },
        }),
        httpClient.get(`/retro/boards/${boardId}/columns`),
      ])

      const boardsData = Array.isArray(boardsResponse.data) ? boardsResponse.data : []
      const rawBoard = boardsData.find(
        (item) => Number((item as Partial<TRetroBoard>)?.id) === boardId,
      ) as Partial<TRetroBoard> | undefined

      const board: TRetroBoard = {
        id: boardId,
        name: typeof rawBoard?.name === 'string' ? rawBoard.name : `Board ${boardId}`,
        date: typeof rawBoard?.date === 'string' ? rawBoard.date : '',
        description: typeof rawBoard?.description === 'string' ? rawBoard.description : '',
        columns: this.normalizeColumns(columnsResponse.data),
      }

      this.board = [board]
      this.setLastSyncedPositions()
    } catch (error) {
      console.error('[retro] failed to load board by id', boardId, error)
      this.board = []
      this.lastSyncedPositions = {}
    } finally {
      this.isBoardLoading = false
    }
  },
}
