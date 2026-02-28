<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="menuRef"
      class="retro-item-menu"
      :style="{
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
      }"
      @click.stop
    >
      <template v-if="!isColorMenuOpen">
        <button class="retro-item-menu-button" type="button" @click="onEditNameClick">
          <img src="@/assets/icons/svg/pencil.svg" alt="" class="retro-item-menu-button__icon" />
          Изменить название
        </button>
        <button class="retro-item-menu-button" type="button" @click="onEditDescriptionClick">
          <img src="@/assets/icons/svg/pencil.svg" alt="" class="retro-item-menu-button__icon" />
          Редактировать описание
        </button>
        <button class="retro-item-menu-button" type="button" @click="openColorMenu">
          <img src="@/assets/icons/svg/fill.svg" alt="" class="retro-item-menu-button__icon" />
          Установить цвет группы
        </button>
        <button
          :class="['retro-item-menu-button', 'retro-item-menu-button-delete']"
          type="button"
          @click="onDeleteGroupClick"
        >
          <img src="@/assets/icons/svg/delete.svg" alt="" class="retro-item-menu-button__icon" />
          Удалить группу
        </button>
      </template>
      <template v-else>
        <button class="retro-item-menu-button" type="button" @click="closeColorMenu">
          <img src="@/assets/icons/svg/triangleRight.svg" alt="" class="retro-item-menu-button__icon back-icon" />
          Назад
        </button>
        <button
          v-for="color in availableColors"
          :key="color.columnColor"
          class="retro-item-menu-button"
          type="button"
          @click="onColorClick(color)"
        >
          <span class="color-dot" :style="{ backgroundColor: color.columnColor }" />
          {{ color.columnColor }}
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { availableColors } from '@/stores/RetroStore'
import type { ColumnColor } from '@/stores/RetroStore'

const props = defineProps<{
  isOpen: boolean
  anchorEl: HTMLElement | null
}>()

const emit = defineEmits<{
  close: []
  editName: []
  editDescription: []
  setColor: [color: ColumnColor]
  deleteGroup: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const isColorMenuOpen = ref(false)
const menuPosition = ref({
  top: 0,
  left: 0,
})

const updateMenuPosition = () => {
  if (!props.anchorEl) return
  const anchorRect = props.anchorEl.getBoundingClientRect()
  menuPosition.value = {
    top: anchorRect.bottom + 6,
    left: anchorRect.right - 140,
  }
}

const onDocumentMouseDown = (event: MouseEvent) => {
  const target = event.target as Node
  const clickedInsideMenu = !!menuRef.value?.contains(target)
  const clickedAnchor = !!props.anchorEl?.contains(target)
  if (!clickedInsideMenu && !clickedAnchor) {
    emit('close')
  }
}

const onDocumentKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}

const onWindowResizeOrScroll = () => {
  if (!props.isOpen) return
  updateMenuPosition()
}

const addListeners = () => {
  document.addEventListener('mousedown', onDocumentMouseDown)
  document.addEventListener('keydown', onDocumentKeyDown)
  window.addEventListener('resize', onWindowResizeOrScroll)
  window.addEventListener('scroll', onWindowResizeOrScroll, true)
}

const removeListeners = () => {
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('keydown', onDocumentKeyDown)
  window.removeEventListener('resize', onWindowResizeOrScroll)
  window.removeEventListener('scroll', onWindowResizeOrScroll, true)
}

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      updateMenuPosition()
      addListeners()
      return
    }
    isColorMenuOpen.value = false
    removeListeners()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  removeListeners()
})

const openColorMenu = () => {
  isColorMenuOpen.value = true
}

const closeColorMenu = () => {
  isColorMenuOpen.value = false
}

const onEditNameClick = () => {
  emit('editName')
  emit('close')
}

const onEditDescriptionClick = () => {
  emit('editDescription')
  emit('close')
}

const onColorClick = (color: ColumnColor) => {
  emit('setColor', color)
  emit('close')
}

const onDeleteGroupClick = () => {
  emit('deleteGroup')
  emit('close')
}
</script>

<style scoped>
.retro-item-menu {
  position: fixed;
  width: 220px;
  border: 1px solid #d5e2f4;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 28px rgb(43 76 128 / 15%);
  padding: 8px;
  z-index: 2000;
}

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

.retro-item-menu-button:hover {
  background: #eef4fe;
}

.retro-item-menu-button__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.retro-item-menu-button-delete {
  margin-top: 4px;
  border-top: 1px solid #d5e2f4;
  border-radius: 0 0 8px 8px;
  padding-top: 12px;
  color: #d24c5d;
}

.back-icon {
  transform: rotate(180deg);
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 9999px;
  border: 1px solid rgb(0 0 0 / 15%);
}
</style>
