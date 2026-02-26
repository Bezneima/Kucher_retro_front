import type { TRetroColumn } from '../types'

export const reorderColumnsByPayloadIds = (
  currentColumns: TRetroColumn[],
  payload: unknown,
): TRetroColumn[] => {
  if (!Array.isArray(payload) || payload.length !== currentColumns.length) {
    throw new Error('Invalid columns response')
  }

  const columnsById = new Map<number, TRetroColumn>()
  for (const column of currentColumns) {
    columnsById.set(column.id, column)
  }

  const reorderedColumns: TRetroColumn[] = []

  for (const rawColumn of payload) {
    const columnId = Number((rawColumn as { id?: unknown } | null)?.id)
    if (!Number.isInteger(columnId) || columnId <= 0) {
      throw new Error('Invalid columns response')
    }

    const existingColumn = columnsById.get(columnId)
    if (!existingColumn) {
      throw new Error('Invalid columns response')
    }

    reorderedColumns.push(existingColumn)
  }

  return reorderedColumns
}
