<template>
  <div
    ref="cardRef"
    :id="element.id.toString()"
    :class="['card-container', { 'card-container-is-editing': isEditing }]"
    :key="element.id"
    :style="itemStyle"
  >
    <div ref="menuButtonRef" class="open-menu-button" @click="onMenuButtonClick">
      <SvgIcon name="cardMenuIcon" class="open-menu-button-icon" />
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
    <div v-if="!isEditing" class="item-text-preview" @click="startEditingOnTextAreaClick">
      {{ editText || ' ' }}
    </div>
    <textarea
      v-else
      ref="textareaRef"
      v-model="editText"
      class="item-textarea item-textarea-isEditing"
      @click.stop
      @input="onDescriptionInput"
      @keydown.enter.exact.prevent="saveAndClose"
      @keydown.escape="cancelEditing"
    />
    <div :class="['card-footer', { 'card-footer-edited': isEditing }]" @click="onFooterClick">
      <template v-if="!isEditing">
        <span v-if="formattedCreatedAt" class="card-footer-date">{{ formattedCreatedAt }}</span>
        <div class="card-footer-like-container" @click="onLikeButtonClick">
          <button :class="['card-footer-button', { 'card-footer-button-liked': isLikedByMe }]">
            <SvgIcon v-if="isLikedByMe" name="filledLike" class="card-footer-button-icon" />
            <SvgIcon v-else name="like" class="card-footer-button-icon" />
          </button>
          <span
            :class="[
              'card-footer-button-likes-count',
              { 'card-footer-button-likes-count-liked': isLikedByMe },
            ]"
            >{{ element.likes.length }}
          </span>
        </div>
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
  margin-top: 16px;
  background-color: var(--item-bg, #f0f0f0);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  border-radius: 10px;
  overflow: hidden;
  cursor: grab;
  border: 2px solid transparent;
  box-sizing: border-box;
}

.card-container:hover {
  border: 2px solid color-mix(in srgb, var(--item-bg, #f0f0f0) 80%, black);
}

.item-textarea {
  display: block;
  width: calc(100% - 20px);
  min-height: 0;
  padding: 8px 10px;
  border: none;
  background-color: var(--item-bg, #f0f0f0);
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  line-height: 1.4;
  resize: none;
  outline: none;
  field-sizing: content;
  border-radius: 2px;
  color: white;
}

.item-text-preview {
  width: calc(100% - 20px);
  min-height: 20px;
  padding: 8px 8px;
  background-color: var(--item-bg, #f0f0f0);
  font-size: 14px;
  font-family: 'Roboto', sans-serif;
  line-height: 1.4;
  color: white;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  cursor: grab !important;
  user-select: none;
  -webkit-user-select: none;
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
  justify-content: space-between;
  min-height: 18px;
  background-color: var(--item-bg, #f0f0f0);
  padding: 0 8px 4px;
  color: white;
  font-size: 12px;
  border-bottom-left-radius: 2px;
  border-bottom-right-radius: 2px;
}

.card-footer-edited {
  background-color: white;
}

.card-footer-button {
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  cursor: pointer;
  color: white;
  background: transparent;
  .card-footer-button-icon {
    width: 100%;
    display: block;
  }
}
.card-footer-button-liked {
  color: white;
}

.card-footer-date {
  line-height: 1;
  font-weight: 500;
  opacity: 0.95;
}

.card-footer-like-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 2px;
}

.card-footer-button-likes-count {
  transform: translateY(1px);
  font-weight: 500;
  cursor: pointer;
}

.card-footer-button-likes-count-liked {
  color: white;
  font-weight: 600;
}

.open-menu-button {
  position: absolute;
  top: 6px;
  right: 4px;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;

  .open-menu-button-icon {
    width: 12px;
    height: 12px;
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
  cursor: grabbing !important;
  border: 2px solid color-mix(in srgb, var(--item-bg, #f0f0f0) 60%, black) !important;
}
</style>

<script setup lang="ts">
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal/ConfirmDeleteModal.vue'
import RetroColumnItemMenu from './RetroColumnItemMenu.vue'
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import type { TRetroColumnItem } from '../../../stores/RetroStore'
import { useRetroStore } from '../../../stores/RetroStore'

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

const currentUserLikeId = computed(() => retroStore.getCurrentUserId)
const isLikedByMe = computed(() => {
  if (!currentUserLikeId.value) return false
  return props.element.likes.includes(currentUserLikeId.value)
})
const formattedCreatedAt = computed(() => {
  if (!props.element.createdAt) return ''
  const parsedDate = new Date(props.element.createdAt)
  if (!Number.isFinite(parsedDate.getTime())) return ''

  return parsedDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
})
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
