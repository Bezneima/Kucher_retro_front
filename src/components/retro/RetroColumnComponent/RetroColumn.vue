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
        <input
          v-else
          ref="nameInputRef"
          class="column-header__name-input"
          type="text"
          :value="column.name"
          @input="onNameInput"
        />
        <button
          ref="menuButtonRef"
          class="column-open-menu-button"
          type="button"
          @click="onMenuButtonClick"
        >
          <SvgIcon name="menu" class="column-open-menu-button__icon" />
        </button>
      </div>
      <div v-if="column.description" class="column-description">{{ column.description }}</div>
      <RetroColumnMenu
        :is-open="isMenuOpen"
        :anchor-el="menuButtonRef"
        :column-color="column.color"
        @close="closeMenu"
        @edit-column="onEditColumnClick"
        @edit-description="onEditDescriptionClick"
        @copy-name="onCopyNameClick"
        @set-color="onSetColumnColor"
        @remove-color="onRemoveColumnColor"
        @delete-column="onDeleteColumn"
      />
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
    <ConfirmDeleteModal
      :is-open="isDeleteColumnModalOpen"
      title="Удалить колонку?"
      message="Все карточки в этой колонке будут удалены. Действие нельзя отменить."
      @close="onCloseDeleteColumnModal"
      @confirm="onConfirmDeleteColumn"
    />
    <TextEditModal
      :is-open="isEditDescriptionModalOpen"
      :value="descriptionDraft"
      title="Редактировать описание колонки"
      placeholder="Введите описание колонки"
      @close="onCloseEditDescriptionModal"
      @confirm="onConfirmEditDescription"
    />
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

.column-header__name-input {
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

.column-open-menu-button {
  margin-left: auto;
  width: 20px;
  height: 20px;
  padding: 3px;
  border: none;
  background: transparent;
  border-radius: 2px;
  cursor: pointer;
  color: #666;
  flex-shrink: 0;
}

.column-open-menu-button:hover {
  background-color: color-mix(in srgb, var(--column-bg) 80%, black);
  color: #181818;
}

.column-open-menu-button__icon {
  width: 100%;
  height: 100%;
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

.column-description {
  min-height: 20px;
  padding: 0 8px;
  font-size: 13px;
  line-height: 1.4;
  color: #4d4d4d;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal/ConfirmDeleteModal.vue'
import TextEditModal from '@/components/common/TextEditModal/TextEditModal.vue'
import RetroColumnItem from '../RetroColumItem/RetroColumnItem.vue'
import RetroColumnMenu from './RetroColumnMenu.vue'
import { useRetroStore } from '@/stores/RetroStore'
const retroStore = useRetroStore()

const props = defineProps<{
  column: TRetroColumn
}>()

const { column } = props
const columnHeaderRef = ref<HTMLElement | null>(null)
const nameInputRef = ref<HTMLInputElement | null>(null)
const menuButtonRef = ref<HTMLElement | null>(null)
const isMenuOpen = ref(false)
const isDeleteColumnModalOpen = ref(false)
const isEditDescriptionModalOpen = ref(false)
const descriptionDraft = ref('')
const sortableKey = computed(() => `${column.id}:${column.items.map((item) => item.id).join(',')}`)
const defaultColumnColor = '#f0f0f0'

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

const onMenuButtonClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const onEditColumnClick = () => {
  closeMenu()
  retroStore.updateColumnNameStart(column.id)
}

const onEditDescriptionClick = () => {
  closeMenu()
  descriptionDraft.value = column.description ?? ''
  isEditDescriptionModalOpen.value = true
}

const onCloseEditDescriptionModal = () => {
  isEditDescriptionModalOpen.value = false
}

const onConfirmEditDescription = (value: string) => {
  retroStore.updateColumnDescription(column.id, value)
  isEditDescriptionModalOpen.value = false
}

const onCopyNameClick = async () => {
  closeMenu()
  const textToCopy = column.name.trim()
  if (!textToCopy) return

  try {
    await navigator.clipboard.writeText(textToCopy)
  } catch (error) {
    console.error('Failed to copy column name', error)
  }
}

const onSetColumnColor = (color: string) => {
  retroStore.updateColumnColor(column.id, color)
}

const onRemoveColumnColor = () => {
  retroStore.updateColumnColor(column.id, defaultColumnColor)
}

const onDeleteColumn = () => {
  closeMenu()
  isDeleteColumnModalOpen.value = true
}

const onCloseDeleteColumnModal = () => {
  isDeleteColumnModalOpen.value = false
}

const onConfirmDeleteColumn = () => {
  isDeleteColumnModalOpen.value = false
  retroStore.deleteColumn(column.id)
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
