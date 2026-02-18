import { defineStore } from 'pinia'
import { createRetroState } from './retro/state'
import { retroGetters } from './retro/getters'
import { retroActions } from './retro/actions'

export { RETRO_USER_ID, goodCardColors } from './retro/constants'
export type {
  TRetroColumnItem,
  TRetroColumn,
  TRetroBoard,
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
