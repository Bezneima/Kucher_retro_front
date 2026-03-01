<template>
  <button
    type="button"
    class="board-action-button board-timer-trigger"
    :disabled="boardTimer.isLoadingTimer.value || !props.boardId"
    @click="openTimerPanel"
  >
    <span>{{ boardTimer.hasTimer.value ? boardTimer.formattedTime.value : 'Таймер' }}</span>
    <SvgIcon name="timer" class="board-timer-trigger__icon" />
  </button>

  <div
    v-if="isTimerPanelOpen"
    class="board-timer-panel-overlay"
    @pointerdown="onTimerOverlayPointerDown"
    @pointerup="onTimerOverlayPointerUp"
  >
    <aside class="board-timer-panel" role="dialog" aria-modal="true" aria-label="Таймер доски">
      <div class="board-timer-panel__display">
        {{ boardTimer.formattedTime.value }}
      </div>
      <p class="board-timer-panel__duration">{{ timerDurationMinutesLabel }}</p>

      <div
        v-if="boardTimer.isRunning.value || boardTimer.isPaused.value"
        class="board-timer-panel__progress"
        :style="{ '--progress': `${timerProgressPercent}%` }"
      >
        <div
          class="board-timer-panel__progress-fill"
          :style="{ width: `${timerProgressPercent}%` }"
        />
        <div
          class="board-timer-panel__progress-knob"
          :style="{ left: `calc(${timerProgressPercent}% - 10px)` }"
        />
        <div v-if="timerProgressPercent > 0" class="board-timer-panel__progress-pattern" />
      </div>

      <div v-if="!boardTimer.hasTimer.value" class="board-timer-panel__create">
        <label class="board-timer-panel__label" for="board-timer-seconds-input">Seconds</label>
        <input
          id="board-timer-seconds-input"
          v-model="boardTimer.newTimerSeconds.value"
          class="board-timer-panel__input"
          type="number"
          min="1"
          max="86400"
          step="1"
          placeholder="300"
          @keydown.enter.prevent="onStartTimer"
        />
        <button
          type="button"
          class="board-timer-panel__start-button"
          :disabled="boardTimer.isActionPending.value || !props.boardId"
          @click="onStartTimer"
        >
          Старт
        </button>
      </div>

      <div v-else class="board-timer-panel__controls">
        <button
          type="button"
          class="board-timer-panel__control board-timer-panel__control--primary"
          :disabled="boardTimer.isActionPending.value || !props.boardId"
          :title="boardTimer.isRunning.value ? 'Пауза' : 'Продолжить'"
          @click="boardTimer.isRunning.value ? onPauseTimer() : onResumeTimer()"
        >
          <span v-if="boardTimer.isRunning.value" class="board-timer-panel__control-symbol"
            >II</span
          >
          <SvgIcon
            v-else
            name="triangleRight"
            class="board-timer-panel__control-icon board-timer-panel__control-icon--play"
          />
        </button>
        <button
          type="button"
          class="board-timer-panel__control"
          :disabled="boardTimer.isActionPending.value || !props.boardId"
          title="Удалить таймер"
          @click="onDeleteTimer"
        >
          <SvgIcon name="cross_light" class="board-timer-panel__control-icon" />
        </button>
        <button
          type="button"
          class="board-timer-panel__control"
          :disabled="boardTimer.isActionPending.value || !props.boardId"
          :title="boardTimer.isMuted.value ? 'Включить звук' : 'Выключить звук'"
          @click="onToggleMuteTimer"
        >
          <SvgIcon
            :name="boardTimer.isMuted.value ? 'mute' : 'unmute'"
            class="board-timer-panel__control-icon"
          />
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SvgIcon from '@/components/common/SvgIcon/SvgIcon.vue'
import { useBoardNotifications } from '@/composables/useBoardNotifications'
import { useBoardTimer } from '@/features/timer/composables/useBoardTimer'

const props = defineProps<{
  boardId: number | null
}>()

const { pushNotification } = useBoardNotifications()
const boardTimer = useBoardTimer()
const isTimerPanelOpen = ref(false)
const isTimerOverlayPointerDown = ref(false)

