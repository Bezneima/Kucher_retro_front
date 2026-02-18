<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AxiosError } from 'axios'
import { httpClient } from '@/api/httpClient'

type TBoard = {
  id: number
  name: string
  date: string
  description: string
}

const boards = ref<TBoard[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

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

    <section v-else-if="!isLoading && !hasBoards" class="boards-empty">
      У вас пока нет досок
    </section>

    <ul v-else class="boards-list">
      <li v-for="board in boards" :key="board.id" class="boards-item">
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
}

.boards-reload:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
