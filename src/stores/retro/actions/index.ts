import { boardActions } from './board.actions'
import { itemActions } from './item.actions'
import { columnActions } from './column.actions'
import { positionActions } from './position.actions'
import { currentUserActions } from './currentUser.actions'
import { realtimeActions } from './realtime.actions'

export const retroActions = {
  ...boardActions,
  ...itemActions,
  ...columnActions,
  ...positionActions,
  ...currentUserActions,
  ...realtimeActions,
}
