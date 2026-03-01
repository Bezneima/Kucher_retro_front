<template>
  <section class="board-settings-strip" aria-label="Настройки доски">
    <div class="board-settings-strip-inner">
      <button
        type="button"
        class="board-nav-button board-nav-button--prev"
        :disabled="!nextBoardId || isBoardNavigationLoading"
        @click="navigateToBoard(nextBoardId)"
      >
        <SvgIcon name="triangleRight" class="board-nav-button__icon" />
        <span>Прошлая доска</span>
      </button>

      <button
        type="button"
        class="board-nav-button board-nav-button--next"
        :disabled="!previousBoardId || isBoardNavigationLoading"
        @click="navigateToBoard(previousBoardId)"
      >
        <span>Следующая доска</span>
        <SvgIcon name="triangleRight" class="board-nav-button__icon" />
      </button>

      <label class="board-search" for="board-card-search-input">
        <input
          id="board-card-search-input"
          v-model="cardSearchQuery"
          class="board-search__input"
          type="search"
          placeholder="Поиск карточки"
          autocomplete="off"
        />
      </label>

      <button
        type="button"
        class="board-action-button"
        @click="onAddColumnClick"
        title="Добавить колонку"
      >
        Добавить колонку
        <SvgIcon name="addColumn" class="board-add-column-button__icon" />
      </button>

      <button
        v-if="canToggleCardsVisibilityControl"
        type="button"
        class="board-action-button board-cards-visibility-button"
        :title="cardsVisibilityButtonTitle"
        :aria-label="cardsVisibilityButtonTitle"
        :disabled="isCardsVisibilityUpdating"
        @click="onToggleCardsVisibilityClick"
      >
        <SvgIcon :name="cardsVisibilityIconName" class="board-cards-visibility-button__icon" />
      </button>

      <div class="board-timer" :class="{ 'board-timer--loading': boardTimer.isLoadingTimer.value }">
        <button
          v-if="!boardTimer.hasTimer.value"
          type="button"
          class="board-action-button board-timer__create-button"
          :disabled="
            boardTimer.isActionPending.value || boardTimer.isLoadingTimer.value || !currentBoardId
          "
          @click="onOpenCreateTimerPopover"
        >
          Таймер
        </button>

        <div
          v-if="!boardTimer.hasTimer.value && boardTimer.isCreatePopoverOpen.value"
          class="board-timer-popover"
        >
          <label class="board-timer-popover__label" for="board-timer-seconds-input">Секунды</label>
          <input
            id="board-timer-seconds-input"
            v-model="boardTimer.newTimerSeconds.value"
            class="board-timer-popover__input"
            type="number"
            min="1"
            max="86400"
            step="1"
            placeholder="300"
            @keydown.enter.prevent="onStartTimer"
          />
          <div class="board-timer-popover__actions">
            <button
              type="button"
              class="board-timer-popover__button board-timer-popover__button--primary"
              :disabled="boardTimer.isActionPending.value || !currentBoardId"
              @click="onStartTimer"
            >
              Старт
            </button>
            <button
              type="button"
              class="board-timer-popover__button"
              :disabled="boardTimer.isActionPending.value"
              @click="boardTimer.closeCreatePopover"
            >
              Отмена
            </button>
          </div>
        </div>

        <div v-else-if="boardTimer.hasTimer.value" class="board-timer__current">
          <div class="board-timer__meta">
            <span class="board-timer__time">{{ boardTimer.formattedTime.value }}</span>
            <span class="board-timer__status">{{ boardTimer.timer.value?.status }}</span>
          </div>
          <div class="board-timer__actions">
            <button
              v-if="boardTimer.isRunning.value"
              type="button"
              class="board-action-button"
              :disabled="boardTimer.isActionPending.value || !currentBoardId"
              @click="onPauseTimer"
            >
              Пауза
            </button>
            <button
              v-else-if="boardTimer.isPaused.value"
              type="button"
              class="board-action-button"
              :disabled="boardTimer.isActionPending.value || !currentBoardId"
              @click="onResumeTimer"
            >
              Продолжить
            </button>
            <button
              type="button"
              class="board-action-button board-timer__delete-button"
              :disabled="boardTimer.isActionPending.value || !currentBoardId"
              title="Удалить таймер"
              aria-label="Удалить таймер"
              @click="onDeleteTimer"
            >
              <SvgIcon name="trash" class="board-timer__delete-icon" />
            </button>
          </div>
        </div>
      </div>

      <BoardShareControl />
    </div>
    <p v-if="boardTimer.timerErrorMessage.value" class="board-timer-error">
      {{ boardTimer.timerErrorMessage.value }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  retroBoardsApiClient,
  teamsApiClient,
  toTeamBoardsApiError,
} from '@/features/teams/api/teamBoardsClient'
import type { RetroBoardSummary } from '@/features/teams/types'
import { useRetroStore } from '@/stores/RetroStore'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import { useBoardNotifications } from '@/composables/useBoardNotifications'
import { useBoardTimer } from '@/features/timer/composables/useBoardTimer'
import BoardShareControl from './BoardShareControl.vue'

