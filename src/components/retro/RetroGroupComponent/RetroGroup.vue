<template>
  <section
    class="retro-group-container"
    :class="{ 'retro-group-container-drag-hover': isDragHandleHovered }"
    :style="{
      '--group-bg': group.color.columnColor,
      '--group-item-bg': group.color.itemColor,
      '--group-button-bg': group.color.buttonColor,
    }"
  >
    <header
      class="retro-group-header group-drag-handle"
      @mouseenter="onDragHandleMouseEnter"
      @mouseleave="onDragHandleMouseLeave"
    >
      <div class="retro-group-title-edit-zone">
        <button
          type="button"
          class="retro-group-title"
          title="Изменить название группы"
          @mousedown.stop
          @click="onGroupTitleClick"
        >
          {{ group.name }}
        </button>
        <button
          type="button"
          class="retro-group-title-edit"
          title="Изменить название группы"
          aria-label="Изменить название группы"
          @mousedown.stop
          @click="onGroupTitleClick"
        >
          <SvgIcon name="pencile" class="retro-group-title-edit-icon" />
        </button>
      </div>
      <button
        ref="menuButtonRef"
        type="button"
        class="retro-group-open-menu-button"
        title="Открыть меню группы"
        @click="onMenuButtonClick"
      >
        <SvgIcon name="columnMenu" class="retro-group-open-menu-button__icon" />
      </button>
    </header>

    <p v-if="group.description" class="retro-group-description">{{ group.description }}</p>
    <RetroGroupMenu
      :is-open="isMenuOpen"
      :anchor-el="menuButtonRef"
      @close="closeMenu"
      @edit-name="openNameModal"
      @edit-description="openDescriptionModal"
      @set-color="onSelectColor"
      @delete-group="openDeleteModal"
    />

    <button
      v-if="canCreateCards"
      type="button"
      class="retro-group-add-item"
      title="Добавить карточку в группу"
      @click="onAddItemToGroupClick"
    >
      <SvgIcon name="bigplus" class="retro-group-add-item__icon" />
    </button>

    <Sortable
      :key="groupSortableKey"
      :list="groupItemNodes"
      :item-key="itemNodeKey"
      class="retro-group-items"
      :data-column-id="columnId"
      :data-group-id="group.id"
      :options="groupItemSortableOptions"
      @add="onGroupItemAdd"
      @update="onGroupItemUpdate"
    >
      <template #item="{ element }">
        <div class="group-item-draggable" :data-dnd-kind="element.kind" :data-item-id="element.id">
          <RetroColumnItem v-if="itemById[element.id]" :element="itemById[element.id]!" />
        </div>
      </template>
    </Sortable>

    <ConfirmDeleteModal
      :is-open="isDeleteModalOpen"
      title="Удалить группу?"
      message="Карточки будут перенесены в корень колонки на позицию группы."
      @close="closeDeleteModal"
      @confirm="onConfirmDeleteGroup"
    />

    <TextEditModal
      :is-open="isNameModalOpen"
      :value="groupNameDraft"
      title="Изменить название группы"
      placeholder="Введите название группы"
      @close="closeNameModal"
      @confirm="onConfirmName"
    />

    <TextEditModal
      :is-open="isDescriptionModalOpen"
      :value="groupDescriptionDraft"
      title="Описание группы"
      placeholder="Введите описание группы"
      @close="closeDescriptionModal"
      @confirm="onConfirmDescription"
    />
  </section>
</template>

<script setup lang="ts">
import { Sortable } from 'sortablejs-vue3'
import { computed, ref, toRef, watch } from 'vue'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal/ConfirmDeleteModal.vue'
import TextEditModal from '@/components/common/TextEditModal/TextEditModal.vue'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import type { ColumnColor, TRetroGroup } from '@/stores/RetroStore'
import { useRetroStore } from '@/stores/RetroStore'
import { useBoardNotifications } from '@/composables/useBoardNotifications'
import RetroColumnItem from '../RetroColumItem/RetroColumnItem.vue'
import RetroGroupMenu from './RetroGroupMenu.vue'

type TGroupItemNode = {
  kind: 'ITEM'
  id: number
}

