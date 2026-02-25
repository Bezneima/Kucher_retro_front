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
      <RetroColumnMenuActions
        v-if="!isColorMenuOpen"
        :column-color="props.columnColor"
        @edit-column="onEditColumnClick"
        @edit-description="onEditDescriptionClick"
        @copy-name="onCopyNameClick"
        @open-color-menu="openColorMenu"
        @remove-color="onRemoveColorClick"
        @delete-column="onDeleteColumnClick"
      />
      <RetroColumnMenuColors v-else @back="closeColorMenu" @select-color="onColorClick" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import RetroColumnMenuActions from './RetroColumnMenuActions.vue'
import RetroColumnMenuColors from './RetroColumnMenuColors.vue'
import type { TRetroColumnColor } from '@/stores/RetroStore'

const props = defineProps<{
  isOpen: boolean
  anchorEl: HTMLElement | null
  columnColor?: string
}>()

const emit = defineEmits<{
  close: []
  editColumn: []
  editDescription: []
  copyName: []
  setColor: [color: TRetroColumnColor]
  removeColor: []
  deleteColumn: []
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

const onColorClick = (color: TRetroColumnColor) => {
  emit('setColor', color)
  emit('close')
}

const onRemoveColorClick = () => {
  emit('removeColor')
  emit('close')
}

const onEditColumnClick = () => {
  emit('editColumn')
  emit('close')
}

const onCopyNameClick = () => {
  emit('copyName')
  emit('close')
}

const onEditDescriptionClick = () => {
  emit('editDescription')
  emit('close')
}

const onDeleteColumnClick = () => {
  emit('deleteColumn')
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
</style>
