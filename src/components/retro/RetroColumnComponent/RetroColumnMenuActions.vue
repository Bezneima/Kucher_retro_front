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
  openColorMenu: []
  removeColor: []
  deleteColumn: []
}>()

const props = defineProps<{
  columnColor?: string
}>()

const onEditColumnClick = () => emit('editColumn')
const onEditDescriptionClick = () => emit('editDescription')
const onCopyNameClick = () => emit('copyName')
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
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
}

.retro-item-menu-button__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.retro-item-menu-button:hover {
  background-color: #f5f5f5;
}

.retro-item-menu-button-delete {
  color: #f87171;
}
</style>