const props = defineProps<{
  group: TRetroGroup
  columnId: number
  dndEnabled: boolean
  dndGroupName: string
}>()

const retroStore = useRetroStore()
const { pushNotification } = useBoardNotifications()

const group = toRef(props, 'group')
const groupItemNodes = ref<TGroupItemNode[]>([])
const menuButtonRef = ref<HTMLElement | null>(null)
const isMenuOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isNameModalOpen = ref(false)
const isDescriptionModalOpen = ref(false)
const groupNameDraft = ref('')
const groupDescriptionDraft = ref('')
const isDragHandleHovered = ref(false)
const canCreateCards = computed(() => retroStore.getCanEditBoardCards)

const itemById = computed(() => {
  const map: Record<number, (typeof group.value.items)[number]> = {}
  for (const item of group.value.items) {
    map[item.id] = item
  }
  return map
})

const itemNodeKey = (node: TGroupItemNode) => `${node.kind}:${node.id}`
const groupSortableKey = computed(() =>
  groupItemNodes.value.map((node) => itemNodeKey(node)).join('|'),
)

watch(
  () => group.value.items.map((item) => item.id).join(','),
  () => {
    groupItemNodes.value = group.value.items.map((item) => ({
      kind: 'ITEM',
      id: item.id,
    }))
  },
  { immediate: true },
)

const groupItemSortableOptions = computed(() => ({
  group: {
    name: props.dndGroupName,
    pull: true,
    put: (_to: unknown, _from: unknown, dragEl: HTMLElement) => dragEl?.dataset?.dndKind === 'ITEM',
  },
  draggable: '.group-item-draggable',
  animation: 150,
  swapThreshold: 0.65,
  emptyInsertThreshold: 20,
  disabled: !props.dndEnabled,
}))

const onMoveItemToGroup = async (event: { item: HTMLElement; newIndex?: number }) => {
  const evt = event as any
  const movedItemId = Number(event.item?.dataset?.itemId)
  const newIndex = typeof event.newIndex === 'number' ? event.newIndex : 0

  if (!Number.isInteger(movedItemId) || movedItemId <= 0 || newIndex < 0) {
    return
  }

  const oldIndex = typeof evt.oldIndex === 'number' ? evt.oldIndex : -1
  const fromColumnId = Number(evt.from?.dataset?.columnId)
  const toColumnId = Number(evt.to?.dataset?.columnId)
  const fromGroupId = Number(evt.from?.dataset?.groupId)
  const toGroupId = Number(evt.to?.dataset?.groupId)
  if (oldIndex === newIndex && fromColumnId === toColumnId && fromGroupId === toGroupId) {
    return
  }

  try {
    await retroStore.moveItemWithSync({
      itemId: movedItemId,
      newColumnId: props.columnId,
      newGroupId: group.value.id,
      newRowIndex: newIndex,
    })
    retroStore.setActiveItemId(null)
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось переместить карточку в группу'
    pushNotification('error', 'DnD ошибка', message)
  }
}

const onGroupItemAdd = (event: any) => {
  void onMoveItemToGroup(event)
}

const onGroupItemUpdate = (event: any) => {
  void onMoveItemToGroup(event)
}

const onMenuButtonClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  isMenuOpen.value = !isMenuOpen.value
}

