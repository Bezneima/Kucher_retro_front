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
      <button class="column-create-group-button" type="button" @click="onCreateGroupClick">
        Создать группу
      </button>
    </div>

    <Sortable
      v-if="!isCardFilterActive"
      :key="rootSortableKey"
      :list="rootNodes"
      :item-key="rootNodeKey"
      class="sortable-container"
      :data-column-id="column.id"
      :data-container-kind="'ROOT'"
      :options="rootSortableOptions"
      @add="onRootAdd"
      @update="onRootUpdate"
    >
      <template #item="{ element }">
        <div
          v-if="element.kind === 'ITEM'"
          class="root-entry-draggable root-entry-item-handle"
          :data-dnd-kind="'ITEM'"
          :data-item-id="element.id"
        >
          <RetroColumnItem v-if="rootItemById[element.id]" :element="rootItemById[element.id]!" />
        </div>

        <div
          v-else
          class="root-entry-draggable"
          :data-dnd-kind="'GROUP'"
          :data-group-id="element.id"
        >
          <RetroGroup
            v-if="groupById[element.id]"
            :group="groupById[element.id]!"
            :column-id="column.id"
            :dnd-enabled="true"
            :dnd-group-name="mixedDndGroupName"
          />
        </div>
      </template>
    </Sortable>

    <div v-else class="sortable-container">
      <template v-for="entry in filteredEntries" :key="getEntryKey(entry)">
        <RetroColumnItem v-if="entry.type === 'ITEM'" :element="entry.item" />
        <RetroGroup
          v-else
          :group="entry.group"
          :column-id="column.id"
          :dnd-enabled="false"
          :dnd-group-name="mixedDndGroupName"
        />
      </template>
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

<script setup lang="ts">
import { Sortable } from 'sortablejs-vue3'
import { computed, ref, toRef, watch } from 'vue'
import type { TRetroColumn, TRetroColumnColor, TRetroColumnEntry } from '@/stores/RetroStore'
import { useRetroStore } from '@/stores/RetroStore'
import { useBoardNotifications } from '@/composables/useBoardNotifications'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal/ConfirmDeleteModal.vue'
import TextEditModal from '@/components/common/TextEditModal/TextEditModal.vue'
import RetroColumnItem from '../RetroColumItem/RetroColumnItem.vue'
import RetroColumnMenu from './RetroColumnMenu.vue'
import RetroGroup from '../RetroGroupComponent/RetroGroup.vue'

type TRootNode = {
  kind: 'ITEM' | 'GROUP'
  id: number
}

const retroStore = useRetroStore()
const { pushNotification } = useBoardNotifications()

const props = defineProps<{
  column: TRetroColumn
}>()

const mixedDndGroupName = 'retro-mixed-items'

const column = toRef(props, 'column')
const menuButtonRef = ref<HTMLElement | null>(null)
const isMenuOpen = ref(false)
const isDeleteColumnModalOpen = ref(false)
const isEditColumnModalOpen = ref(false)
const isEditDescriptionModalOpen = ref(false)
const nameDraft = ref('')
const descriptionDraft = ref('')
const rootNodes = ref<TRootNode[]>([])

const rootNodeKey = (node: TRootNode) => `${node.kind}:${node.id}`
const rootSortableKey = computed(() => rootNodes.value.map((node) => rootNodeKey(node)).join('|'))

const isCardFilterActive = computed(() => retroStore.getHasCardSearchQuery)
const filteredEntries = computed(() => retroStore.getFilteredColumnEntries(column.value.id))

const rootItemById = computed(() => {
  const items = column.value.entries
    .filter((entry) => entry.type === 'ITEM')
    .map((entry) => [entry.item.id, entry.item] as const)
  return Object.fromEntries(items) as Record<number, TRetroColumn['items'][number]>
})

const groupById = computed(() => {
  const groups = column.value.entries
    .filter((entry) => entry.type === 'GROUP')
    .map((entry) => [entry.group.id, entry.group] as const)
  return Object.fromEntries(groups) as Record<number, TRetroColumn['groups'][number]>
})

watch(
  () => column.value.entries.map((entry) => `${entry.type}:${entry.type === 'ITEM' ? entry.item.id : entry.group.id}`).join(','),
  () => {
    rootNodes.value = column.value.entries.map((entry) => ({
      kind: entry.type,
      id: entry.type === 'ITEM' ? entry.item.id : entry.group.id,
    }))
  },
  { immediate: true },
)

const defaultColumnColor: TRetroColumnColor = {
  columnColor: '#f0f0f0',
  itemColor: '#f0f0f0',
  buttonColor: '#f0f0f0',
}

const rootSortableOptions = computed(() => ({
  group: {
    name: mixedDndGroupName,
    pull: true,
    put: true,
  },
  draggable: '.root-entry-draggable',
  handle: '.root-entry-item-handle, .group-drag-handle',
  animation: 150,
  swapThreshold: 0.65,
  emptyInsertThreshold: 20,
  disabled: isCardFilterActive.value,
}))

const getEntryKey = (entry: TRetroColumnEntry) => {
  if (entry.type === 'ITEM') {
    return `item:${entry.item.id}`
  }

  return `group:${entry.group.id}`
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

const onMoveRootEntry = async (event: { item: HTMLElement; newIndex?: number }) => {
  const evt = event as any
  const kind = event.item?.dataset?.dndKind
  const newIndex = typeof event.newIndex === 'number' ? event.newIndex : 0

  if (newIndex < 0) {
    return
  }

  const oldIndex = typeof evt.oldIndex === 'number' ? evt.oldIndex : -1
  const fromColumnId = Number(evt.from?.dataset?.columnId)
  const toColumnId = Number(evt.to?.dataset?.columnId)
  if (oldIndex === newIndex && fromColumnId === toColumnId) {
    return
  }

  try {
    if (kind === 'ITEM') {
      const movedItemId = Number(event.item?.dataset?.itemId)
      if (!Number.isInteger(movedItemId) || movedItemId <= 0) {
        return
      }

      await retroStore.moveItemWithSync({
        itemId: movedItemId,
        newColumnId: column.value.id,
        newGroupId: null,
        newRowIndex: newIndex,
      })
      retroStore.setActiveItemId(null)
      return
    }

    if (kind === 'GROUP') {
      const movedGroupId = Number(event.item?.dataset?.groupId)
      if (!Number.isInteger(movedGroupId) || movedGroupId <= 0) {
        return
      }

      await retroStore.moveGroupWithSync({
        groupId: movedGroupId,
        newColumnId: column.value.id,
        newOrderIndex: newIndex,
      })
      return
    }
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось выполнить DnD операцию'
    pushNotification('error', 'DnD ошибка', message)
  }
}

const onRootAdd = (event: any) => {
  void onMoveRootEntry(event)
}

const onRootUpdate = (event: any) => {
  void onMoveRootEntry(event)
}

const onAddItemClick = () => {
  retroStore.addItemToColumn(column.value.id)
}

const onCreateGroupClick = async () => {
  try {
    await retroStore.createGroup(column.value.id)
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось создать группу'
    pushNotification('error', 'Ошибка группы', message)
  }
}
</script>

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

.column-add-button,
.column-create-group-button {
  margin-top: 12px;
  width: 100%;
  height: 42px;
  border: 2px dashed var(--button-bg);
  border-radius: 10px;
  background-color: transparent;
  color: var(--button-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  gap: 6px;
}

.column-add-button:hover,
.column-create-group-button:hover {
  border-color: color-mix(in srgb, var(--button-bg) 80%, black);
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

.root-entry-item-handle {
  margin-top: 16px;
}
</style>
