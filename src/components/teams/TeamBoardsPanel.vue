<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ApiUiError, RetroBoardSummary, TeamSummary } from '@/features/teams/types'
import ReloadButton from '@/components/teams/ReloadButton.vue'

const props = defineProps<{
  team: TeamSummary | null
  boards: RetroBoardSummary[]
  canManage: boolean
  isLoading: boolean
  isCreating: boolean
  error: ApiUiError | null
  name: string
  description: string
}>()

const emit = defineEmits<{
  reload: []
  createBoard: []
  openBoard: [boardId: number]
  'update:name': [value: string]
  'update:description': [value: string]
}>()

const isCreateModalOpen = ref(false)
const isCreateSubmitPending = ref(false)
const boardSearchQuery = ref('')

const shouldShowCreateTile = computed(() => {
  return props.canManage && boardSearchQuery.value.trim().length === 0
})

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

const filteredBoards = computed(() => {
  const normalizedQuery = boardSearchQuery.value.trim().toLowerCase()
  const boardsToRender = normalizedQuery
    ? props.boards.filter((board) => board.name.toLowerCase().includes(normalizedQuery))
    : props.boards

  return [...boardsToRender].sort(sortBoardsByDateDesc)
})

const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const closeCreateModal = () => {
  if (props.isCreating) {
    return
  }

  isCreateModalOpen.value = false
  isCreateSubmitPending.value = false
}

const submitCreateBoard = () => {
  isCreateSubmitPending.value = true
  emit('createBoard')
}

watch(
  () => props.isCreating,
  (isCreating) => {
    if (isCreating || !isCreateSubmitPending.value) {
      return
    }

    if (!props.error) {
      isCreateModalOpen.value = false
    }

    isCreateSubmitPending.value = false
  },
)

watch(
  () => props.team?.id,
  () => {
    boardSearchQuery.value = ''
  },
)

