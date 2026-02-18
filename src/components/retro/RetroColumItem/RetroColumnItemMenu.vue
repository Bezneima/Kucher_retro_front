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
      <RetroColumnItemMenuActions
        v-if="!isColorMenuOpen"
        @edit-card="onEditCardClick"
        @copy-text="onCopyTextClick"
        @open-color-menu="openColorMenu"
        @remove-color="onRemoveColorClick"
        @delete-card="onDeleteCardClick"
        :cardColor="props.cardColor"
      />
      <RetroColumnItemMenuColors v-else @back="closeColorMenu" @select-color="onColorClick" />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import RetroColumnItemMenuActions from './RetroColumnItemMenuActions.vue'
import RetroColumnItemMenuColors from './RetroColumnItemMenuColors.vue'

const props = defineProps<{
  isOpen: boolean
  anchorEl: HTMLElement | null
  cardColor?: string
}>()

const emit = defineEmits<{
  close: []
  editCard: []
  copyText: []
  setColor: [color: string]
  removeColor: []
  deleteCard: []
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

const onMenuClick = () => {
  emit('close')
}

const openColorMenu = () => {
  isColorMenuOpen.value = true
}

const closeColorMenu = () => {
  isColorMenuOpen.value = false
}

const onColorClick = (color: string) => {
  emit('setColor', color)
  emit('close')
}

const onRemoveColorClick = () => {
  emit('removeColor')
  emit('close')
}

const onDeleteCardClick = () => {
  emit('deleteCard')
  emit('close')
}

const onEditCardClick = () => {
  emit('editCard')
  emit('close')
}

const onCopyTextClick = () => {
  emit('copyText')
  emit('close')
}
</script>

<style scoped>
.retro-item-menu {
  position: fixed;
  width: 170px;
  padding: 6px;
  border: 1px solid #d0d0d0;
  background-color: white;
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
  z-index: 2000;
}
</style>
