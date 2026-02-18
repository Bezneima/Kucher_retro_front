import { goodCardColors } from '../constants'
import type { TRetroColumn, TRetroColumnItem } from '../types'

export const normalizeColumns = (columnsData: unknown): TRetroColumn[] => {
  if (!Array.isArray(columnsData)) return []

  return columnsData.map((columnData, columnIndex) => {
    const rawColumn = (columnData ?? {}) as Partial<TRetroColumn> & { items?: unknown }
    const itemsData = Array.isArray(rawColumn.items) ? rawColumn.items : []

    return {
      id: Number(rawColumn.id) || columnIndex + 1,
      name: typeof rawColumn.name === 'string' ? rawColumn.name : `Column ${columnIndex + 1}`,
      color:
        typeof rawColumn.color === 'string' && rawColumn.color
          ? rawColumn.color
          : (goodCardColors[columnIndex % goodCardColors.length] ?? '#f0f0f0'),
      isNameEditing: false,
      items: itemsData.map((itemData, rowIndex) => {
        const rawItem = itemData as Partial<TRetroColumnItem>
        return {
          id: Number(rawItem.id) || rowIndex + 1,
          description: typeof rawItem.description === 'string' ? rawItem.description : '',
          syncedDescription:
            typeof rawItem.description === 'string' ? rawItem.description : '',
          likes: Array.isArray(rawItem.likes)
            ? rawItem.likes.filter((like): like is string => typeof like === 'string')
            : [],
          color: typeof rawItem.color === 'string' ? rawItem.color : undefined,
          isDraft: false,
          columnIndex,
          rowIndex,
        }
      }),
    }
  })
}
