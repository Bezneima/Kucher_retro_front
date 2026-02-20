export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER'

export type TeamAdminRole = Exclude<TeamRole, 'OWNER'>

export type TeamSummary = {
  id: number
  name: string
  role: TeamRole
}

export type TeamMember = {
  id: string
  email: string
  name: string | null
  role: TeamRole
}

export type RetroBoardSummary = {
  id: number
  teamId: number
  name: string
  date: string | null
  description: string | null
  columns: RetroBoardSummaryColumn[]
}

export type RetroBoardSummaryItem = {
  id: number
  color?: string
  rowIndex?: number
}

export type RetroBoardSummaryColumn = {
  id: number
  name: string
  color: string
  items: RetroBoardSummaryItem[]
}

export type CreateTeamRequest = {
  name: string
}

export type AddTeamMemberRequest = {
  email: string
  role?: TeamAdminRole
}

export type UpdateTeamMemberRoleRequest = {
  role: TeamAdminRole
}

export type CreateRetroBoardRequest = {
  teamId: number
  name?: string
  date?: string
  description?: string
}

export type ApiErrorCode = 'UNKNOWN' | 'NOT_IMPLEMENTED'

export type ApiUiError = {
  status?: number
  title: string
  description: string
}

export type UiNotificationKind = 'success' | 'error' | 'info'

export type UiNotification = {
  id: number
  kind: UiNotificationKind
  title: string
  description?: string
}
