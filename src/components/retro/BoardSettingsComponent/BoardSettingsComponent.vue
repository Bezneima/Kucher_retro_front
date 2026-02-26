<template>
  <section class="board-settings-strip" aria-label="Настройки доски">
    <div class="board-settings-strip-inner">
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
        <SvgIcon name="addColumn" class="board-add-column-button__icon" />
      </button>

      <button
        type="button"
        class="board-nav-button board-nav-button--prev"
        :disabled="!previousBoardId || isBoardNavigationLoading"
        @click="navigateToBoard(previousBoardId)"
      >
        <SvgIcon name="triangleRight" class="board-nav-button__icon" />
        <span>Следующая доска</span>
      </button>

      <button
        type="button"
        class="board-nav-button board-nav-button--next"
        :disabled="!nextBoardId || isBoardNavigationLoading"
        @click="navigateToBoard(nextBoardId)"
      >
        <span>Прошлая доска</span>
        <SvgIcon name="triangleRight" class="board-nav-button__icon" />
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

      <BoardShareControl />
    </div>
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
import BoardShareControl from './BoardShareControl.vue'

const retroStore = useRetroStore()
const route = useRoute()
const router = useRouter()
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

watch(
  currentBoardId,
  (boardId) => {
    void loadTeamBoardsNavigation(boardId)
  },
  { immediate: true },
)
</script>

<style scoped>
.board-settings-strip {
  height: 68px;
  width: calc(100% + (var(--teams-page-padding, 20px) * 2));
  margin-left: calc(var(--teams-page-padding, 20px) * -1);
  margin-right: calc(var(--teams-page-padding, 20px) * -1);
  box-sizing: border-box;
}

.board-settings-strip-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 var(--teams-page-padding, 20px);
  box-sizing: border-box;
}

.board-search {
  display: flex;
  align-items: center;
}

.board-search__label {
  font-size: 14px;
  font-weight: 500;
  color: #566074;
}

.board-search__input {
  width: min(200px, calc(100vw - 180px));
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
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
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
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
  font-size: 13px;
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
  margin-right: auto;
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

  .board-nav-button {
    flex: 1 1 calc(50% - 4px);
    justify-content: center;
  }

  .board-nav-button--next {
    margin-right: 0;
  }
}
</style>
