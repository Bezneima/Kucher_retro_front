<template>
  <div class="board">
    <Sortable
      class="board-columns"
      :list="columns"
      item-key="id"
      :options="columnSortableOptions"
      @end="onColumnsReorderEnd"
    >
      <template #item="{ element }">
        <RetroColumnComponent :column="element" />
      </template>
      <template #footer>
        <button class="board-add-column" type="button" @click="onAddColumnClick">
          <span class="board-add-column__plus">+</span>
          <span>Добавить колонку</span>
        </button>
      </template>
    </Sortable>
  </div>
</template>

<style>
.board {
  margin-top: 20px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: row;
  gap: 10px;
  padding: 0px 10px;
  overflow-x: auto;
  overflow-y: hidden;
}

.board-columns {
  display: flex;
  flex-direction: row;
  gap: 30px;
  min-height: 0;
  flex: 0 0 100%;
}

.board-add-column {
  width: calc(33.33% - 10px);
  height: 100%;
  min-height: 0;
  flex-shrink: 0;
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

const columnSortableOptions = {
  handle: '.column-drag-handle',
  animation: 150,
  ghostClass: 'board-column-ghost',
}

const onColumnsReorderEnd = (evt) => {
  retroStore.reorderColumns(evt.oldIndex, evt.newIndex)
}

const onAddColumnClick = () => {
  retroStore.addColumn()
}
</script>
