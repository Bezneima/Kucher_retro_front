import { defineStore } from 'pinia'
import { createRetroState } from './retro/state'
import { retroGetters } from './retro/getters'
import { retroActions } from './retro/actions'

export { goodCardColors, availableColors } from './retro/constants'
export type {
  ColumnColor,
  RetroItem,
  RetroGroup,
  RetroColumnEntry,
  RetroColumn,
  RetroBoardSettings,
  SyncPositionsResult,
  TRetroColumnItem,
  TRetroColumnColor,
  TRetroGroup,
  TRetroColumnEntry,
  TRetroColumn,
  TRetroBoard,
  TRetroCurrentUser,
  TRetroUserBoardRole,
  TItemPositionChange,
  TItemPositionPayloadChange,
  TGroupPositionPayloadChange,
  TRetroBoardState,
} from './retro/types'

export const retroStore = defineStore('retro', {
  state: createRetroState,
  getters: retroGetters,
  actions: retroActions,
})

export const useRetroStore = () => {
  return retroStore()
}
