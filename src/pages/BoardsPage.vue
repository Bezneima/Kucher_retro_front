<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { httpClient } from '@/api/httpClient'

type TBoard = {
  id: number
  name: string
  date: string
  description: string
}

const boards = ref<TBoard[]>([])
const isLoading = ref(false)
const isCreating = ref(false)
const errorMessage = ref('')
const router = useRouter()

const hasBoards = computed(() => boards.value.length > 0)

const getApiErrorMessage = (error: unknown) => {
  if (!(error instanceof AxiosError)) {
    return 'Не удалось загрузить список досок'
  }

  const data = error.response?.data as { message?: unknown } | undefined
  if (Array.isArray(data?.message)) {
    return data.message.join(', ')
  }
  if (typeof data?.message === 'string') {
    return data.message
  }

  return error.message || 'Не удалось загрузить список досок'
}

const normalizeBoards = (rawBoards: unknown): TBoard[] => {
  if (!Array.isArray(rawBoards)) {
    return []
  }

  return rawBoards
    .map((item) => {
      const board = item as Partial<TBoard>
      const id = Number(board.id)

      if (!id) {
        return null
      }

      return {
        id,
        name: typeof board.name === 'string' ? board.name : `Board ${id}`,
        date: typeof board.date === 'string' ? board.date : '',
        description: typeof board.description === 'string' ? board.description : '',
      }
    })
    .filter((board): board is TBoard => Boolean(board))
}

const loadBoards = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await httpClient.get('/retro/boards')
    boards.value = normalizeBoards(response.data)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

const createBoard = async () => {
  isCreating.value = true
  errorMessage.value = ''

  try {
    const currentDate = new Date().toISOString().slice(0, 10)

    await httpClient.post('/retro/boards', {
      name: `Новая доска ${currentDate}`,
      date: currentDate,
      description: '',
    })

    await loadBoards()
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    isCreating.value = false
  }
}

const openBoard = (boardId: number) => {
  void router.push({ name: 'board', params: { id: boardId } })
}

onMounted(() => {
  void loadBoards()
})
</script>

<template>
  <main class="boards-page">
    <section class="boards-header">
      <h1 class="boards-title">Мои доски</h1>
      <button class="boards-reload" :disabled="isLoading" type="button" @click="loadBoards">
        {{ isLoading ? 'Загрузка...' : 'Обновить' }}
      </button>
    </section>

    <p v-if="errorMessage" class="boards-error">{{ errorMessage }}</p>

    <section class="boards-empty">
      <p class="boards-empty-text">У вас пока нет досок</p>
      <button class="boards-create" :disabled="isCreating" type="button" @click="createBoard">
        {{ isCreating ? 'Создание...' : 'Создать доску' }}
      </button>
    </section>

    <ul class="boards-list">
      <li
        v-for="board in boards"
        :key="board.id"
        class="boards-item"
        role="button"
        tabindex="0"
        @click="openBoard(board.id)"
        @keydown.enter="openBoard(board.id)"
        @keydown.space.prevent="openBoard(board.id)"
      >
        <h2 class="board-name">{{ board.name }}</h2>
        <p v-if="board.date" class="board-date">{{ board.date }}</p>
        <p v-if="board.description" class="board-description">{{ board.description }}</p>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.boards-page {
  min-height: 100%;
  box-sizing: border-box;
  padding: 28px 20px;
  background: #f7f9fc;
}

.boards-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.boards-title {
  margin: 0;
  font-size: 28px;
}

.boards-reload {
  border: 1px solid #c9d7ec;
  border-radius: 8px;
  background: #fff;
  padding: 9px 14px;
  cursor: pointer;
}

.boards-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.boards-item {
  background: #fff;
  border: 1px solid #dde7f4;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.boards-item:hover,
.boards-item:focus-visible {
  border-color: #1e88e5;
  box-shadow: 0 0 0 2px rgba(30, 136, 229, 0.16);
  outline: none;
}

.board-name {
  margin: 0;
  font-size: 18px;
}

.board-date {
  margin: 8px 0 0;
  color: #5b6f8a;
}

.board-description {
  margin: 8px 0 0;
  color: #415067;
}

.boards-error {
  color: #b3261e;
}

.boards-empty {
  color: #617086;
  display: grid;
  gap: 10px;
}

.boards-empty-text {
  margin: 0;
}

.boards-create {
  width: fit-content;
  border: 1px solid #1e88e5;
  background: #1e88e5;
  color: #fff;
  border-radius: 8px;
  padding: 10px 14px;
  cursor: pointer;
}

.boards-reload:disabled,
.boards-create:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
