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

.retro-item-menu-button-delete {
  margin-top: 4px;
  border-top: 1px solid #d5e2f4;
  border-radius: 0 0 8px 8px;
  padding-top: 12px;
  color: #d24c5d;
}
</style>
