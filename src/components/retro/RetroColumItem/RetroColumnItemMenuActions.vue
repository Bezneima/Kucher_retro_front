<template>
  <button class="retro-item-menu-button" type="button" @click="onEditCardClick">
    <img src="@/assets/icons/svg/pencil.svg" alt="" class="retro-item-menu-button__icon" />
    Редактировать карточку
  </button>
  <button class="retro-item-menu-button" type="button" @click="onCopyTextClick">
    <img src="@/assets/icons/svg/copy.svg" alt="" class="retro-item-menu-button__icon" />
    Копировать текст
  </button>
  <button class="retro-item-menu-button" type="button" @click="onOpenColorMenuClick">
    <img src="@/assets/icons/svg/fill.svg" alt="" class="retro-item-menu-button__icon" />
    Установить цвет карточки
  </button>
  <button
    v-if="props.cardColor"
    class="retro-item-menu-button"
    type="button"
    @click="onRemoveColorClick"
  >
    <img src="@/assets/icons/svg/cross.svg" alt="" class="retro-item-menu-button__icon" />
    Удалить цвет карточки
  </button>
  <button
    :class="['retro-item-menu-button', 'retro-item-menu-button-delete']"
    type="button"
    @click="onDeleteCardClick"
  >
    <img src="@/assets/icons/svg/delete.svg" alt="" class="retro-item-menu-button__icon" />
    Удалить карточку
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  editCard: []
  copyText: []
  openColorMenu: []
  removeColor: []
  deleteCard: []
}>()

const props = defineProps<{
  cardColor?: string
}>()

const onEditCardClick = () => emit('editCard')
const onCopyTextClick = () => emit('copyText')
const onOpenColorMenuClick = () => emit('openColorMenu')
const onRemoveColorClick = () => emit('removeColor')
const onDeleteCardClick = () => emit('deleteCard')
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
  fill: #f87171;
  stroke: #f87171;
  color: #f87171;
}
</style>