const retroStore = useRetroStore()
const { pushNotification } = useBoardNotifications()
const route = useRoute()
const router = useRouter()
const boardTimer = useBoardTimer()
const teamBoards = ref<RetroBoardSummary[]>([])
const isBoardNavigationLoading = ref(false)
const isCardsVisibilityUpdating = ref(false)

const getBoardTimestamp = (value: string | null) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY
}

const sortBoardsByDateDesc = (left: RetroBoardSummary, right: RetroBoardSummary) => {
  const timestampDiff = getBoardTimestamp(right.date) - getBoardTimestamp(left.date)
  if (timestampDiff !== 0) {
    return timestampDiff
  }

  return right.id - left.id
}

const cardSearchQuery = computed({
  get: () => retroStore.getCardSearchQuery,
  set: (value: string) => {
    retroStore.setCardSearchQuery(value)
  },
})

const currentBoardId = computed(() => {
  const boardId = Number(route.params.id)
  return Number.isInteger(boardId) && boardId > 0 ? boardId : null
})
const currentTeamId = computed(() => retroStore.getCurrentBoardTeamId)
const isAllCardsHidden = computed(() => retroStore.getIsAllCardsHidden)
const currentUserRole = computed(() => retroStore.getCurrentUserTeamRole)
const canManageBoard = computed(() => {
  return currentUserRole.value === 'OWNER' || currentUserRole.value === 'ADMIN'
})
const canToggleCardsVisibilityControl = computed(() => {
  return canManageBoard.value && Boolean(currentTeamId.value)
})
const cardsVisibilityIconName = computed(() => (isAllCardsHidden.value ? 'eyeSlash' : 'eye'))
const cardsVisibilityButtonTitle = computed(() => {
  return isAllCardsHidden.value ? 'Показать содержимое карточек' : 'Скрыть содержимое карточек'
})

const currentBoardIndex = computed(() => {
  const boardId = currentBoardId.value
  if (!boardId) {
    return -1
  }

  return teamBoards.value.findIndex((board) => board.id === boardId)
})

const previousBoardId = computed(() => {
  const boardIndex = currentBoardIndex.value
  if (boardIndex <= 0) {
    return null
  }

  return teamBoards.value[boardIndex - 1]?.id ?? null
})

const nextBoardId = computed(() => {
  const boardIndex = currentBoardIndex.value
  if (boardIndex < 0) {
    return null
  }

  return teamBoards.value[boardIndex + 1]?.id ?? null
})

const resolveBoardRouteName = () => {
  return route.name === 'retro-board' ? 'retro-board' : 'board'
}

const loadTeamBoardsNavigation = async (boardId: number | null) => {
  if (!boardId) {
    teamBoards.value = []
    return
  }

  isBoardNavigationLoading.value = true
  try {
    const boards = await retroBoardsApiClient.getBoards()
    const currentBoard = boards.find((board) => board.id === boardId)

    if (!currentBoard) {
      teamBoards.value = []
      return
    }

    teamBoards.value = boards
      .filter((board) => board.teamId === currentBoard.teamId)
      .sort(sortBoardsByDateDesc)
  } catch (error) {
    console.error('[board-settings] failed to load board navigation', error)
    teamBoards.value = []
  } finally {
    isBoardNavigationLoading.value = false
  }
}

const navigateToBoard = (boardId: number | null) => {
  if (!boardId || boardId === currentBoardId.value) {
    return
  }

  void router.push({
    name: resolveBoardRouteName(),
    params: { id: boardId },
  })
}

const onAddColumnClick = () => {
  retroStore.addColumn()
}

const onToggleCardsVisibilityClick = async () => {
  if (isCardsVisibilityUpdating.value || !canManageBoard.value) {
    return
  }

  const teamId = currentTeamId.value
  const boardId = currentBoardId.value
  if (!teamId || !boardId) {
    return
  }

  isCardsVisibilityUpdating.value = true
  const nextVisibilityValue = !isAllCardsHidden.value

  try {
    const response = await teamsApiClient.updateTeamCardsVisibility(teamId, nextVisibilityValue)
    retroStore.setBoardCardsHidden(response.isAllCardsHidden)
    await retroStore.loadBoardById(boardId)
  } catch (error) {
    const apiError = toTeamBoardsApiError(error, 'Не удалось обновить режим скрытия карточек')
    if (typeof window !== 'undefined') {
      window.alert(apiError.message)
    }
  } finally {
    isCardsVisibilityUpdating.value = false
  }
}

const onOpenCreateTimerPopover = () => {
  boardTimer.openCreatePopover()
}

