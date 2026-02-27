<template>
  <div
    class="column"
    :style="{
      '--column-bg': column.color.columnColor,
      '--item-bg': column.color.itemColor,
      '--button-bg': column.color.buttonColor,
    }"
  >
    <div class="column-top">
      <div class="column-header">
        <span
          class="column-drag-handle"
          title="Перетащите для изменения порядка колонки"
          @click.stop
        >
          <img src="@/assets/icons/svg/moveColumn.svg" alt="" class="column-drag-handle__icon" />
        </span>

        <span
          ref="menuButtonRef"
          class="column-open-menu-button"
          type="button"
          @click="onMenuButtonClick"
        >
          <img src="@/assets/icons/svg/columnMenu.svg" alt="" class="column-drag-handle__icon" />
        </span>
      </div>
      <div class="column-header__title-container">
        <span class="column-header__title" @click="onEditColumnClick">{{ column.name }}</span>
      </div>
      <div v-if="column.description" class="column-description">{{ column.description }}</div>
      <RetroColumnMenu
        :is-open="isMenuOpen"
        :anchor-el="menuButtonRef"
        :column-color="column.color.columnColor"
        @close="closeMenu"
        @edit-column="onEditColumnClick"
        @edit-description="onEditDescriptionClick"
        @copy-name="onCopyNameClick"
        @set-color="onSetColumnColor"
        @remove-color="onRemoveColumnColor"
        @delete-column="onDeleteColumn"
      />
      <button class="column-add-button" type="button" @click="onAddItemClick">
        <SvgIcon name="bigplus" class="column-add-button__icon" />
      </button>
    </div>
    <Sortable
      v-if="!isCardFilterActive"
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
    <div v-else class="sortable-container">
      <RetroColumnItem
        v-for="element in filteredItems"
        :key="element.id"
        :element="element"
      />
    </div>
    <ConfirmDeleteModal
      :is-open="isDeleteColumnModalOpen"
      title="Удалить колонку?"
      message="Все карточки в этой колонке будут удалены. Действие нельзя отменить."
      @close="onCloseDeleteColumnModal"
      @confirm="onConfirmDeleteColumn"
    />
    <TextEditModal
      :is-open="isEditColumnModalOpen"
      :value="nameDraft"
      title="Изменить название колонки"
      placeholder="Введите название колонки"
      @close="onCloseEditColumnModal"
      @confirm="onConfirmEditColumn"
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
  background-color: var(--column-bg);
  width: var(--board-column-width, calc(33.33% - 30px - 32px));
  border-radius: 20px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex: 0 0 var(--board-column-width, calc(33.33% - 30px - 32px));
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.column-top {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.column-header__title-container {
  margin-top: 16px;
}

.column-header {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.column-header__title {
  font-family: 'Roboto', sans-serif;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.4;
  color: #000000a8;
  cursor: pointer;
}

.column-drag-handle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  padding: 4px;
  border-radius: 4px;
  transform: translateX(-4px);
}

.column-drag-handle:active {
  cursor: grabbing;
  border: 0;
}

.column-drag-handle:hover {
  background-color: color-mix(in srgb, var(--column-bg) 80%, black);
}

.column-drag-handle__icon {
  width: 16px;
  height: 16px;
  display: block;
}

.column-open-menu-button {
  width: 16px;
  height: 16px;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
}

.column-open-menu-button:hover {
  background-color: color-mix(in srgb, var(--column-bg) 80%, black);
}

.column-open-menu-button__icon {
  width: 100%;
  height: 100%;
  display: block;
}

.column-add-button {
  margin-top: 16px;
  width: 100%;
  height: 47px;
  border: 3px dashed var(--button-bg);
  border-radius: 10px;
  background-color: transparent;
  color: var(--button-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.column-add-button:hover {
  border: 3px dashed color-mix(in srgb, var(--button-bg) 80%, black);
  color: color-mix(in srgb, var(--button-bg) 80%, black);
}

.column-add-button__icon {
  width: 24px !important;
  height: 24px !important;
  stroke-width: 5px !important;
  display: block;
}

.column-description {
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 0;
  color: #333;
  white-space: pre-wrap;
  margin-top: 6px;
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
import { ref, computed, toRef } from 'vue'
import { Sortable } from 'sortablejs-vue3'
import { type TRetroColumn, type TRetroColumnColor } from '@/stores/RetroStore'
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

const column = toRef(props, 'column')
const menuButtonRef = ref<HTMLElement | null>(null)
const isMenuOpen = ref(false)
const isDeleteColumnModalOpen = ref(false)
const isEditColumnModalOpen = ref(false)
const isEditDescriptionModalOpen = ref(false)
const nameDraft = ref('')
const descriptionDraft = ref('')
const sortableKey = computed(
  () => `${column.value.id}:${column.value.items.map((item) => item.id).join(',')}`,
)
const isCardFilterActive = computed(() => retroStore.getHasCardSearchQuery)
const filteredItems = computed(() => retroStore.getFilteredColumnItems(column.value.id))
const defaultColumnColor: TRetroColumnColor = {
  columnColor: '#f0f0f0',
  itemColor: '#f0f0f0',
  buttonColor: '#f0f0f0',
}

const options = {
  group: 'shared',
  draggable: '.card-container:not(.card-container-is-editing)',
  animation: 150,
  swapThreshold: 0.65,
  emptyInsertThreshold: 20,
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
  nameDraft.value = column.value.name
  isEditColumnModalOpen.value = true
}

const onCloseEditColumnModal = () => {
  isEditColumnModalOpen.value = false
}

const onConfirmEditColumn = (value: string) => {
  retroStore.updateColumnName(column.value.id, value)
  retroStore.updateColumnNameEnd(column.value.id)
  isEditColumnModalOpen.value = false
}

const onEditDescriptionClick = () => {
  closeMenu()
  descriptionDraft.value = column.value.description ?? ''
  isEditDescriptionModalOpen.value = true
}

const onCloseEditDescriptionModal = () => {
  isEditDescriptionModalOpen.value = false
}

const onConfirmEditDescription = (value: string) => {
  retroStore.updateColumnDescription(column.value.id, value)
  isEditDescriptionModalOpen.value = false
}

const onCopyNameClick = async () => {
  closeMenu()
  const textToCopy = column.value.name.trim()
  if (!textToCopy) return

  try {
    await navigator.clipboard.writeText(textToCopy)
  } catch (error) {
    console.error('Failed to copy column name', error)
  }
}

const onSetColumnColor = (color: TRetroColumnColor) => {
  retroStore.updateColumnColor(column.value.id, color)
}

const onRemoveColumnColor = () => {
  retroStore.updateColumnColor(column.value.id, defaultColumnColor)
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
  retroStore.deleteColumn(column.value.id)
}

const onColumnChoose = (event: any) => {
  // console.log('choose', event.item.id)
}

const onColumnAdd = (event: any) => {
  const movedItemId = Number((event.item as HTMLElement | null)?.id)
  if (!Number.isFinite(movedItemId) || movedItemId <= 0) return

  retroStore.moveItemByIdToColumn(movedItemId, column.value.id, event.newIndex)
  retroStore.setActiveItemId(null)
}

const onColumnUpdate = (event: any) => {
  const movedItemId = Number((event.item as HTMLElement | null)?.id)
  if (!Number.isFinite(movedItemId) || movedItemId <= 0) return

  retroStore.moveItemByIdToColumn(movedItemId, column.value.id, event.newIndex)
  retroStore.setActiveItemId(null)
}

const onAddItemClick = () => {
  retroStore.addItemToColumn(column.value.id)
}
</script>
