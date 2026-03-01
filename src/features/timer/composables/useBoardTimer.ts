import { computed, onBeforeUnmount, ref } from 'vue'
import { boardTimerClient, type BoardTimerDto } from '@/features/timer/api/boardTimerClient'

const DEFAULT_NEW_TIMER_SECONDS = 300
const MIN_TIMER_SECONDS = 1
const MAX_TIMER_SECONDS = 86400

const formatBoardTimer = (totalSeconds: number) => {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(normalizedSeconds / 60)
  const seconds = normalizedSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const parseTimerSeconds = (value: string | number) => {
  const parsedSeconds = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsedSeconds)) {
    return null
  }
  if (parsedSeconds < MIN_TIMER_SECONDS || parsedSeconds > MAX_TIMER_SECONDS) {
    return null
  }

  return parsedSeconds
}

export const useBoardTimer = () => {
  const timer = ref<BoardTimerDto | null>(null)
  const isLoadingTimer = ref(false)
  const isActionPending = ref(false)
  const isCreatePopoverOpen = ref(false)
  const newTimerSeconds = ref(String(DEFAULT_NEW_TIMER_SECONDS))
  const timerErrorMessage = ref('')

  const hasTimer = computed(() => Boolean(timer.value))
  const isRunning = computed(() => timer.value?.status === 'RUNNING')
  const isPaused = computed(() => timer.value?.status === 'PAUSED')
  const formattedTime = computed(() => formatBoardTimer(timer.value?.remainingSeconds ?? 0))

  let loadRequestId = 0
  let countdownIntervalId: number | null = null

  const stopCountdown = () => {
    if (countdownIntervalId === null) {
      return
    }

    window.clearInterval(countdownIntervalId)
    countdownIntervalId = null
  }

  const startCountdown = () => {
    stopCountdown()
    if (!isRunning.value) {
      return
    }

    countdownIntervalId = window.setInterval(() => {
      const currentTimer = timer.value
      if (!currentTimer || currentTimer.status !== 'RUNNING') {
        stopCountdown()
        return
      }

      const nextRemainingSeconds = Math.max(0, currentTimer.remainingSeconds - 1)
      timer.value = {
        ...currentTimer,
        remainingSeconds: nextRemainingSeconds,
        status: nextRemainingSeconds === 0 ? 'PAUSED' : 'RUNNING',
      }

      if (nextRemainingSeconds === 0) {
        stopCountdown()
      }
    }, 1000)
  }

  const syncTimer = (nextTimer: BoardTimerDto | null) => {
    timer.value = nextTimer
    if (nextTimer?.status === 'RUNNING') {
      startCountdown()
      return
    }

    stopCountdown()
  }

  const resetTimerState = () => {
    loadRequestId += 1
    syncTimer(null)
    timerErrorMessage.value = ''
    isLoadingTimer.value = false
    isActionPending.value = false
    isCreatePopoverOpen.value = false
    newTimerSeconds.value = String(DEFAULT_NEW_TIMER_SECONDS)
  }

  const openCreatePopover = () => {
    timerErrorMessage.value = ''
    if (!hasTimer.value) {
      isCreatePopoverOpen.value = true
    }
  }

  const closeCreatePopover = () => {
    isCreatePopoverOpen.value = false
    timerErrorMessage.value = ''
  }

  const loadTimer = async (boardId: number | null) => {
    const requestId = ++loadRequestId
    if (!boardId) {
      resetTimerState()
      return
    }

    isLoadingTimer.value = true
    timerErrorMessage.value = ''
    try {
      const currentTimer = await boardTimerClient.getBoardTimer(boardId)
      if (requestId !== loadRequestId) {
        return
      }

      syncTimer(currentTimer)
    } catch (error) {
      if (requestId !== loadRequestId) {
        return
      }

      syncTimer(null)
      timerErrorMessage.value =
        error instanceof Error && error.message ? error.message : 'Не удалось загрузить таймер'
      throw error
    } finally {
      if (requestId === loadRequestId) {
        isLoadingTimer.value = false
      }
    }
  }

  const startTimer = async (boardId: number | null) => {
    if (!boardId || isActionPending.value) {
      return null
    }

    const parsedSeconds = parseTimerSeconds(newTimerSeconds.value)
    if (parsedSeconds === null) {
      timerErrorMessage.value = `Введите целое число от ${MIN_TIMER_SECONDS} до ${MAX_TIMER_SECONDS}`
      return null
    }

    timerErrorMessage.value = ''
    isActionPending.value = true
    try {
      const startedTimer = await boardTimerClient.startBoardTimer(boardId, { seconds: parsedSeconds })
      syncTimer(startedTimer)
      isCreatePopoverOpen.value = false
      return startedTimer
    } catch (error) {
      timerErrorMessage.value =
        error instanceof Error && error.message ? error.message : 'Не удалось запустить таймер'
      throw error
    } finally {
      isActionPending.value = false
    }
  }

  const pauseTimer = async (boardId: number | null) => {
    if (!boardId || isActionPending.value || !isRunning.value) {
      return null
    }

    timerErrorMessage.value = ''
    isActionPending.value = true
    try {
      const pausedTimer = await boardTimerClient.pauseBoardTimer(boardId)
      syncTimer(pausedTimer)
      return pausedTimer
    } catch (error) {
      timerErrorMessage.value =
        error instanceof Error && error.message ? error.message : 'Не удалось поставить таймер на паузу'
      throw error
    } finally {
      isActionPending.value = false
    }
  }

  const resumeTimer = async (boardId: number | null) => {
    if (!boardId || isActionPending.value || !isPaused.value) {
      return null
    }

    timerErrorMessage.value = ''
    isActionPending.value = true
    try {
      const resumedTimer = await boardTimerClient.resumeBoardTimer(boardId)
      syncTimer(resumedTimer)
      return resumedTimer
    } catch (error) {
      timerErrorMessage.value =
        error instanceof Error && error.message ? error.message : 'Не удалось продолжить таймер'
      throw error
    } finally {
      isActionPending.value = false
    }
  }

  const deleteTimer = async (boardId: number | null) => {
    if (!boardId || isActionPending.value || !hasTimer.value) {
      return false
    }

    timerErrorMessage.value = ''
    isActionPending.value = true
    try {
      await boardTimerClient.deleteBoardTimer(boardId)
      syncTimer(null)
      isCreatePopoverOpen.value = false
      newTimerSeconds.value = String(DEFAULT_NEW_TIMER_SECONDS)
      return true
    } catch (error) {
      timerErrorMessage.value =
        error instanceof Error && error.message ? error.message : 'Не удалось удалить таймер'
      throw error
    } finally {
      isActionPending.value = false
    }
  }

  onBeforeUnmount(() => {
    stopCountdown()
  })

  return {
    timer,
    hasTimer,
    isRunning,
    isPaused,
    formattedTime,
    isLoadingTimer,
    isActionPending,
    isCreatePopoverOpen,
    newTimerSeconds,
    timerErrorMessage,
    loadTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    deleteTimer,
    resetTimerState,
    openCreatePopover,
    closeCreatePopover,
  }
}
