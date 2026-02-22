<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="confirm-modal"
      @pointerdown="onOverlayPointerDown"
      @pointerup="onOverlayPointerUp"
    >
      <div class="confirm-modal__content" role="dialog" aria-modal="true" :aria-label="title">
        <h3 class="confirm-modal__title">{{ title }}</h3>
        <p class="confirm-modal__message">{{ message }}</p>
        <div class="confirm-modal__actions">
          <button type="button" class="confirm-modal__button" @click="emit('close')">
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="confirm-modal__button confirm-modal__button-danger"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title?: string
    message?: string
    confirmText?: string
    cancelText?: string
  }>(),
  {
    title: 'Удалить элемент?',
    message: 'Это действие нельзя отменить.',
    confirmText: 'Удалить',
    cancelText: 'Отмена',
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()

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

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onDocumentKeydown)
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
.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  background: rgba(13, 24, 46, 0.45);
  padding: 16px;
}

.confirm-modal__content {
  width: min(500px, 100%);
  border: 1px solid #d9e4f2;
  border-radius: 14px;
  background: #fff;
  color: #33445f;
  padding: 18px;
}

.confirm-modal__title {
  margin: 0 30px 10px 0;
  font-size: 18px;
  font-weight: 600;
}

.confirm-modal__message {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: #4a5f7f;
}

.confirm-modal__actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.confirm-modal__button {
  border: 1px solid #cfdbec;
  background: #fff;
  color: #33445f;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  cursor: pointer;
}

.confirm-modal__button:hover {
  border-color: #79a8e4;
}

.confirm-modal__button-danger {
  border: 0;
  background: #cf3e3e;
  color: #fff;
  font-weight: 600;
}

.confirm-modal__button-danger:hover {
  background: #b43232;
}
</style>
