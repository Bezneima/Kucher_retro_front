import type { TRetroBoardState, TRetroColumn, TRetroColumnItem } from '../types'

export const getBoardColumns = (state: Pick<TRetroBoardState, 'board'>): TRetroColumn[] => {
  return state.board[0]?.columns ?? []
}

export const getBoardId = (state: Pick<TRetroBoardState, 'board'>): number | null => {
  const boardId = state.board[0]?.id
  return boardId ? boardId : null
}

export const findColumnById = (
  state: Pick<TRetroBoardState, 'board'>,
  columnId: number,
): TRetroColumn | undefined => {
  return getBoardColumns(state).find((column) => column.id === columnId)
}

export const findItemWithColumn = (
  state: Pick<TRetroBoardState, 'board'>,
  itemId: number,
): { column: TRetroColumn; item: TRetroColumnItem } | null => {
  for (const column of getBoardColumns(state)) {
    const item = column.items.find((i) => i.id === itemId)
    if (!item) continue

    return { column, item }
  }

  return null
}
