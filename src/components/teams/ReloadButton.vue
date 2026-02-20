<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import reloadIcon from '@/assets/icons/svg/reload.svg'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    isLoading?: boolean
    ariaLabel?: string
  }>(),
  {
    disabled: false,
    isLoading: false,
    ariaLabel: 'Обновить',
  },
)

const emit = defineEmits<{
  click: []
}>()

const isClickAnimating = ref(false)
let clickAnimationTimer: number | null = null

const clearClickAnimationTimer = () => {
  if (clickAnimationTimer !== null) {
    window.clearTimeout(clickAnimationTimer)
    clickAnimationTimer = null
  }
}

const startClickAnimation = () => {
  if (typeof window === 'undefined') {
    return
  }

  clearClickAnimationTimer()
  isClickAnimating.value = false

  window.requestAnimationFrame(() => {
    isClickAnimating.value = true
    clickAnimationTimer = window.setTimeout(() => {
      isClickAnimating.value = false
      clickAnimationTimer = null
    }, 450)
  })
}

const onClick = () => {
  if (props.disabled) {
    return
  }

  startClickAnimation()
  emit('click')
}

onBeforeUnmount(() => {
  clearClickAnimationTimer()
})
</script>

<template>
  <button class="reload-button" type="button" :disabled="disabled" :aria-label="ariaLabel" @click="onClick">
    <img
      :class="[
        'reload-button-icon',
        {
          'reload-button-icon--loading': isLoading,
          'reload-button-icon--click-rotate': !isLoading && isClickAnimating,
        },
      ]"
      :src="reloadIcon"
      alt=""
    />
  </button>
</template>

<style scoped>
.reload-button {
  border: 1px solid #cedbed;
  background: #fff;
  border-radius: 8px;
  padding: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.reload-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.reload-button-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.reload-button-icon--loading {
  animation: reload-spin 0.85s linear infinite;
}

.reload-button-icon--click-rotate {
  animation: reload-click-rotate 0.42s cubic-bezier(0.25, 0.7, 0.2, 1);
}

@keyframes reload-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes reload-click-rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .reload-button-icon--loading,
  .reload-button-icon--click-rotate {
    animation: none;
  }
}
</style>
