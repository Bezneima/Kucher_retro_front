import { availableColors, goodCardColors } from '../constants'
import type {
  ColumnColor,
  RetroColumn,
  RetroColumnEntry,
  RetroGroup,
  RetroItem,
  TRetroColumn,
} from '../types'

type TRecord = Record<string, unknown>

const isRecord = (value: unknown): value is TRecord => {
  return typeof value === 'object' && value !== null
}

const asPositiveNumber = (value: unknown): number | null => {
  const normalized = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null
}

const asNonNegativeNumber = (value: unknown): number | null => {
  const normalized = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(normalized) && normalized >= 0 ? normalized : null
}

const asString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null
}

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

const buildFallbackColumnColor = (columnIndex: number): ColumnColor => {
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

const normalizeColumnColor = (value: unknown, columnIndex: number): ColumnColor => {
  const fallback = buildFallbackColumnColor(columnIndex)

  if (typeof value === 'string') {
    const normalized = value.trim()
    if (!normalized) {
      return fallback
    }

    return {
      columnColor: normalized,
      itemColor: normalized,
      buttonColor: normalized,
    }
  }

  if (!isRecord(value)) {
    return fallback
  }

  const columnColor = asString(value.columnColor)?.trim() || fallback.columnColor
  const itemColor = asString(value.itemColor)?.trim() || columnColor
  const buttonColor = asString(value.buttonColor)?.trim() || columnColor

  return {
    columnColor,
    itemColor,
    buttonColor,
  }
}

const normalizeItem = (
  payload: unknown,
  fallback: {
    id: number
    columnIndex: number
    rowIndex: number
    groupId: number | null
  },
): RetroItem => {
  const raw = isRecord(payload) ? payload : {}
  const id = asPositiveNumber(raw.id) ?? fallback.id
  const description = asString(raw.description) ?? ''
  const createdAt = asString(raw.createdAt) ?? ''
  const likes = asStringArray(raw.likes)
  const commentsCount = asNonNegativeNumber(raw.commentsCount) ?? 0

  return {
    id,
    description,
    createdAt,
    syncedDescription: description,
    likes,
    color: asString(raw.color) ?? undefined,
    columnIndex: asNonNegativeNumber(raw.columnIndex) ?? fallback.columnIndex,
    rowIndex: asNonNegativeNumber(raw.rowIndex ?? raw.index) ?? fallback.rowIndex,
    groupId: asPositiveNumber(raw.groupId) ?? fallback.groupId,
    commentsCount,
    isDraft: false,
  }
}

const normalizeGroup = (
  payload: unknown,
  fallback: {
    id: number
    columnId: number
    orderIndex: number
    columnIndex: number
  },
): RetroGroup => {
  const raw = isRecord(payload) ? payload : {}
  const id = asPositiveNumber(raw.id) ?? fallback.id
  const itemsPayload = Array.isArray(raw.items) ? raw.items : []

  const items = itemsPayload
    .map((itemPayload, itemIndex) => {
      return normalizeItem(itemPayload, {
        id: itemIndex + 1,
        columnIndex: fallback.columnIndex,
        rowIndex: itemIndex,
        groupId: id,
      })
    })
    .map((item, index) => ({
      ...item,
      columnIndex: fallback.columnIndex,
      groupId: id,
      rowIndex: index,
    }))

  return {
    id,
    columnId: asPositiveNumber(raw.columnId) ?? fallback.columnId,
    name: asString(raw.name) ?? `Group ${id}`,
    description: asString(raw.description) ?? '',
    color: normalizeColumnColor(raw.color, fallback.columnIndex),
    orderIndex: asNonNegativeNumber(raw.orderIndex ?? raw.rowIndex ?? raw.index) ?? fallback.orderIndex,
    isNameEditing: raw.isNameEditing === true,
    items,
    isDraft: false,
  }
}

const normalizeEntryType = (value: unknown): 'ITEM' | 'GROUP' | null => {
  if (value === 'ITEM' || value === 'GROUP') {
    return value
  }

  return null
}

const normalizeColumnEntries = (
  payload: unknown,
  context: {
    columnId: number
    columnIndex: number
    rootItemMap: Map<number, RetroItem>
    groupMap: Map<number, RetroGroup>
  },
): RetroColumnEntry[] => {
  if (!Array.isArray(payload)) {
    return []
  }

  const entries: RetroColumnEntry[] = []

  for (const [entryIndex, entryPayload] of payload.entries()) {
    const raw = isRecord(entryPayload) ? entryPayload : {}
    const type = normalizeEntryType(raw.type)
    if (!type) {
      continue
    }

    const orderIndex = asNonNegativeNumber(raw.orderIndex ?? raw.rowIndex ?? raw.index) ?? entryIndex

    if (type === 'ITEM') {
      const rawItem = isRecord(raw.item) ? raw.item : raw
      const itemId = asPositiveNumber(rawItem.id)
      const item =
        (itemId ? context.rootItemMap.get(itemId) : null) ??
        normalizeItem(rawItem, {
          id: itemId ?? entryIndex + 1,
          columnIndex: context.columnIndex,
          rowIndex: orderIndex,
          groupId: null,
        })

      item.columnIndex = context.columnIndex
      item.groupId = null
      item.rowIndex = orderIndex

      context.rootItemMap.set(item.id, item)
      entries.push({
        type: 'ITEM',
        orderIndex,
        item,
      })
      continue
    }

    const rawGroup = isRecord(raw.group) ? raw.group : raw
    const groupId = asPositiveNumber(rawGroup.id)
    const group =
      (groupId ? context.groupMap.get(groupId) : null) ??
      normalizeGroup(rawGroup, {
        id: groupId ?? entryIndex + 1,
        columnId: context.columnId,
        orderIndex,
        columnIndex: context.columnIndex,
      })

    group.columnId = context.columnId
    group.orderIndex = orderIndex
    group.items = group.items.map((item, itemIndex) => ({
      ...item,
      columnIndex: context.columnIndex,
      groupId: group.id,
      rowIndex: itemIndex,
    }))

    context.groupMap.set(group.id, group)
    entries.push({
      type: 'GROUP',
      orderIndex,
      group,
    })
  }

  return entries.sort((left, right) => left.orderIndex - right.orderIndex)
}

const deriveColumnEntries = (rootItems: RetroItem[], groups: RetroGroup[]): RetroColumnEntry[] => {
  const mixed: Array<{ orderIndex: number; entry: RetroColumnEntry }> = []

  rootItems.forEach((item, fallbackIndex) => {
    const orderIndex = asNonNegativeNumber(item.rowIndex) ?? fallbackIndex
    mixed.push({
      orderIndex,
      entry: {
        type: 'ITEM',
        orderIndex,
        item,
      },
    })
  })

  groups.forEach((group, fallbackIndex) => {
    const orderIndex = asNonNegativeNumber(group.orderIndex) ?? rootItems.length + fallbackIndex
    mixed.push({
      orderIndex,
      entry: {
        type: 'GROUP',
        orderIndex,
        group,
      },
    })
  })

  return mixed
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .map(({ entry }, index) => {
      if (entry.type === 'ITEM') {
        entry.item.rowIndex = index
        return {
          type: 'ITEM' as const,
          orderIndex: index,
          item: entry.item,
        }
      }

      entry.group.orderIndex = index
      return {
        type: 'GROUP' as const,
        orderIndex: index,
        group: entry.group,
      }
    })
}

const normalizeColumn = (columnData: unknown, columnIndex: number): RetroColumn => {
  const rawColumn = isRecord(columnData) ? columnData : {}
  const columnId = asPositiveNumber(rawColumn.id) ?? columnIndex + 1

  const rootItemsPayload = Array.isArray(rawColumn.items) ? rawColumn.items : []
  const groupsPayload = Array.isArray(rawColumn.groups) ? rawColumn.groups : []

  const rootItems = rootItemsPayload.map((itemData, rowIndex) => {
    return normalizeItem(itemData, {
      id: rowIndex + 1,
      columnIndex,
      rowIndex,
      groupId: null,
    })
  })

  const groups = groupsPayload.map((groupData, groupIndex) => {
    return normalizeGroup(groupData, {
      id: groupIndex + 1,
      columnId,
      orderIndex: groupIndex,
      columnIndex,
    })
  })

  const rootItemMap = new Map(rootItems.map((item) => [item.id, item] as const))
  const groupMap = new Map(groups.map((group) => [group.id, group] as const))

  let entries = normalizeColumnEntries(rawColumn.entries, {
    columnId,
    columnIndex,
    rootItemMap,
    groupMap,
  })

  if (entries.length === 0) {
    entries = deriveColumnEntries(rootItems, groups)
  }

  const normalizedEntries: RetroColumnEntry[] = []
  const normalizedRootItems: RetroItem[] = []
  const normalizedGroups = new Map<number, RetroGroup>()

  for (const [entryIndex, entry] of entries.entries()) {
    if (entry.type === 'ITEM') {
      const item = entry.item
      item.columnIndex = columnIndex
      item.groupId = null
      item.rowIndex = entryIndex

      normalizedRootItems.push(item)
      normalizedEntries.push({
        type: 'ITEM',
        orderIndex: entryIndex,
        item,
      })
      continue
    }

    const group = entry.group
    group.columnId = columnId
    group.orderIndex = entryIndex
    group.items = group.items.map((item, itemIndex) => ({
      ...item,
      columnIndex,
      groupId: group.id,
      rowIndex: itemIndex,
    }))

    normalizedGroups.set(group.id, group)
    normalizedEntries.push({
      type: 'GROUP',
      orderIndex: entryIndex,
      group,
    })
  }

  const normalizedGroupsList = Array.from(normalizedGroups.values()).sort(
    (left, right) => left.orderIndex - right.orderIndex,
  )

  return {
    id: columnId,
    name: asString(rawColumn.name) ?? `Column ${columnIndex + 1}`,
    description: asString(rawColumn.description) ?? '',
    color: normalizeColumnColor(rawColumn.color, columnIndex),
    isNameEditing: rawColumn.isNameEditing === true,
    isDraft: false,
    items: normalizedRootItems,
    groups: normalizedGroupsList,
    entries: normalizedEntries,
  }
}

export const normalizeColumns = (columnsData: unknown): TRetroColumn[] => {
  if (!Array.isArray(columnsData)) {
    return []
  }

  return columnsData.map((columnData, columnIndex) => normalizeColumn(columnData, columnIndex))
}
