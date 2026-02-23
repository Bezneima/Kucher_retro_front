export type ShareLinkResponse = {
  shareUrl: string
  code: string
  teamId: number
  boardId: number
}

export type InviteInfoResponse = {
  valid: boolean
  teamId: number
  teamName: string
  boardId: number
  boardName: string
}

export type AcceptInviteResponse = {
  joined: boolean
  alreadyMember: boolean
  teamId: number
  boardId: number
  redirectPath: string
}

export type PendingInvitePayload = {
  v: 1
  code: string
  source: 'invite'
  createdAt: string
}