const onGroupTitleClick = (event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  closeMenu()
  openNameModal()
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const openDeleteModal = () => {
  isDeleteModalOpen.value = true
}

const closeDeleteModal = () => {
  isDeleteModalOpen.value = false
}

const onConfirmDeleteGroup = async () => {
  closeDeleteModal()

  try {
    await retroStore.deleteGroup(group.value.id)
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось удалить группу'
    pushNotification('error', 'Ошибка удаления группы', message)
  }
}

const openNameModal = () => {
  isNameModalOpen.value = true
  groupNameDraft.value = group.value.name
}

const closeNameModal = () => {
  isNameModalOpen.value = false
}

const onConfirmName = async (nextValue: string) => {
  closeNameModal()

  try {
    await retroStore.updateGroupName(group.value.id, nextValue)
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось обновить название группы'
    pushNotification('error', 'Ошибка обновления группы', message)
  }
}

const openDescriptionModal = () => {
  isDescriptionModalOpen.value = true
  groupDescriptionDraft.value = group.value.description
}

const closeDescriptionModal = () => {
  isDescriptionModalOpen.value = false
}

const onConfirmDescription = async (nextValue: string) => {
  closeDescriptionModal()

  try {
    await retroStore.updateGroupDescription(group.value.id, nextValue)
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось обновить описание группы'
    pushNotification('error', 'Ошибка обновления группы', message)
  }
}

const onSelectColor = async (color: ColumnColor) => {
  try {
    await retroStore.updateGroupColor(group.value.id, color)
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось обновить цвет группы'
    pushNotification('error', 'Ошибка обновления группы', message)
  }
}

const onAddItemToGroupClick = () => {
  if (!canCreateCards.value) {
    return
  }

  try {
    retroStore.addItemToGroup(props.columnId, group.value.id)
  } catch (error) {
    const message =
      error instanceof Error && typeof error.message === 'string' && error.message
        ? error.message
        : 'Не удалось добавить карточку в группу'
    pushNotification('error', 'Ошибка группы', message)
  }
}

const onDragHandleMouseEnter = () => {
  isDragHandleHovered.value = true
}

const onDragHandleMouseLeave = () => {
  isDragHandleHovered.value = false
}
</script>

<style scoped>
.retro-group-container {
  --item-bg: var(--group-item-bg);
  background: color-mix(in srgb, var(--group-bg) 90%, #ffffff);
  box-shadow:
    0 1px 2px rgb(15 23 42 / 14%),
    0 6px 14px -8px rgb(15 23 42 / 42%);
  border-radius: 12px;
  margin: 16px 2px 0;
  padding: 10px;
  position: relative;
  z-index: 1;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.retro-group-container-drag-hover {
  transform: translateY(-2px);
}

.retro-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  gap: 8px;
}

.retro-group-title-edit-zone {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 6px;
}

.retro-group-title {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 700;
  color: #7a7a7a;
  cursor: text;
  text-align: left;
  transition: color 0.16s ease;
}

.retro-group-title:hover {
  color: #5f5f5f;
}

.retro-group-title-edit {
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  color: #7a7a7a;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.16s ease, color 0.16s ease;
}

.retro-group-title-edit-zone:hover .retro-group-title-edit,
.retro-group-title-edit-zone:focus-within .retro-group-title-edit {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.retro-group-title-edit:hover {
  color: #5f5f5f;
}

.retro-group-title-edit-icon {
  width: 12px;
  height: 12px;
  display: block;
}

.retro-group-title:focus-visible {
  outline: 2px solid #6b8fd6;
  outline-offset: 2px;
  border-radius: 4px;
}

.retro-group-open-menu-button {
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7a7a7a;
}

.retro-group-open-menu-button:hover {
  background-color: color-mix(in srgb, var(--group-bg) 80%, black);
}

.retro-group-open-menu-button__icon {
  width: 12px;
  height: 12px;
  display: block;
}

.retro-group-description {
  margin: 8px 0 0;
  color: #7a7a7a;
  font-size: 12px;
  white-space: pre-wrap;
}

.retro-group-add-item {
  margin-top: 12px;
  width: 100%;
  height: 42px;
  border: 2px dashed var(--group-button-bg);
  border-radius: 10px;
  background: transparent;
  color: var(--group-button-bg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  gap: 6px;
  transition:
    border-color 0.16s ease,
    color 0.16s ease,
    background-color 0.16s ease;
}

.retro-group-add-item:hover {
  border-color: color-mix(in srgb, var(--group-button-bg) 85%, black);
  color: color-mix(in srgb, var(--group-button-bg) 85%, black);
  background-color: color-mix(in srgb, var(--group-button-bg) 40%, transparent);
}

.retro-group-add-item__icon {
  width: 24px !important;
  height: 24px !important;
  stroke-width: 5px !important;
  display: block;
}

.retro-group-items {
  min-height: 18px;
}

.group-item-draggable {
  margin-top: 8px;
}

.group-item-draggable:focus,
.group-item-draggable:focus-visible {
  outline: none;
}
</style>
