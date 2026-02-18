<template>
  <div class="column" :style="{ '--column-bg': column.color, '--item-bg': column.color }">
    <div class="column-top">
      <div ref="columnHeaderRef" class="column-header" @click="onColumnHeaderClick">
        <span
          class="column-drag-handle"
          title="Перетащите для изменения порядка колонки"
          @click.stop
        >
          <img src="@/assets/icons/svg/menu.svg" alt="" class="column-drag-handle__icon" />
        </span>
        <span v-if="!column.isNameEditing" class="column-header__title">{{ column.name }}</span>
        <input v-else ref="nameInputRef" type="text" :value="column.name" @input="onNameInput" />
      </div>
      <button class="column-add-button" @click="onAddItemClick">+</button>
    </div>
    <Sortable
      :key="sortableKey"
      class="sortable-container"
      :list="column?.items ?? []"
      itemKey="id"
      :options="options"
      @choose="onColumnChoose"
      @add="onColumnAdd"
      @update="onColumnUpdate"
    >
      <template #item="{ element }">
        <RetroColumnItem :element="element" />
      </template>
    </Sortable>
  </div>
</template>

<style>
.column {
  --column-bg: #f0f0f0;
  width: calc(33.33% - 10px);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.column-top {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  padding: 6px 4px;
}

.column-header {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  font-weight: 500;
  font-size: 16px;
  border-radius: 2px;
}

.column-header__title {
  flex: 1;
  min-width: 0;
}

.column-drag-handle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: grab;
  border-radius: 2px;
  color: #666;
}

.column-drag-handle:active {
  cursor: grabbing;
}

.column-drag-handle:hover {
  background-color: color-mix(in srgb, var(--column-bg) 80%, black);
  color: #181818;
}

.column-drag-handle__icon {
  width: 16px;
  height: 16px;
  display: block;
}

.column-add-button {
  width: 100%;
  min-height: 38px;
  border: 1px solid transparent;
  background-color: #f0f0f0;
  color: #181818;
  border-radius: 0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
}

.column-add-button:hover {
  border: 1px solid color-mix(in srgb, var(--column-bg) 80%, black);
}

.sortable-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.item {
  background-color: #f0f0f0;
}
</style>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick, computed } from 'vue'
import { Sortable } from 'sortablejs-vue3'
import { type TRetroColumn } from '@/stores/RetroStore'
import RetroColumnItem from '../RetroColumItem/RetroColumnItem.vue'
import { useRetroStore } from '@/stores/RetroStore'
const retroStore = useRetroStore()

const props = defineProps<{
  column: TRetroColumn
}>()

const { column } = props
const columnHeaderRef = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
const sortableKey = computed(() => `${column.id}:${column.items.map((item) => item.id).join(',')}`)

const options = {
  group: 'shared',
  draggable: '.card-container:not(.card-container-is-editing)',
  animation: 150,
  swapThreshold: 0.65,
  emptyInsertThreshold: 20,
}

const handleClickOutside = (event: MouseEvent) => {
  if (columnHeaderRef.value && !columnHeaderRef.value.contains(event.target as Node)) {
    retroStore.updateColumnNameEnd(column.id)
    document.removeEventListener('mousedown', handleClickOutside)
  }
}

watch(
  () => column.isNameEditing,
  (isEditing) => {
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside)
      nextTick(() => nameInputRef.value?.focus())
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

const onColumnHeaderClick = () => {
  retroStore.updateColumnNameStart(column.id)
}

const onNameInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  retroStore.updateColumnName(column.id, target.value)
  retroStore.setActiveItemId(column.id)
}

const onColumnChoose = (event: any) => {
  console.log('choose', event.item.id)
}

const onColumnAdd = (event: any) => {
  const movedItemId = Number((event.item as HTMLElement | null)?.id)
  if (!Number.isFinite(movedItemId) || movedItemId <= 0) return

  retroStore.moveItemByIdToColumn(movedItemId, column.id, event.newIndex)
  retroStore.setActiveItemId(null)
}

const onColumnUpdate = (event: any) => {
  const movedItemId = Number((event.item as HTMLElement | null)?.id)
  if (!Number.isFinite(movedItemId) || movedItemId <= 0) return

  retroStore.moveItemByIdToColumn(movedItemId, column.id, event.newIndex)
  retroStore.setActiveItemId(null)
}

const onAddItemClick = () => {
  retroStore.addItemToColumn(column.id)
}
</script>
