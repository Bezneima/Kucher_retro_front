import { computed, onBeforeUnmount, ref } from 'vue'
import debounce from 'lodash.debounce'
import { retroBoardsApiClient, teamsApiClient, toTeamBoardsApiError } from '../api/teamBoardsClient'
import type {
  ApiUiError,
  RetroBoardSummary,
  TeamAdminRole,
  TeamMember,
  TeamSummary,
  UiNotification,
  UiNotificationKind,
} from '../types'

const getStatusTitle = (status?: number) => {
  switch (status) {
    case 403:
      return 'Недостаточно прав'
    case 404:
      return 'Ресурс не найден'
    case 409:
      return 'Конфликт данных'
    case 422:
      return 'Ошибка валидации'
    default:
      return 'Ошибка API'
  }
}

const getStatusDescription = (status?: number) => {
  switch (status) {
    case 403:
      return 'У вас нет прав для выполнения этого действия.'
    case 404:
      return 'Ресурс не найден или доступ к нему закрыт.'
    case 409:
      return 'Операция конфликтует с текущим состоянием данных.'
    case 422:
      return 'Проверьте корректность заполненных полей.'
    default:
      return 'Попробуйте выполнить действие еще раз немного позже.'
  }
}

const toUiError = (error: unknown, fallbackMessage: string): ApiUiError => {
  const apiError = toTeamBoardsApiError(error, fallbackMessage)

  return {
    status: apiError.status,
    title: getStatusTitle(apiError.status),
    description: apiError.message || getStatusDescription(apiError.status),
  }
}

const isManager = (team: TeamSummary | null) => {
  return team?.role === 'OWNER' || team?.role === 'ADMIN'
}

const RELOAD_DEBOUNCE_MS = 300

