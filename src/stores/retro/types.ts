export type TRetroColumnItem = {
  id: number
  description: string
  createdAt?: string
  syncedDescription?: string
  // users id who liked the item
  likes: string[]
  color?: string
  isDraft?: boolean
  columnIndex: number
  rowIndex: number
}

export type TRetroColumnColor = {
  columnColor: string
  itemColor: string
  buttonColor: string
}

export type TRetroColumn = {
  id: number
  name: string
  description: string
  color: TRetroColumnColor
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

export type TRetroCurrentUser = {
  id: string | null
  email: string | null
  name: string | null
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
  currentUser: TRetroCurrentUser
  /** Позиции элементов на момент последней синхронизации с беком (или загрузки) */
  lastSyncedPositions: Record<number, { columnId: number; rowIndex: number }>
}