const onStartTimer = async () => {
  try {
    const startedTimer = await boardTimer.startTimer(currentBoardId.value)
    if (startedTimer) {
      pushNotification('success', 'Таймер запущен')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Не удалось запустить таймер'
    pushNotification('error', message)
  }
}

const onPauseTimer = async () => {
  try {
    const pausedTimer = await boardTimer.pauseTimer(currentBoardId.value)
    if (pausedTimer) {
      pushNotification('info', 'Таймер на паузе')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Не удалось поставить таймер на паузу'
    pushNotification('error', message)
  }
}

const onResumeTimer = async () => {
  try {
    const resumedTimer = await boardTimer.resumeTimer(currentBoardId.value)
    if (resumedTimer) {
      pushNotification('success', 'Таймер продолжен')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Не удалось продолжить таймер'
    pushNotification('error', message)
  }
}

const onDeleteTimer = async () => {
  try {
    const wasDeleted = await boardTimer.deleteTimer(currentBoardId.value)
    if (wasDeleted) {
      pushNotification('success', 'Таймер удален')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Не удалось удалить таймер'
    pushNotification('error', message)
  }
}

watch(
  currentBoardId,
  (boardId) => {
    void loadTeamBoardsNavigation(boardId)
    void boardTimer.loadTimer(boardId).catch((error) => {
      const message =
        error instanceof Error && error.message ? error.message : 'Не удалось загрузить таймер'
      pushNotification('error', message)
    })
  },
  { immediate: true },
)
</script>

<style scoped>
.board-settings-strip {
  min-height: 68px;
  width: calc(100% + (var(--teams-page-padding, 20px) * 2));
  margin-left: calc(var(--teams-page-padding, 20px) * -1);
  margin-right: calc(var(--teams-page-padding, 20px) * -1);
  box-sizing: border-box;
}

.board-settings-strip-inner {
  width: 100%;
  min-height: 68px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 var(--teams-page-padding, 20px);
  box-sizing: border-box;
}

.board-search {
  display: flex;
  align-items: center;
}

.board-search__label {
  font-size: 12px;
  font-weight: 500;
  color: #566074;
}

.board-search__input {
  width: min(200px, calc(100vw - 180px));
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 12px;
  color: #2f3647;
  background: #fff;
  box-sizing: border-box;
}

.board-search__input:focus {
  outline: 2px solid #8ab4ff;
  outline-offset: 0;
  border-color: #8ab4ff;
}

.board-action-button {
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  background: #fff;
  color: #2f3647;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.board-action-button:hover {
  border-color: #8ab4ff;
  color: #204380;
}

.board-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  color: #7c8699;
}

.board-add-column-button__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.board-cards-visibility-button {
  width: 36px;
  justify-content: center;
  padding: 0;
}

.board-cards-visibility-button__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.board-nav-button {
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  background: #fff;
  color: #2f3647;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.board-nav-button:hover {
  border-color: #8ab4ff;
  color: #204380;
}

.board-nav-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  color: #7c8699;
}

.board-nav-button__icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.board-nav-button--prev .board-nav-button__icon {
  transform: rotate(180deg);
}

.board-nav-button--next {
  /* margin-right: auto; */
}

.board-timer {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 36px;
}

.board-timer--loading {
  opacity: 0.7;
}

.board-timer__create-button {
  min-width: 130px;
}

.board-timer-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  width: 220px;
  border: 1px solid #d0ddec;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(19, 38, 68, 0.16);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.board-timer-popover__label {
  font-size: 12px;
  color: #52617a;
}

.board-timer-popover__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  color: #223049;
}

.board-timer-popover__input:focus {
  outline: none;
  border-color: #8ab4ff;
  box-shadow: 0 0 0 3px rgba(138, 180, 255, 0.2);
}

.board-timer-popover__actions {
  display: flex;
  gap: 8px;
}

.board-timer-popover__button {
  flex: 1;
  height: 32px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  background: #fff;
  color: #2f3647;
  cursor: pointer;
}

.board-timer-popover__button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-timer-popover__button--primary {
  background: #1e88e5;
  border-color: #1e88e5;
  color: #fff;
}

.board-timer__current {
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
}

.board-timer__meta {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.board-timer__time {
  font-size: 14px;
  font-weight: 700;
  color: #1b2f4f;
  min-width: 48px;
}

.board-timer__status {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: #5a6780;
}

.board-timer__actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.board-timer__delete-button {
  width: 32px;
  padding: 0;
  justify-content: center;
}

.board-timer__delete-icon {
  width: 14px;
  height: 14px;
}

.board-timer-error {
  margin: 4px var(--teams-page-padding, 20px) 0;
  color: #b3261e;
  font-size: 12px;
}

@media (max-width: 768px) {
  .board-settings-strip {
    height: auto;
  }

  .board-settings-strip-inner {
    flex-wrap: wrap;
    padding: 10px var(--teams-page-padding, 20px);
  }

  .board-search {
    width: 100%;
  }

  .board-search__input {
    width: 100%;
  }

  .board-timer {
    width: 100%;
  }

  .board-timer__create-button,
  .board-timer__current {
    width: 100%;
  }

  .board-timer-popover {
    width: 100%;
  }

  .board-nav-button {
    flex: 1 1 calc(50% - 4px);
    justify-content: center;
  }

  .board-nav-button--next {
    margin-right: 0;
  }
}
</style>
