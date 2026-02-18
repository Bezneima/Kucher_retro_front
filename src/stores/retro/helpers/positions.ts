import type { TItemPositionChange, TRetroColumn } from '../types'

export const recalculateItemIndices = (columns: TRetroColumn[]) => {
  columns.forEach((column, columnIdx) => {
    column.items.forEach((item, rowIdx) => {
      item.columnIndex = columnIdx
      item.rowIndex = rowIdx
    })
  })
}

export const buildPositionsSnapshot = (columns: TRetroColumn[]) => {
  const positions: Record<number, { columnId: number; rowIndex: number }> = {}

  for (const column of columns) {
    for (const item of column.items) {
      positions[item.id] = { columnId: column.id, rowIndex: item.rowIndex }
    }
  }

  return positions
}

export const getChangedPositionItems = (
  columns: TRetroColumn[],
  lastSyncedPositions: Record<number, { columnId: number; rowIndex: number }>,
): TItemPositionChange[] => {
  const result: TItemPositionChange[] = []

  for (const column of columns) {
    for (const item of column.items) {
      const prev = lastSyncedPositions[item.id]
      if (prev == null) continue

      if (prev.columnId !== column.id || prev.rowIndex !== item.rowIndex) {
        result.push({
          item,
          oldColumnId: prev.columnId,
          oldRowIndex: prev.rowIndex,
          newColumnId: column.id,
          newRowIndex: item.rowIndex,
        })
      }
    }
  }

  return result
}
