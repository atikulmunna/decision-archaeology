import type { ChallengeQuestion, DecisionRecord, OutcomeUpdate, CorrectionRequest, FieldNote, Forecast } from '@prisma/client'

export type Decision = DecisionRecord & {
  outcomes: OutcomeUpdate[]
  corrections: CorrectionRequest[]
  /** Loaded with the decision; a record read without them is treated as having none. */
  forecasts?: Forecast[]
  /** Field notes linked to this decision, any order; split at the seal for Then and Now. */
  fieldNotes?: FieldNote[]
  /** Questions the Devil's Advocate asked before sealing, with answers; sealed in v3. */
  challengeQuestions?: ChallengeQuestion[]
  /** The sealed part of a letter to future you: its day and fingerprint, never its text. */
  letter?: { opensAt: Date; sha256: string } | null
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
