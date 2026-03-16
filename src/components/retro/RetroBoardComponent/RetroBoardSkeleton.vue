<template>
  <div class="board board-skeleton" aria-hidden="true">
    <div class="board-columns board-skeleton-columns" :style="boardColumnsStyle">
      <div v-for="index in normalizedCount" :key="index" class="column board-skeleton-column">
        <div class="board-skeleton-column__top">
          <div class="board-skeleton-shimmer board-skeleton-chip" />
          <div class="board-skeleton-shimmer board-skeleton-title" />
          <div class="board-skeleton-shimmer board-skeleton-description" />
          <div class="board-skeleton-shimmer board-skeleton-add-button" />
        </div>

        <div class="board-skeleton-column__content">
          <div class="board-skeleton-card-group">
            <div class="board-skeleton-shimmer board-skeleton-card board-skeleton-card--short" />
            <div class="board-skeleton-shimmer board-skeleton-card" />
            <div class="board-skeleton-shimmer board-skeleton-card board-skeleton-card--tall" />
          </div>
          <div class="board-skeleton-card-group">
            <div class="board-skeleton-shimmer board-skeleton-card" />
            <div class="board-skeleton-shimmer board-skeleton-card board-skeleton-card--short" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  count?: number
}>()

const MAX_VISIBLE_COLUMNS = 6
const normalizedCount = computed(() => {
  const count = Number(props.count)
  return Number.isInteger(count) && count > 0 ? count : 3
})
const boardColumnsStyle = computed(() => {
  const visibleColumns = Math.min(Math.max(normalizedCount.value, 1), MAX_VISIBLE_COLUMNS)
  return { '--visible-columns': String(visibleColumns) }
})
</script>

<style scoped>
.board {
  position: relative;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 10px;
  padding: 0 10px;
  overflow-x: auto;
  overflow-y: hidden;
}

.board-columns {
  --columns-gap: 16px;
  --visible-columns: 1;
  --board-column-width: calc(
    (100% - (var(--columns-gap) * (var(--visible-columns) - 1))) / var(--visible-columns)
  );
  display: flex;
  flex-direction: row;
  gap: var(--columns-gap);
  min-height: 0;
  flex: 0 0 100%;
  padding-bottom: 30px;
}

.board-columns > .column {
  width: var(--board-column-width);
  flex: 0 0 var(--board-column-width);
  box-sizing: border-box;
}

.board-skeleton-column {
  min-height: 100%;
  border-radius: 24px;
  padding: 18px 16px 20px;
  background: linear-gradient(180deg, #dde6f1 0%, #cfdbea 100%);
  border: 1px solid rgba(162, 178, 199, 0.95);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.board-skeleton-column__top {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.board-skeleton-column__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 14px;
}

.board-skeleton-card-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.board-skeleton-shimmer {
  background: linear-gradient(90deg, #bac9db 0%, #e2ebf7 50%, #bac9db 100%);
  background-size: 200% 100%;
  animation: board-skeleton-loading 1.2s ease-in-out infinite;
}

.board-skeleton-chip {
  width: 40px;
  height: 26px;
  border-radius: 999px;
}

.board-skeleton-title {
  width: 68%;
  height: 28px;
  border-radius: 10px;
}

.board-skeleton-description {
  width: 52%;
  height: 16px;
  border-radius: 8px;
}

.board-skeleton-add-button {
  width: 46px;
  height: 46px;
  border-radius: 16px;
}

.board-skeleton-card {
  height: 78px;
  border-radius: 18px;
}

.board-skeleton-card--short {
  height: 58px;
}

.board-skeleton-card--tall {
  height: 108px;
}

@keyframes board-skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
