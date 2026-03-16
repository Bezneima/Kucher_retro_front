<template>
  <button class="retro-item-menu-button" type="button" @click="onEditColumnClick">
    <img src="@/assets/icons/svg/pencil.svg" alt="" class="retro-item-menu-button__icon" />
    Редактировать колонку
  </button>
  <button class="retro-item-menu-button" type="button" @click="onEditDescriptionClick">
    <img src="@/assets/icons/svg/pencil.svg" alt="" class="retro-item-menu-button__icon" />
    Редактировать описание
  </button>
  <button class="retro-item-menu-button" type="button" @click="onCopyNameClick">
    <img src="@/assets/icons/svg/copy.svg" alt="" class="retro-item-menu-button__icon" />
    Копировать название
  </button>
  <button
    :class="['retro-item-menu-button', { 'retro-item-menu-button-active': props.isCommon }]"
    type="button"
    :disabled="props.isToggleCommonPending"
    :aria-pressed="props.isCommon"
    @click="onToggleCommonClick"
  >
    <span class="retro-item-menu-button__status" aria-hidden="true"></span>
    {{ props.isToggleCommonPending ? 'Сохранение...' : 'Сделать общей' }}
  </button>
  <button v-if="props.canCreateCards !== false" class="retro-item-menu-button" type="button" @click="onCreateGroupClick">
    <img src="@/assets/icons/svg/addColumn.svg" alt="" class="retro-item-menu-button__icon" />
    Создать группу
  </button>
  <button class="retro-item-menu-button" type="button" @click="onOpenColorMenuClick">
    <img src="@/assets/icons/svg/fill.svg" alt="" class="retro-item-menu-button__icon" />
    Установить цвет колонки
  </button>
  <button
    v-if="props.columnColor && props.columnColor !== defaultColor"
    class="retro-item-menu-button"
    type="button"
    @click="onRemoveColorClick"
  >
    <img src="@/assets/icons/svg/cross.svg" alt="" class="retro-item-menu-button__icon" />
    Удалить цвет колонки
  </button>
  <button
    :class="['retro-item-menu-button', 'retro-item-menu-button-delete']"
    type="button"
    @click="onDeleteColumnClick"
  >
    <img src="@/assets/icons/svg/delete.svg" alt="" class="retro-item-menu-button__icon" />
    Удалить колонку
  </button>
</template>

<script setup lang="ts">
const defaultColor = '#f0f0f0'

const emit = defineEmits<{
  editColumn: []
  editDescription: []
  copyName: []
  toggleCommon: []
  createGroup: []
  openColorMenu: []
  removeColor: []
  deleteColumn: []
}>()

const props = defineProps<{
  columnColor?: string
  isCommon: boolean
  isToggleCommonPending: boolean
  canCreateCards?: boolean
}>()

const onEditColumnClick = () => emit('editColumn')
const onEditDescriptionClick = () => emit('editDescription')
const onCopyNameClick = () => emit('copyName')
const onToggleCommonClick = () => emit('toggleCommon')
const onCreateGroupClick = () => emit('createGroup')
const onOpenColorMenuClick = () => emit('openColorMenu')
const onRemoveColorClick = () => emit('removeColor')
const onDeleteColumnClick = () => emit('deleteColumn')
</script>

<style scoped>
.retro-item-menu-button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
  color: #2f4261;
  font-size: 14px;
  line-height: 1.2;
}

.retro-item-menu-button__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.retro-item-menu-button:hover {
  background: #eef4fe;
}

.retro-item-menu-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.retro-item-menu-button:disabled:hover {
  background: transparent;
}

.retro-item-menu-button-active {
  background: #eef4fe;
  color: #22406f;
}

.retro-item-menu-button-delete {
  margin-top: 4px;
  border-top: 1px solid #d5e2f4;
  border-radius: 0 0 8px 8px;
  padding-top: 12px;
  color: #d24c5d;
}

.retro-item-menu-button__status {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: 1.5px solid #b7c8df;
  border-radius: 9999px;
  background: #fff;
}

.retro-item-menu-button-active .retro-item-menu-button__status {
  border-color: #2f70d9;
  background: radial-gradient(circle, #2f70d9 0 4px, #fff 5px);
}
</style>
