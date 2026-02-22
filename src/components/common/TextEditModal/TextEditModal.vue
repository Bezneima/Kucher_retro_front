<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="text-edit-modal"
      @pointerdown="onOverlayPointerDown"
      @pointerup="onOverlayPointerUp"
    >
      <div class="text-edit-modal__content" role="dialog" aria-modal="true" :aria-label="title">
        <h3 class="text-edit-modal__title">{{ title }}</h3>
        <textarea
          v-if="multiline"
          ref="textareaRef"
          v-model="text"
          class="text-edit-modal__field text-edit-modal__field--textarea"
          :placeholder="placeholder"
        />
        <input
          v-else
          ref="inputRef"
          v-model="text"
          class="text-edit-modal__field text-edit-modal__field--input"
          type="text"
          :placeholder="placeholder"
        />
        <div class="text-edit-modal__actions">
          <button type="button" class="text-edit-modal__button" @click="emit('close')">
            {{ cancelText }}
          </button>
          <button type="button" class="text-edit-modal__button text-edit-modal__button-primary" @click="onConfirm">
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    value?: string
    title?: string
    placeholder?: string
    confirmText?: string
    cancelText?: string
    multiline?: boolean
  }>(),
  {
    value: '',
    title: 'Редактировать текст',
    placeholder: 'Введите текст',
    confirmText: 'Сохранить',
    cancelText: 'Отмена',
    multiline: true,
  },
)

const emit = defineEmits<{
  close: []
  confirm: [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const text = ref('')
const isOverlayPointerDown = ref(false)

const onOverlayPointerDown = (event: PointerEvent) => {
  const isPrimaryPointer = event.pointerType !== 'mouse' || event.button === 0
  isOverlayPointerDown.value = event.target === event.currentTarget && isPrimaryPointer
}

const onOverlayPointerUp = (event: PointerEvent) => {
  const shouldClose = isOverlayPointerDown.value && event.target === event.currentTarget
  isOverlayPointerDown.value = false
  if (shouldClose) {
    emit('close')
  }
}

const onConfirm = () => {
  emit('confirm', text.value.trim())
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (!props.isOpen) return

  if (event.key === 'Escape') {
    emit('close')
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    onConfirm()
  }
}

watch(
  () => props.isOpen,
  async (isOpen) => {
    if (isOpen) {
      text.value = props.value ?? ''
      document.addEventListener('keydown', onDocumentKeydown)
      await nextTick()
      if (props.multiline) {
        textareaRef.value?.focus()
      } else {
        inputRef.value?.focus()
      }
      return
    }

    isOverlayPointerDown.value = false
    document.removeEventListener('keydown', onDocumentKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<style scoped>
.text-edit-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  background: rgba(13, 24, 46, 0.45);
  padding: 16px;
}

.text-edit-modal__content {
  width: min(500px, 100%);
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
}

.text-edit-modal__title {
  margin: 0 30px 14px 0;
  font-size: 18px;
  font-weight: 600;
  color: #33445f;
}

.text-edit-modal__field {
  margin-top: 0;
  width: 100%;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.45;
  color: #33445f;
}

.text-edit-modal__field--textarea {
  min-height: 120px;
  padding: 9px 10px;
  border: 1px solid #cfdbec;
  border-radius: 8px;
  resize: vertical;
}

.text-edit-modal__field--input {
  min-height: 0;
  padding: 9px 10px;
  border: 1px solid #cfdbec;
  border-radius: 8px;
}

.text-edit-modal__field:focus {
  outline: none;
  border-color: #79a8e4;
  box-shadow: 0 0 0 3px rgba(121, 168, 228, 0.2);
}

.text-edit-modal__actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.text-edit-modal__button {
  border: 1px solid #cfdbec;
  background: #fff;
  color: #33445f;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  cursor: pointer;
}

.text-edit-modal__button:hover {
  border-color: #79a8e4;
}

.text-edit-modal__button-primary {
  border: 0;
  background: #1e88e5;
  color: #fff;
  font-weight: 600;
}

.text-edit-modal__button-primary:hover {
  background: #1878c9;
}
</style>
