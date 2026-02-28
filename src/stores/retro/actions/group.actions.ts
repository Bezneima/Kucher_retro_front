import { retroBoardService } from '@/api/services/retroBoardService'
import { getBoardColumns, getBoardId } from '../helpers/selectors'
import { recalculateItemIndices } from '../helpers/positions'
import type { ColumnColor, RetroGroup, TRetroBoardState } from '../types'

type TGroupActionsContext = TRetroBoardState & {
  loadBoardColumns: (boardId: number) => Promise<void>
}

const defaultGroupColor: ColumnColor = {
  columnColor: '#d7dfeb',
  itemColor: '#d7dfeb',
  buttonColor: '#d7dfeb',
}

const normalizeGroupResponse = (
  payload: unknown,
  fallback: {
    id: number
    columnId: number
    name: string
    description: string
    color: ColumnColor
  },
): RetroGroup => {
  const raw = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}

  const groupId = Number(raw.id)
  const columnId = Number(raw.columnId)
  const orderIndex = Number(raw.orderIndex)

  return {
    id: Number.isInteger(groupId) && groupId > 0 ? groupId : fallback.id,
    columnId: Number.isInteger(columnId) && columnId > 0 ? columnId : fallback.columnId,
    name: typeof raw.name === 'string' ? raw.name : fallback.name,
    description: typeof raw.description === 'string' ? raw.description : fallback.description,
    color:
      typeof raw.color === 'object' && raw.color !== null
        ? ({
            columnColor:
              typeof (raw.color as Record<string, unknown>).columnColor === 'string'
                ? ((raw.color as Record<string, unknown>).columnColor as string)
                : fallback.color.columnColor,
            itemColor:
              typeof (raw.color as Record<string, unknown>).itemColor === 'string'
                ? ((raw.color as Record<string, unknown>).itemColor as string)
                : fallback.color.itemColor,
            buttonColor:
              typeof (raw.color as Record<string, unknown>).buttonColor === 'string'
                ? ((raw.color as Record<string, unknown>).buttonColor as string)
                : fallback.color.buttonColor,
          } satisfies ColumnColor)
        : fallback.color,
    orderIndex: Number.isInteger(orderIndex) && orderIndex >= 0 ? orderIndex : 0,
    isNameEditing: false,
    items: [],
    isDraft: false,
  }
}

export const groupActions = {
  async createGroup(this: TGroupActionsContext, columnId: number, name = 'Новая группа') {
    const columns = getBoardColumns(this)
    const columnIndex = columns.findIndex((column) => column.id === columnId)
    if (columnIndex < 0) {
      throw new Error(`Column id ${columnId} not found`)
    }

    const column = columns[columnIndex]
    if (!column) {
      throw new Error(`Column id ${columnId} not found`)
    }

    const maxGroupId = columns
      .flatMap((entry) => entry.groups)
      .reduce((maxId, group) => Math.max(maxId, group.id), 0)

    const draftGroup: RetroGroup = {
      id: maxGroupId + Date.now() + 1,
      columnId,
      name,
      description: '',
      color: { ...defaultGroupColor },
      orderIndex: column.entries.length,
      isNameEditing: false,
      items: [],
      isDraft: true,
    }

    column.groups.push(draftGroup)
    column.entries.push({
      type: 'GROUP',
      orderIndex: column.entries.length,
      group: draftGroup,
    })

    recalculateItemIndices(columns)
    const board = this.board[0]
    if (board) {
      board.columns = [...columns]
      this.board = [{ ...board }]
    }

    try {
      const created = await retroBoardService.createGroup(columnId, {
        name: draftGroup.name,
        description: draftGroup.description,
        color: draftGroup.color,
      })

      const normalized = normalizeGroupResponse(created, {
        id: draftGroup.id,
        columnId,
        name: draftGroup.name,
        description: draftGroup.description,
        color: draftGroup.color,
      })

      draftGroup.id = normalized.id
      draftGroup.name = normalized.name
      draftGroup.description = normalized.description
      draftGroup.color = normalized.color
      draftGroup.isDraft = false
      recalculateItemIndices(columns)

      if (board) {
        board.columns = [...columns]
        this.board = [{ ...board }]
      }
    } catch (error) {
      column.groups = column.groups.filter((group) => group.id !== draftGroup.id)
      column.entries = column.entries.filter(
        (entry) => !(entry.type === 'GROUP' && entry.group.id === draftGroup.id),
      )
      recalculateItemIndices(columns)
      if (board) {
        board.columns = [...columns]
        this.board = [{ ...board }]
      }
      throw error
    }
  },

  async updateGroupName(this: TGroupActionsContext, groupId: number, name: string) {
    const normalizedName = name.trim()
    if (!normalizedName) {
      return
    }

    for (const column of getBoardColumns(this)) {
      const group = column.groups.find((entry) => entry.id === groupId)
      if (!group) {
        continue
      }

      const previousName = group.name
      group.name = normalizedName

      try {
        await retroBoardService.updateGroupName(groupId, normalizedName)
      } catch (error) {
        group.name = previousName
        throw error
      }

      return
    }
  },

  async updateGroupColor(this: TGroupActionsContext, groupId: number, color: ColumnColor) {
    for (const column of getBoardColumns(this)) {
      const group = column.groups.find((entry) => entry.id === groupId)
      if (!group) {
        continue
      }

      const previousColor = { ...group.color }
      group.color = { ...color }

      try {
        await retroBoardService.updateGroupColor(groupId, color)
      } catch (error) {
        group.color = previousColor
        throw error
      }

      return
    }
  },

  async updateGroupDescription(this: TGroupActionsContext, groupId: number, description: string) {
    for (const column of getBoardColumns(this)) {
      const group = column.groups.find((entry) => entry.id === groupId)
      if (!group) {
        continue
      }

      const previousDescription = group.description
      group.description = description

      try {
        await retroBoardService.updateGroupDescription(groupId, description)
      } catch (error) {
        group.description = previousDescription
        throw error
      }

      return
    }
  },

  async deleteGroup(this: TGroupActionsContext, groupId: number) {
    const boardId = getBoardId(this)

    await retroBoardService.deleteGroup(groupId)
    if (boardId) {
      await this.loadBoardColumns(boardId)
    }
  },

  async addItemToGroup(this: any, columnId: number, groupId: number) {
    const columns = getBoardColumns(this)
    const column = columns.find((entry) => entry.id === columnId)
    const group = column?.groups.find((entry) => entry.id === groupId)

    if (!column || !group) {
      throw new Error('Group not found')
    }

    const maxItemId = columns
      .flatMap((entry) => [
        ...entry.items,
        ...entry.groups.flatMap((columnGroup) => columnGroup.items),
      ])
      .reduce((maxId, item) => Math.max(maxId, item.id), 0)

    const draftId = maxItemId + Date.now() + 1
    const draftItem = {
      id: draftId,
      description: 'Напишите описание нового элемента',
      createdAt: '',
      syncedDescription: undefined,
      likes: [],
      commentsCount: 0,
      isDraft: true,
      color: undefined,
      columnIndex: columns.findIndex((entry) => entry.id === columnId),
      rowIndex: group.items.length,
      groupId,
    }

    group.items.push(draftItem)
    recalculateItemIndices(columns)

    const board = this.board[0]
    if (board) {
      board.columns = [...columns]
      this.board = [{ ...board }]
    }

    this.setActiveItemId(draftId)
  },
}
