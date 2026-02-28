<template>
  <section
    class="retro-group-container"
    :style="{
      '--group-bg': group.color.columnColor,
      '--group-item-bg': group.color.itemColor,
      '--group-button-bg': group.color.buttonColor,
    }"
  >
    <header class="retro-group-header group-drag-handle">
      <p class="retro-group-title">{{ group.name }}</p>
      <div class="retro-group-actions" @click.stop>
        <button type="button" class="retro-group-action" title="Название" @click="openNameModal">
          N
        </button>
        <button
          type="button"
          class="retro-group-action"
          title="Описание"
          @click="openDescriptionModal"
        >
          D
        </button>
        <button type="button" class="retro-group-action" title="Цвет" @click="toggleColorPicker">
          C
        </button>
        <button type="button" class="retro-group-action" title="Удалить" @click="openDeleteModal">
          X
        </button>
      </div>
    </header>

    <p v-if="group.description" class="retro-group-description">{{ group.description }}</p>

    <div v-if="isColorPickerOpen" class="retro-group-colors" @click.stop>
      <button
        v-for="color in availableColors"
        :key="color.columnColor"
        type="button"
        class="retro-group-color"
        :style="{ backgroundColor: color.columnColor }"
        @click="onSelectColor(color)"
      />
    </div>

    <button type="button" class="retro-group-add-item" @click="onAddItemToGroupClick">
      + Карточка в группу
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
        <div
          class="group-item-draggable"
          :data-dnd-kind="element.kind"
          :data-item-id="element.id"
        >
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
import { availableColors } from '@/stores/RetroStore'
import type { ColumnColor, TRetroGroup } from '@/stores/RetroStore'
import { useRetroStore } from '@/stores/RetroStore'
import { useBoardNotifications } from '@/composables/useBoardNotifications'
import RetroColumnItem from '../RetroColumItem/RetroColumnItem.vue'

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
const isDeleteModalOpen = ref(false)
const isNameModalOpen = ref(false)
const isDescriptionModalOpen = ref(false)
const isColorPickerOpen = ref(false)
const groupNameDraft = ref('')
const groupDescriptionDraft = ref('')

const itemById = computed(() => {
  const map: Record<number, (typeof group.value.items)[number]> = {}
  for (const item of group.value.items) {
    map[item.id] = item
  }
  return map
})

const itemNodeKey = (node: TGroupItemNode) => `${node.kind}:${node.id}`
const groupSortableKey = computed(() => groupItemNodes.value.map((node) => itemNodeKey(node)).join('|'))

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
  if (
    oldIndex === newIndex &&
    fromColumnId === toColumnId &&
    fromGroupId === toGroupId
  ) {
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

const toggleColorPicker = () => {
  isColorPickerOpen.value = !isColorPickerOpen.value
}

const onSelectColor = async (color: ColumnColor) => {
  isColorPickerOpen.value = false

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
</script>

<style scoped>
.retro-group-container {
  --item-bg: var(--group-item-bg);
  background: color-mix(in srgb, var(--group-bg) 90%, #ffffff);
  border: 1px solid color-mix(in srgb, var(--group-bg) 76%, #000);
  border-radius: 12px;
  margin-top: 16px;
  padding: 10px;
}

.retro-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  gap: 8px;
}

.retro-group-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1f2a3d;
}

.retro-group-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.retro-group-action {
  width: 22px;
  height: 22px;
  border: 1px solid #6d7a91;
  border-radius: 6px;
  font-size: 10px;
  background: #fff;
  cursor: pointer;
}

.retro-group-description {
  margin: 8px 0 0;
  color: #243044;
  font-size: 12px;
  white-space: pre-wrap;
}

.retro-group-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.retro-group-color {
  width: 20px;
  height: 20px;
  border: 1px solid #4c5970;
  border-radius: 6px;
  cursor: pointer;
}

.retro-group-add-item {
  margin-top: 10px;
  width: 100%;
  border: 1px dashed var(--group-button-bg);
  border-radius: 8px;
  height: 32px;
  background: transparent;
  color: #2d3a52;
  font-size: 12px;
  cursor: pointer;
}

.retro-group-items {
  min-height: 18px;
}

.group-item-draggable {
  margin-top: 8px;
}
</style>
