<template>
  <div class="board">
    <p v-if="columnsReorderError" class="board-reorder-error">{{ columnsReorderError }}</p>
    <Sortable
      :key="columnsSortableKey"
      class="board-columns"
      :style="boardColumnsStyle"
      :list="columns"
      item-key="id"
      :options="columnSortableOptions"
      @end="onColumnsReorderEnd"
    >
      <template #item="{ element }">
        <RetroColumnComponent :column="element" />
      </template>
      <!-- <template #footer>
        <button class="board-add-column" type="button" @click="onAddColumnClick">
          <span class="board-add-column__plus">+</span>
          <span>Добавить колонку</span>
        </button>
      </template> -->
    </Sortable>
  </div>
</template>

<style>
.board {
  position: relative;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 10px;
  padding: 0px 10px;
  overflow-x: auto;
  overflow-y: hidden;
}

.board-reorder-error {
  position: absolute;
  top: 6px;
  left: 10px;
  z-index: 2;
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e5b4b4;
  background: #fff;
  color: #b3261e;
  font-size: 12px;
  line-height: 1.3;
}

.board-columns {
  --columns-gap: 30px;
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

.board-columns > .column,
.board-columns > .board-add-column {
  width: var(--board-column-width);
  flex: 0 0 var(--board-column-width);
  box-sizing: border-box;
}

.board-add-column {
  height: 100%;
  min-height: 0;
  border: 1px dashed currentColor;
  background-color: #f0f0f0;
  color: #222;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
}

.board-add-column:hover {
  color: #111;
  border-color: currentColor;
  background-color: #f0f0f0;
}

.board-add-column__plus {
  font-size: 24px;
  line-height: 1;
}

:deep(.board-column-ghost) {
  opacity: 0.4;
}
</style>

<script setup>
import { Sortable } from 'sortablejs-vue3'
import { computed } from 'vue'
import { useRetroStore } from '../../../stores/RetroStore'
import RetroColumnComponent from '../RetroColumnComponent/RetroColumn.vue'

const retroStore = useRetroStore()
const columns = computed(() => retroStore.getBoardColumns)
const isColumnsReorderPending = computed(() => retroStore.getIsColumnsReorderPending)
const columnsReorderError = computed(() => retroStore.getColumnsReorderError)
const columnsSortableKey = computed(() => columns.value.map((column) => column.id).join(','))
const MAX_VISIBLE_COLUMNS = 6
const boardColumnsStyle = computed(() => {
  const visibleColumns = Math.min(Math.max(columns.value.length, 1), MAX_VISIBLE_COLUMNS)
  return { '--visible-columns': String(visibleColumns) }
})

const columnSortableOptions = computed(() => ({
  handle: '.column-drag-handle',
  animation: 150,
  ghostClass: 'board-column-ghost',
  disabled: isColumnsReorderPending.value,
}))

const onColumnsReorderEnd = (evt) => {
  if (isColumnsReorderPending.value) return
  if (typeof evt.oldIndex !== 'number' || typeof evt.newIndex !== 'number') return
  if (evt.oldIndex === evt.newIndex) return
  void retroStore.reorderColumns(evt.oldIndex, evt.newIndex)
}

const onAddColumnClick = () => {
  retroStore.addColumn()
}
</script>
