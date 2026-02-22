import { availableColors, goodCardColors } from '../constants'
import type { TRetroColumn, TRetroColumnColor, TRetroColumnItem } from '../types'

const buildFallbackColumnColor = (columnIndex: number): TRetroColumnColor => {
  const fallback = availableColors[columnIndex % availableColors.length]
  if (fallback) {
    return { ...fallback }
  }

  const legacy = goodCardColors[columnIndex % goodCardColors.length] ?? '#f0f0f0'
  return {
    columnColor: legacy,
    itemColor: legacy,
    buttonColor: legacy,
  }
}

const normalizeColumnColor = (value: unknown, columnIndex: number): TRetroColumnColor => {
  const fallback = buildFallbackColumnColor(columnIndex)

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) return fallback

    return {
      columnColor: normalized,
      itemColor: normalized,
      buttonColor: normalized,
    }
  }

  if (typeof value !== 'object' || value === null) {
    return fallback
  }

  const payload = value as Partial<TRetroColumnColor>
  const columnColor =
    typeof payload.columnColor === 'string' && payload.columnColor.trim()
      ? payload.columnColor
      : fallback.columnColor
  const itemColor =
    typeof payload.itemColor === 'string' && payload.itemColor.trim()
      ? payload.itemColor
      : columnColor
  const buttonColor =
    typeof payload.buttonColor === 'string' && payload.buttonColor.trim()
      ? payload.buttonColor
      : columnColor

  return {
    columnColor,
    itemColor,
    buttonColor,
  }
}

export const normalizeColumns = (columnsData: unknown): TRetroColumn[] => {
  if (!Array.isArray(columnsData)) return []

  return columnsData.map((columnData, columnIndex) => {
    const rawColumn = (columnData ?? {}) as Partial<TRetroColumn> & { items?: unknown }
    const itemsData = Array.isArray(rawColumn.items) ? rawColumn.items : []

    return {
      id: Number(rawColumn.id) || columnIndex + 1,
      name: typeof rawColumn.name === 'string' ? rawColumn.name : `Column ${columnIndex + 1}`,
      description: typeof rawColumn.description === 'string' ? rawColumn.description : '',
      color: normalizeColumnColor(rawColumn.color, columnIndex),
      isNameEditing: false,
      items: itemsData.map((itemData, rowIndex) => {
        const rawItem = itemData as Partial<TRetroColumnItem>
        const normalizedCommentsCount = Number(rawItem.commentsCount)

        return {
          id: Number(rawItem.id) || rowIndex + 1,
          description: typeof rawItem.description === 'string' ? rawItem.description : '',
          createdAt: typeof rawItem.createdAt === 'string' ? rawItem.createdAt : undefined,
          syncedDescription:
            typeof rawItem.description === 'string' ? rawItem.description : '',
          likes: Array.isArray(rawItem.likes)
            ? rawItem.likes.filter((like): like is string => typeof like === 'string')
            : [],
          commentsCount:
            Number.isInteger(normalizedCommentsCount) && normalizedCommentsCount >= 0
              ? normalizedCommentsCount
              : 0,
          color: typeof rawItem.color === 'string' ? rawItem.color : undefined,
          isDraft: false,
          columnIndex,
          rowIndex,
        }
      }),
    }
  })
}
