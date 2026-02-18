<template>
  <div
    ref="cardRef"
    :id="element.id.toString()"
    :class="['card-container', { 'card-container-is-editing': isEditing }]"
    :key="element.id"
    :style="itemStyle"
  >
    <div ref="menuButtonRef" class="open-menu-button" @click="onMenuButtonClick">
      <SvgIcon name="menu" class="open-menu-button-icon" />
    </div>
    <RetroColumnItemMenu
      :is-open="isMenuOpen"
      :anchor-el="menuButtonRef"
      @close="closeMenu"
      @edit-card="onEditCardClick"
      @copy-text="onCopyTextClick"
      @set-color="onSetColor"
      @remove-color="onRemoveColor"
      @delete-card="onDeleteCardClick"
      :cardColor="element.color"
    />
    <textarea
      ref="textareaRef"
      v-model="editText"
      :class="[
        'item-textarea',
        { 'item-textarea-isEditing': isEditing, 'item-textarea-isNotEditing': !isEditing },
      ]"
      @click="startEditingOnTextAreaClick"
      @input="onDescriptionInput"
      @keydown.enter.exact.prevent="saveAndClose"
      @keydown.escape="cancelEditing"
    />
    <div :class="['card-footer', { 'card-footer-edited': isEditing }]" @click="onFooterClick">
      <template v-if="!isEditing">
        <button
          :class="['card-footer-button', { 'card-footer-button-liked': isLikedByMe }]"
          @click="onLikeButtonClick"
        >
          <SvgIcon name="like" class="card-footer-button-icon" />
        </button>
        <span @click="onLikeButtonClick" class="card-footer-button-likes-count"
          >{{ element.likes.length }}
        </span>
        <span>{{ element.id }}</span>
      </template>
    </div>
    <ConfirmDeleteModal
      :is-open="isDeleteCardModalOpen"
      title="Удалить карточку?"
      message="Карточка будет удалена без возможности восстановления."
      @close="onCloseDeleteCardModal"
      @confirm="onConfirmDeleteCard"
    />
  </div>
</template>

<style scoped>
.card-container {
  position: relative;
  margin: 10px 0;
  background-color: var(--item-bg, #f0f0f0);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  border-radius: 2px;
  cursor: grab;
  border: 1px solid transparent;
}

.card-container:hover {
  border: 1px solid color-mix(in srgb, var(--item-bg, #f0f0f0) 80%, black);
  border-radius: 2px;
}

.item-textarea {
  display: block;
  width: calc(100% - 20px);
  min-height: 0;
  padding: 10px;
  border: none;
  background-color: var(--item-bg, #f0f0f0);
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
  resize: none;
  outline: none;
  field-sizing: content;
  border-radius: 2px;
  color: white;
}

.item-textarea-isNotEditing {
  cursor: grab !important;
}

.item-textarea-isEditing {
  cursor: caret !important;
  background-color: white;
  color: #333;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  height: 14px;
  background-color: var(--item-bg, #f0f0f0);
  padding: 0px 8px 4px 0px;
  color: white;
  font-size: 12px;
  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;
}

.card-footer-edited {
  background-color: white;
}

.card-footer-button {
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  cursor: pointer;
  color: white;
  background: transparent;
  .card-footer-button-icon {
    width: 100%;
    height: 100%;
    display: block;
  }
}
.card-footer-button-liked {
  color: black;
}

.card-footer-button-likes-count {
  transform: translateY(2px);
  font-weight: 500;
  cursor: pointer;
}
.open-menu-button {
  position: absolute;
  top: 4px;
  right: 2px;
  width: 10px;
  height: 10px;
  /* background-color: black; */
  cursor: pointer;
  color: #333;
  border-radius: 4px;
  padding: 2px;

  .open-menu-button-icon {
    width: 100%;
    height: 100%;
    color: white;
    display: block;
  }
}
.open-menu-button:hover {
  background: color-mix(in srgb, var(--item-bg, #f0f0f0) 60%, black);
  color: white;
}
</style>

<style>
.sortable-chosen {
  border: 1px solid color-mix(in srgb, var(--item-bg, #f0f0f0) 60%, black) !important;
}
</style>

<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal/ConfirmDeleteModal.vue'
import RetroColumnItemMenu from './RetroColumnItemMenu.vue'
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import type { TRetroColumnItem } from '../../../stores/RetroStore'
import { RETRO_USER_ID, useRetroStore } from '../../../stores/RetroStore'

const retroStore = useRetroStore()
const props = defineProps<{
  element: TRetroColumnItem
}>()

const isEditing = ref(false)
const isMenuOpen = ref(false)
const editText = ref(props.element.description)
const cardRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const menuButtonRef = ref<HTMLElement | null>(null)
const isDeleteCardModalOpen = ref(false)

const isLikedByMe = computed(() => props.element.likes.includes(RETRO_USER_ID))
const itemStyle = computed(() => (props.element.color ? { '--item-bg': props.element.color } : {}))

watch(
  () => props.element.description,
  (newVal) => {
    editText.value = newVal
  },
)

function startEditingOnTextAreaClick(e: MouseEvent) {
  e.stopPropagation()
  openEditing()
}

function openEditing() {
  isEditing.value = true
  editText.value = props.element.description
  nextTick(() => {
    textareaRef.value?.focus()
    textareaRef.value?.select()
  })
}
function saveAndClose() {
  void retroStore.updateItemDescription(props.element.id, editText.value.trim())
  textareaRef.value?.blur()
  isEditing.value = false
  if (retroStore.activeItemId === props.element.id) {
    retroStore.setActiveItemId(null)
  }
}

function onDescriptionInput() {
  retroStore.updateItemDescriptionLocal(props.element.id, editText.value)
}

function cancelEditing() {
  editText.value = props.element.description
  isEditing.value = false
  if (retroStore.activeItemId === props.element.id) {
    retroStore.setActiveItemId(null)
  }
}

function handleClickOutside(e: MouseEvent) {
  if (!isEditing.value || !cardRef.value) return
  if (!cardRef.value.contains(e.target as Node)) {
    saveAndClose()
  }
}

function onFooterClick(e: MouseEvent) {
  e.stopPropagation()
  startEditingOnTextAreaClick(e)
}

const onLikeButtonClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  retroStore.updateItemLike(props.element.id)
}

const onMenuButtonClick = (e: MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const onEditCardClick = () => {
  closeMenu()
  openEditing()
}

const onDeleteCardClick = () => {
  closeMenu()
  isDeleteCardModalOpen.value = true
}

const onCloseDeleteCardModal = () => {
  isDeleteCardModalOpen.value = false
}

const onConfirmDeleteCard = () => {
  isDeleteCardModalOpen.value = false
  retroStore.deleteItem(props.element.id)
}

const onCopyTextClick = async () => {
  closeMenu()
  const textToCopy = editText.value.trim()
  if (!textToCopy) return

  try {
    await navigator.clipboard.writeText(textToCopy)
  } catch (error) {
    console.error('Failed to copy card text', error)
  }
}

const onSetColor = (color: string) => {
  retroStore.updateItemColor(props.element.id, color)
}

const onRemoveColor = () => {
  retroStore.updateItemColor(props.element.id, undefined)
}

watch(
  () => retroStore.activeItemId,
  (activeItemId) => {
    if (activeItemId === props.element.id) {
      openEditing()
      return
    }

    if (activeItemId === null && isEditing.value) {
      textareaRef.value?.blur()
      isEditing.value = false
    }
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>
