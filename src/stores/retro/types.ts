export type TRetroColumnItem = {
  id: number
  description: string
  syncedDescription?: string
  // users id who liked the item
  likes: string[]
  color?: string
  isDraft?: boolean
  columnIndex: number
  rowIndex: number
}

export type TRetroColumn = {
  id: number
  name: string
  description: string
  color: string
  isNameEditing: boolean
  items: TRetroColumnItem[]
}

export type TRetroBoard = {
  id: number
  name: string
  date: string
  description: string
  columns: TRetroColumn[]
}

/** Элемент с изменившейся позицией для отправки на бек */
export type TItemPositionChange = {
  item: TRetroColumnItem
  oldColumnId: number
  oldRowIndex: number
  newColumnId: number
  newRowIndex: number
}

export type TItemPositionPayloadChange = {
  itemId: number
  newColumnId: number
  newRowIndex: number
}

export type TRetroBoardState = {
  board: TRetroBoard[]
  isBoardLoading: boolean
  activeItemId: number | null
  /** Позиции элементов на момент последней синхронизации с беком (или загрузки) */
  lastSyncedPositions: Record<number, { columnId: number; rowIndex: number }>
}