export const useTeamsDashboard = () => {
  const teams = ref<TeamSummary[]>([])
  const members = ref<TeamMember[]>([])
  const boards = ref<RetroBoardSummary[]>([])

  const selectedTeamId = ref<number | null>(null)

  const isTeamsLoading = ref(false)
  const isMembersLoading = ref(false)
  const isBoardsLoading = ref(false)

  const isTeamCreating = ref(false)
  const isMemberAdding = ref(false)
  const removingMemberId = ref<string | null>(null)
  const changingMemberRoleId = ref<string | null>(null)
  const isBoardCreating = ref(false)

  const teamsError = ref<ApiUiError | null>(null)
  const membersError = ref<ApiUiError | null>(null)
  const boardsError = ref<ApiUiError | null>(null)

  const createTeamName = ref('')
  const addMemberEmail = ref('')
  const addMemberRole = ref<TeamAdminRole>('MEMBER')
  const createBoardName = ref('')
  const createBoardDate = ref('')
  const createBoardDescription = ref('')

  const notifications = ref<UiNotification[]>([])
  let notificationIdCounter = 0
  const notificationTimers = new Map<number, number>()

  let memberRequestId = 0
  let boardRequestId = 0

  const selectedTeam = computed(() => {
    if (!selectedTeamId.value) {
      return null
    }

    return teams.value.find((team) => team.id === selectedTeamId.value) ?? null
  })

  const canManageSelectedTeam = computed(() => {
    return isManager(selectedTeam.value)
  })

  const canChangeMemberRoles = computed(() => {
    return selectedTeam.value?.role === 'OWNER'
  })

  const dismissNotification = (notificationId: number) => {
    const timerId = notificationTimers.get(notificationId)
    if (timerId) {
      window.clearTimeout(timerId)
      notificationTimers.delete(notificationId)
    }

    notifications.value = notifications.value.filter(
      (notification) => notification.id !== notificationId,
    )
  }

  const pushNotification = (
    kind: UiNotificationKind,
    title: string,
    description?: string,
    ttlMs = 4200,
  ) => {
    notificationIdCounter += 1
    const nextNotificationId = notificationIdCounter

    notifications.value = [
      { id: nextNotificationId, kind, title, description },
      ...notifications.value,
    ]

    if (typeof window !== 'undefined') {
      const timerId = window.setTimeout(() => {
        dismissNotification(nextNotificationId)
      }, ttlMs)
      notificationTimers.set(nextNotificationId, timerId)
    }
  }

  const clearTeamScopedData = () => {
    members.value = []
    boards.value = []
    membersError.value = null
    boardsError.value = null
  }

  const loadMembers = async (teamId: number) => {
    const requestId = ++memberRequestId
    isMembersLoading.value = true
    membersError.value = null

    try {
      const payload = await teamsApiClient.getTeamMembers(teamId)
      if (requestId !== memberRequestId) {
        return
      }
      members.value = payload
    } catch (error) {
      if (requestId !== memberRequestId) {
        return
      }
      members.value = []
      membersError.value = toUiError(error, 'Не удалось загрузить участников команды')
    } finally {
      if (requestId === memberRequestId) {
        isMembersLoading.value = false
      }
    }
  }

  const loadBoards = async (teamId: number, noNeedSkeleton: boolean = false) => {
    const requestId = ++boardRequestId
    if (!noNeedSkeleton) {
      isBoardsLoading.value = true
    }
    boardsError.value = null

    try {
      const payload = await retroBoardsApiClient.getBoards(teamId)
      if (requestId !== boardRequestId) {
        return
      }
      boards.value = payload
    } catch (error) {
      if (requestId !== boardRequestId) {
        return
      }
      boards.value = []
      boardsError.value = toUiError(error, 'Не удалось загрузить доски команды')
    } finally {
      if (requestId === boardRequestId) {
        isBoardsLoading.value = false
      }
    }
  }

  const loadSelectedTeamDetails = async (teamId: number) => {
    await Promise.all([loadMembers(teamId), loadBoards(teamId)])
  }

  const resolveNextSelectedTeamId = (preferredTeamId?: number) => {
    if (preferredTeamId && teams.value.some((team) => team.id === preferredTeamId)) {
      return preferredTeamId
    }
    if (selectedTeamId.value && teams.value.some((team) => team.id === selectedTeamId.value)) {
      return selectedTeamId.value
    }

    return teams.value[0]?.id ?? null
  }

  const loadTeams = async (preferredTeamId?: number, includeSelectedTeamDetails = true) => {
    isTeamsLoading.value = true
    teamsError.value = null

    try {
      const previousSelectedTeamId = selectedTeamId.value
      teams.value = await teamsApiClient.getTeams()
      const nextTeamId = resolveNextSelectedTeamId(preferredTeamId)
      selectedTeamId.value = nextTeamId

      if (!nextTeamId) {
        clearTeamScopedData()
        return
      }

      if (includeSelectedTeamDetails) {
        await loadSelectedTeamDetails(nextTeamId)
        return
      }

      if (previousSelectedTeamId !== nextTeamId) {
        clearTeamScopedData()
      }
    } catch (error) {
      teams.value = []
      selectedTeamId.value = null
      clearTeamScopedData()
      teamsError.value = toUiError(error, 'Не удалось загрузить команды')
    } finally {
      isTeamsLoading.value = false
    }
  }

  const initialize = async (preferredTeamId?: number) => {
    await loadTeams(preferredTeamId)
  }

  const selectTeam = async (teamId: number) => {
    if (selectedTeamId.value === teamId && members.value.length > 0 && boards.value.length > 0) {
      return
    }

    selectedTeamId.value = teamId
    await loadSelectedTeamDetails(teamId)
  }

  const createTeam = async () => {
    const teamName = createTeamName.value.trim()
    if (!teamName) {
      pushNotification('error', 'Название команды пустое', 'Укажите название новой команды.')
      return
    }

    isTeamCreating.value = true

    try {
      const createdTeam = await teamsApiClient.createTeam({ name: teamName })
      createTeamName.value = ''
      await loadTeams(createdTeam?.id)

      if (!createdTeam?.id) {
        const teamWithSameName = [...teams.value]
          .filter((team) => team.name === teamName)
          .sort((left, right) => right.id - left.id)[0]

        if (teamWithSameName) {
          await selectTeam(teamWithSameName.id)
        }
      }

      pushNotification('success', 'Команда создана', `Команда "${teamName}" успешно создана.`)
    } catch (error) {
      const uiError = toUiError(error, 'Не удалось создать команду')
      pushNotification('error', uiError.title, uiError.description)
    } finally {
      isTeamCreating.value = false
    }
  }

  const addMember = async () => {
    const teamId = selectedTeamId.value
    const email = addMemberEmail.value.trim()
    if (!teamId || !canManageSelectedTeam.value) {
      return
    }
    if (!email) {
      pushNotification('error', 'Email обязателен', 'Введите email пользователя для добавления.')
      return
    }

    isMemberAdding.value = true

    try {
      await teamsApiClient.addTeamMember(teamId, {
        email,
        role: addMemberRole.value,
      })
      addMemberEmail.value = ''
      addMemberRole.value = 'MEMBER'
      await loadMembers(teamId)
      pushNotification('success', 'Участник добавлен', `Пользователь ${email} добавлен в команду.`)
    } catch (error) {
      const uiError = toUiError(error, 'Не удалось добавить участника')
      membersError.value = uiError
      pushNotification('error', uiError.title, uiError.description)
    } finally {
      isMemberAdding.value = false
    }
  }

  const removeMember = async (memberId: string) => {
    const teamId = selectedTeamId.value
    if (!teamId || !canManageSelectedTeam.value) {
      return
    }

    removingMemberId.value = memberId

    try {
      await teamsApiClient.removeTeamMember(teamId, memberId)
      await loadMembers(teamId)
      pushNotification('success', 'Участник удален')
    } catch (error) {
      const apiError = toTeamBoardsApiError(error, 'Не удалось удалить участника')
      const uiError = toUiError(apiError, 'Не удалось удалить участника')
      membersError.value = uiError
      pushNotification('error', uiError.title, uiError.description)
    } finally {
      removingMemberId.value = null
    }
  }

  const updateMemberRole = async (memberId: string, role: TeamAdminRole) => {
    const teamId = selectedTeamId.value
    if (!teamId || !canChangeMemberRoles.value) {
      return
    }

    const currentMember = members.value.find((member) => member.id === memberId)
    if (!currentMember || currentMember.role === role) {
      return
    }

    changingMemberRoleId.value = memberId

    try {
      await teamsApiClient.updateTeamMemberRole(teamId, memberId, { role })
      await loadMembers(teamId)
      pushNotification('success', 'Роль участника обновлена')
    } catch (error) {
      const uiError = toUiError(error, 'Не удалось изменить роль участника')
      membersError.value = uiError
      pushNotification('error', uiError.title, uiError.description)
    } finally {
      changingMemberRoleId.value = null
    }
  }

  const createBoard = async () => {
    const teamId = selectedTeamId.value
    if (!teamId || !canManageSelectedTeam.value) {
      return
    }

    const name = createBoardName.value.trim()
    const date = createBoardDate.value.trim()
    const description = createBoardDescription.value.trim()

    isBoardCreating.value = true

    try {
      const createdBoard = await retroBoardsApiClient.createBoard({
        teamId,
        name: name || undefined,
        date: date || undefined,
        description: description || undefined,
      })

      createBoardName.value = ''
      createBoardDate.value = ''
      createBoardDescription.value = ''

      await loadBoards(teamId)
      pushNotification(
        'success',
        'Доска создана',
        createdBoard?.name ? `Доска "${createdBoard.name}" успешно создана.` : undefined,
      )
    } catch (error) {
      const uiError = toUiError(error, 'Не удалось создать доску')
      boardsError.value = uiError
      pushNotification('error', uiError.title, uiError.description)
    } finally {
      isBoardCreating.value = false
    }
  }

  const reloadTeams = debounce(async () => {
    await loadTeams(selectedTeamId.value ?? undefined, false)
  }, RELOAD_DEBOUNCE_MS)

  const reloadMembers = debounce(async () => {
    if (!selectedTeamId.value) {
      return
    }
    await loadMembers(selectedTeamId.value)
  }, RELOAD_DEBOUNCE_MS)

  const reloadBoards = debounce(async () => {
    if (!selectedTeamId.value) {
      return
    }
    await loadBoards(selectedTeamId.value, true)
  }, RELOAD_DEBOUNCE_MS)

  onBeforeUnmount(() => {
    reloadTeams.cancel()
    reloadMembers.cancel()
    reloadBoards.cancel()

    for (const timerId of notificationTimers.values()) {
      window.clearTimeout(timerId)
    }
    notificationTimers.clear()
  })

  return {
    teams,
    members,
    boards,
    selectedTeamId,
    selectedTeam,
    canManageSelectedTeam,
    canChangeMemberRoles,
    isTeamsLoading,
    isMembersLoading,
    isBoardsLoading,
    isTeamCreating,
    isMemberAdding,
    removingMemberId,
    changingMemberRoleId,
    isBoardCreating,
    teamsError,
    membersError,
    boardsError,
    createTeamName,
    addMemberEmail,
    addMemberRole,
    createBoardName,
    createBoardDate,
    createBoardDescription,
    notifications,
    initialize,
    selectTeam,
    createTeam,
    addMember,
    removeMember,
    updateMemberRole,
    createBoard,
    reloadTeams,
    reloadMembers,
    reloadBoards,
    dismissNotification,
  }
}

export type TeamsDashboardComposable = ReturnType<typeof useTeamsDashboard>