const formatBoardDate = (value: string | null) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <section class="team-panel">
    <header class="team-panel-header">
      <div>
        <h2 class="team-panel-title">Ретро-доски команды</h2>
        <p v-if="team" class="team-panel-subtitle">{{ team.name }}</p>
      </div>
      <label v-if="team && !isLoading && !error && boards.length > 0" class="boards-search-label">
        <input
          v-model="boardSearchQuery"
          class="boards-search-input"
          type="text"
          maxlength="120"
          placeholder="Введите название доски"
        />
      </label>
      <div class="team-panel-actions">
        <ReloadButton
          :disabled="isLoading || !team"
          :is-loading="isLoading"
          @click="emit('reload')"
        />
      </div>
    </header>

    <div v-if="!team" class="state">
      <p class="state-title">Команда не выбрана</p>
      <p class="state-description">Выберите команду слева, чтобы увидеть ее ретро-доски.</p>
    </div>

    <template v-else>
      <div v-if="error" class="state state--error">
        <p class="state-title">{{ error.title }}</p>
        <p class="state-description">
          {{ error.description }}
          <span v-if="error.status" class="state-status">[{{ error.status }}]</span>
        </p>
      </div>

      <div v-else-if="boards.length === 0 && !canManage" class="state">
        <p class="state-title">Досок пока нет</p>
        <p class="state-description">Создайте первую доску для выбранной команды.</p>
      </div>

      <div v-else-if="boards.length > 0 && filteredBoards.length === 0" class="state">
        <p class="state-title">Доска не найдена</p>
        <p class="state-description">Попробуйте изменить поисковый запрос.</p>
      </div>

      <ul v-else class="boards-list">
        <li v-if="shouldShowCreateTile">
          <button
            class="board-item board-item--create"
            type="button"
            :disabled="isCreating || !team"
            @click="openCreateModal"
          >
            <span class="board-create-plus">+</span>
            <span class="board-create-label">Создать доску</span>
          </button>
        </li>

        <li v-for="board in filteredBoards" :key="board.id">
          <button class="board-item" type="button" @click="emit('openBoard', board.id)">
            <div class="board-item-main">
              <p class="board-item-title">{{ board.name }}</p>
              <p v-if="board.description" class="board-item-description">{{ board.description }}</p>
            </div>
            <div class="board-item-side">
              <span v-if="board.date" class="board-item-date">{{
                formatBoardDate(board.date)
              }}</span>
              <span class="board-item-open">Открыть</span>
            </div>
          </button>
        </li>
      </ul>
    </template>

    <div v-if="isCreateModalOpen" class="board-modal-overlay" @click.self="closeCreateModal">
      <div class="board-modal" role="dialog" aria-modal="true" aria-label="Создать доску">
        <button
          class="board-modal-close"
          type="button"
          :disabled="isCreating"
          @click="closeCreateModal"
        >
          ×
        </button>

        <h3 class="board-modal-title">Создать доску</h3>

        <form class="board-modal-form" @submit.prevent="submitCreateBoard">
          <label class="board-form-label">
            <span>Название</span>
            <input
              :value="name"
              class="board-form-input"
              type="text"
              maxlength="120"
              placeholder="Sprint 24 Retro"
              :disabled="isCreating"
              @input="emit('update:name', ($event.target as HTMLInputElement).value)"
            />
          </label>

          <label class="board-form-label board-form-label--description">
            <span>Описание</span>
            <textarea
              :value="description"
              class="board-form-input board-form-textarea"
              rows="3"
              maxlength="500"
              placeholder="Краткое описание ретроспективы"
              :disabled="isCreating"
              @input="emit('update:description', ($event.target as HTMLTextAreaElement).value)"
            />
          </label>

          <button class="board-form-submit" type="submit" :disabled="isCreating">
            {{ isCreating ? 'Создание...' : 'Создать' }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.team-panel {
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.team-panel-header {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  align-items: flex-start;
}

.team-panel-title {
  margin: 0;
  font-size: 20px;
}

.team-panel-subtitle {
  margin: 4px 0 0;
  color: #4c607f;
  font-size: 14px;
}

.team-panel-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
}

.boards-search-label {
  flex: 1 1 380px;
  max-width: 380px;
  min-width: 0;
  margin-left: auto;
}

.boards-search-input {
  display: block;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid #cdd9ea;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

.boards-search-input:focus {
  outline: none;
  border-color: #79a8e4;
  box-shadow: 0 0 0 3px rgba(121, 168, 228, 0.2);
}

.board-form-label {
  display: grid;
  gap: 6px;
  color: #33445f;
  font-size: 13px;
}

.board-form-label--description {
  grid-column: 1 / -1;
}

.board-form-input {
  border: 1px solid #cfdbec;
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
}

.board-form-textarea {
  resize: vertical;
}

.board-form-input:focus {
  outline: none;
  border-color: #79a8e4;
  box-shadow: 0 0 0 3px rgba(121, 168, 228, 0.2);
}

.board-form-submit {
  border: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.board-form-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(13, 24, 46, 0.45);
  display: grid;
  place-items: center;
  z-index: 1200;
  padding: 16px;
}

.board-modal {
  width: min(520px, 100%);
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
  position: relative;
}

.board-modal-title {
  margin: 0 30px 14px 0;
  font-size: 18px;
}

.board-modal-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 8px;
  background: #eff5ff;
  color: #1a4f8d;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.board-modal-close:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-modal-form {
  display: grid;
  gap: 10px;
}

.board-readonly-note {
  margin: 0;
  color: #4a5f7f;
  background: #edf4ff;
  border: 1px solid #cfe0fa;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

.boards-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.boards-list > li {
  min-width: 0;
}

.board-item {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  border: 1px solid #dce8f7;
  border-radius: 10px;
  padding: 12px;
  background: #fff;
  text-align: left;
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 10px;
  cursor: pointer;
}

.board-item:hover {
  border-color: #b9d4f6;
  box-shadow: 0 8px 20px rgba(45, 90, 150, 0.1);
}

.board-item--create {
  border-style: dashed;
  border-color: #c6ceda;
  background: #eef1f5;
  color: #4e5e74;
  place-items: center;
  place-content: center;
  text-align: center;
  gap: 6px;
}

.board-item--create:hover {
  border-color: #aeb9c8;
  box-shadow: 0 8px 20px rgba(84, 97, 118, 0.12);
  background: #e8edf3;
}

.board-item--create:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.board-create-plus {
  font-size: 36px;
  line-height: 1;
  font-weight: 500;
}

.board-create-label {
  font-size: 14px;
  font-weight: 600;
}

.board-item-main {
  min-width: 0;
  display: grid;
  gap: 4px;
  align-content: start;
}

.board-item-title {
  margin: 0;
  font-weight: 600;
  color: #1b2f4b;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.board-item-description {
  margin: 0;
  color: #4a607f;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.board-item-side {
  display: grid;
  justify-items: start;
  gap: 4px;
}

.board-item-date {
  color: #567299;
  font-size: 13px;
}

.board-item-open {
  color: #1e6fc3;
  font-size: 13px;
  font-weight: 600;
}

.board-skeleton-list {
  display: grid;
  gap: 10px;
}

.board-skeleton {
  height: 68px;
  border-radius: 10px;
  background: linear-gradient(90deg, #edf3fb 0%, #f6f9ff 45%, #edf3fb 100%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.2s ease-in-out infinite;
}

.state {
  border: 1px dashed #d0dded;
  border-radius: 12px;
  padding: 14px;
  background: #f8fbff;
}

.state--error {
  border-color: #efc8c8;
  background: #fff5f5;
}

.state-title {
  margin: 0;
  font-weight: 600;
  color: #1f3050;
}

.state-description {
  margin: 6px 0 0;
  color: #4c5f7f;
}

.state-status {
  color: #7a8daa;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 720px) {
  .team-panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .team-panel-actions {
    justify-content: flex-end;
  }

  .boards-search-label {
    max-width: none;
    width: 100%;
    flex: auto;
  }
}

@media (max-width: 1200px) {
  .boards-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .boards-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .boards-list {
    grid-template-columns: 1fr;
  }

  .board-item {
    aspect-ratio: auto;
    min-height: 148px;
  }
}
</style>
