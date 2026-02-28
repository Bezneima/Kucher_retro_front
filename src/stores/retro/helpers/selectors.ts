import type { TRetroBoardState, TRetroColumn, TRetroColumnItem, TRetroGroup } from '../types'

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

export const findGroupWithColumn = (
  state: Pick<TRetroBoardState, 'board'>,
  groupId: number,
): { column: TRetroColumn; group: TRetroGroup } | null => {
  for (const column of getBoardColumns(state)) {
    const group = column.groups.find((entry) => entry.id === groupId)
    if (!group) {
      continue
    }

    return { column, group }
  }

  return null
}

export const findItemWithColumn = (
  state: Pick<TRetroBoardState, 'board'>,
  itemId: number,
): { column: TRetroColumn; group: TRetroGroup | null; item: TRetroColumnItem } | null => {
  for (const column of getBoardColumns(state)) {
    const rootItem = column.items.find((item) => item.id === itemId)
    if (rootItem) {
      return { column, group: null, item: rootItem }
    }

    for (const group of column.groups) {
      const groupItem = group.items.find((item) => item.id === itemId)
      if (!groupItem) {
        continue
      }

      return {
        column,
        group,
        item: groupItem,
      }
    }
  }

  return null
}
