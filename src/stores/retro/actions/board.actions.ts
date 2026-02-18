import { httpClient } from '@/api/httpClient'
import { RETRO_USER_ID } from '../constants'
import { normalizeColumns } from '../helpers/normalize'
import type { TRetroBoard } from '../types'

export const boardActions = {
  normalizeColumns(this: any, columnsData: unknown) {
    return normalizeColumns(columnsData)
  },
  async loadBoardForUser(this: any, userId = RETRO_USER_ID) {
    this.isBoardLoading = true
    try {
      const boardsResponse = await httpClient.get('/retro/boards', {
        params: { userId },
      })

      const boardsData = Array.isArray(boardsResponse.data) ? boardsResponse.data : []
      const firstBoard = boardsData[0] as Partial<TRetroBoard> | undefined

      if (!firstBoard) {
        this.board = []
        this.lastSyncedPositions = {}
        return
      }

      const boardId = Number(firstBoard.id)
      if (!boardId) {
        this.board = []
        this.lastSyncedPositions = {}
        return
      }

      const board: TRetroBoard = {
        id: boardId,
        name: typeof firstBoard.name === 'string' ? firstBoard.name : `Board ${boardId}`,
        date: typeof firstBoard.date === 'string' ? firstBoard.date : '',
        description: typeof firstBoard.description === 'string' ? firstBoard.description : '',
        columns: [],
      }

      const boardWithColumns = firstBoard as Partial<TRetroBoard> & { columns?: unknown }
      if (Array.isArray(boardWithColumns.columns)) {
        board.columns = this.normalizeColumns(boardWithColumns.columns)
      } else {
        const columnsResponse = await httpClient.get(`/retro/boards/${boardId}/columns`)
        board.columns = this.normalizeColumns(columnsResponse.data)
      }

      this.board = [board]
      this.setLastSyncedPositions()
    } catch (error) {
      console.error('[retro] failed to load board for user', userId, error)
    } finally {
      this.isBoardLoading = false
    }
  },
}
