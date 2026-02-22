import { defineStore } from 'pinia'
import { createRetroState } from './retro/state'
import { retroGetters } from './retro/getters'
import { retroActions } from './retro/actions'

export { goodCardColors, availableColors } from './retro/constants'
export type {
  TRetroColumnItem,
  TRetroColumnColor,
  TRetroColumn,
  TRetroBoard,
  TRetroCurrentUser,
  TItemPositionChange,
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
