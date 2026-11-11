import type { DecisionRecord, OutcomeUpdate, CorrectionRequest } from '@prisma/client'

export type Decision = DecisionRecord & {
  outcomes: OutcomeUpdate[]
  corrections: CorrectionRequest[]
}

export type CollaboratorShare = {
  id: string
  shareId: string
  collaborator: {
    id: string
    email: string
    displayName: string | null
    avatarUrl: string | null
  }
}

export type ShareDiscussion = {
  shareId: string
  collaboratorName: string
  comments: Array<{
    id: string
    content: string
    createdAt: string
    author: { id: string; displayName: string | null; avatarUrl: string | null } | null
  }>
}

export type CollaborationData = {
  currentUserId: string
  shares: CollaboratorShare[]
  discussions: ShareDiscussion[]
}
