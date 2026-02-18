<template>
  <Teleport to="body">
    <div v-if="isOpen" class="confirm-modal" @click.self="emit('close')">
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
import { watch, onBeforeUnmount } from 'vue'

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
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 45%);
  padding: 16px;
}

.confirm-modal__content {
  width: min(100%, 360px);
  border-radius: 4px;
  background: #fff;
  color: #181818;
  padding: 16px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 25%);
}

.confirm-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.confirm-modal__message {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.45;
}

.confirm-modal__actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.confirm-modal__button {
  border: 1px solid #d0d0d0;
  background: #fff;
  color: #181818;
  border-radius: 2px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
}

.confirm-modal__button:hover {
  border-color: #777;
}

.confirm-modal__button-danger {
  border-color: #bf3030;
  background: #bf3030;
  color: #fff;
}

.confirm-modal__button-danger:hover {
  border-color: #8e2525;
  background: #8e2525;
}
</style>