const formatDurationLabel = (totalSeconds: number) => {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(normalizedSeconds / 3600)
  const minutes = Math.floor((normalizedSeconds % 3600) / 60)
  const seconds = normalizedSeconds % 60

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`
  }

  return `${mm}:${ss}`
}

const timerDurationMinutesLabel = computed(() => {
  const timerDurationSeconds = boardTimer.timer.value?.durationSeconds
  const customDurationSeconds = Number(boardTimer.newTimerSeconds.value)
  let sourceSeconds = 300

  if (typeof timerDurationSeconds === 'number' && timerDurationSeconds > 0) {
    sourceSeconds = timerDurationSeconds
  } else if (Number.isInteger(customDurationSeconds) && customDurationSeconds > 0) {
    sourceSeconds = customDurationSeconds
  }

  return formatDurationLabel(sourceSeconds)
})

const timerProgressPercent = computed(() => {
  const timerValue = boardTimer.timer.value
  if (!timerValue) {
    return 0
  }

  const duration = Math.max(1, timerValue.durationSeconds)
  const remaining = Math.min(Math.max(timerValue.remainingSeconds, 0), duration)
  return Math.round((remaining / duration) * 100)
})

const openTimerPanel = () => {
  isTimerPanelOpen.value = true
}

const closeTimerPanel = () => {
  isTimerPanelOpen.value = false
}

const onTimerOverlayPointerDown = (event: PointerEvent) => {
  const isPrimaryPointer = event.pointerType !== 'mouse' || event.button === 0
  isTimerOverlayPointerDown.value = event.target === event.currentTarget && isPrimaryPointer
}

const onTimerOverlayPointerUp = (event: PointerEvent) => {
  const shouldClose = isTimerOverlayPointerDown.value && event.target === event.currentTarget
  isTimerOverlayPointerDown.value = false
  if (shouldClose) {
    closeTimerPanel()
  }
}

const onStartTimer = async () => {
  try {
    const startedTimer = await boardTimer.startTimer(props.boardId)
    if (startedTimer) {
      // pushNotification('success', 'Таймер запущен')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Не удалось запустить таймер'
    pushNotification('error', message)
  }
}

const onPauseTimer = async () => {
  try {
    const pausedTimer = await boardTimer.pauseTimer(props.boardId)
    if (pausedTimer) {
      // pushNotification('info', 'Таймер на паузе')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Не удалось поставить таймер на паузу'
    pushNotification('error', message)
  }
}

const onResumeTimer = async () => {
  try {
    const resumedTimer = await boardTimer.resumeTimer(props.boardId)
    if (resumedTimer) {
      pushNotification('success', 'Таймер продолжен')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Не удалось продолжить таймер'
    pushNotification('error', message)
  }
}

const onDeleteTimer = async () => {
  try {
    const wasDeleted = await boardTimer.deleteTimer(props.boardId)
    if (wasDeleted) {
      // pushNotification('success', 'Таймер удален')
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Не удалось удалить таймер'
    pushNotification('error', message)
  }
}

const onToggleMuteTimer = () => {
  boardTimer.toggleMuteTimer()
}

watch(
  () => props.boardId,
  (boardId) => {
    if (!boardId) {
      closeTimerPanel()
      isTimerOverlayPointerDown.value = false
    }

    void boardTimer.loadTimer(boardId).catch((error) => {
      const message =
        error instanceof Error && error.message ? error.message : 'Не удалось загрузить таймер'
      pushNotification('error', message)
    })
  },
  { immediate: true },
)
</script>

<style scoped>
.board-action-button {
  height: 36px;
  border: 1px solid #c8d4e3;
  border-radius: 8px;
  background: #fff;
  color: #2f3647;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.board-action-button:hover {
  border-color: #8ab4ff;
  color: #204380;
}

.board-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  color: #7c8699;
}

.board-timer-trigger {
}

.board-timer-trigger__icon {
  width: 14px;
  height: 14px;
}

.board-timer-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  background: rgba(14, 20, 33, 0.12);
}

.board-timer-panel {
  width: min(360px, calc(100vw - 20px));
  height: 190px;
  margin: 12px;
  border-radius: 24px;
  background: #f4f4f5;
  box-shadow: -12px 0 36px rgba(15, 19, 38, 0.17);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
}

.board-timer-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.board-timer-panel__close-link {
  border: none;
  background: transparent;
  color: #636973;
  font-size: 15px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.board-timer-panel__display {
  justify-self: center;
  min-width: 120px;
  text-align: center;
  border-radius: 12px;
  border: 1px solid #e6e6e9;
  background: #ececef;
  color: #252934;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 8px 10px;
}

.board-timer-panel__duration {
  margin: 0;
  text-align: center;
  font-size: 16px;
  color: #7a8089;
}

.board-timer-panel__progress {
  position: relative;
  width: 100%;
  height: 16px;
  border-radius: 10px;
  background: #e3e3e5;
  overflow: hidden;
}

.board-timer-panel__progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, #4f41ea 0%, #5b4cf7 100%);
  z-index: 1;
}

.board-timer-panel__progress-knob {
  position: absolute;
  top: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #5a4cf3;
  border: 2px solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 2px 6px rgba(35, 28, 107, 0.36);
  z-index: 2;
}

.board-timer-panel__progress-pattern {
  position: absolute;
  inset: 0 0 0 auto;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    -45deg,
    rgba(147, 147, 150, 0.28) 0 4px,
    rgba(147, 147, 150, 0) 4px 10px
  );
  clip-path: inset(0 0 0 var(--progress));
  animation: board-timer-pattern-shift 1s linear infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes board-timer-pattern-shift {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 14px 0;
  }
}

.board-timer-panel__create {
  display: grid;
  gap: 8px;
}

.board-timer-panel__label {
  font-size: 13px;
  color: #666d76;
}

.board-timer-panel__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d3d8e3;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
  font-size: 16px;
  color: #252934;
}

.board-timer-panel__start-button {
  border: none;
  border-radius: 8px;
  height: 30px;
  background: #5548f1;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.board-timer-panel__start-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-timer-panel__controls {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  justify-items: center;
  align-content: center;
}

.board-timer-panel__control {
  width: 40px;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 1px solid #dadde4;
  background: #f7f7f8;
  color: #737a85;
  font-size: 18px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.board-timer-panel__control--primary {
  background: #e2e1ff;
  border-color: #e2e1ff;
  color: #4f41ea;
}

.board-timer-panel__control:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.board-timer-panel__control-icon {
  width: 18px;
  height: 18px;
}

.board-timer-panel__control-symbol {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
}

.board-timer-panel__control-icon--play {
  transform: translateX(1px);
}

@media (max-width: 768px) {
  .board-timer-panel {
    width: calc(100vw - 16px);
    height: 260px;
    margin: 8px;
    border-radius: 18px;
    padding: 10px;
  }

  .board-timer-panel__display {
    min-width: 0;
    width: 100%;
    font-size: 24px;
  }

  .board-timer-panel__duration {
    font-size: 14px;
  }
}
</style>
