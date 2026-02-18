<template>
  <Teleport to="body">
    <div v-if="isOpen" class="text-edit-modal" @click.self="emit('close')">
      <div class="text-edit-modal__content" role="dialog" aria-modal="true" :aria-label="title">
        <h3 class="text-edit-modal__title">{{ title }}</h3>
        <textarea
          ref="textareaRef"
          v-model="text"
          class="text-edit-modal__textarea"
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
  }>(),
  {
    value: '',
    title: 'Редактировать текст',
    placeholder: 'Введите текст',
    confirmText: 'Сохранить',
    cancelText: 'Отмена',
  },
)

const emit = defineEmits<{
  close: []
  confirm: [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const text = ref('')

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
      textareaRef.value?.focus()
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
.text-edit-modal {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 45%);
  padding: 16px;
}

.text-edit-modal__content {
  width: min(100%, 480px);
  border-radius: 4px;
  background: #fff;
  color: #181818;
  padding: 16px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 25%);
}

.text-edit-modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.text-edit-modal__textarea {
  margin-top: 10px;
  width: 100%;
  min-height: 120px;
  padding: 8px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 2px;
  resize: vertical;
  font-size: 14px;
  line-height: 1.45;
  color: #181818;
}

.text-edit-modal__textarea:focus {
  outline: 1px solid #777;
}

.text-edit-modal__actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.text-edit-modal__button {
  border: 1px solid #d0d0d0;
  background: #fff;
  color: #181818;
  border-radius: 2px;
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
}

.text-edit-modal__button:hover {
  border-color: #777;
}

.text-edit-modal__button-primary {
  border-color: #2d6cdf;
  background: #2d6cdf;
  color: #fff;
}

.text-edit-modal__button-primary:hover {
  border-color: #1f56b9;
  background: #1f56b9;
}
</style>
