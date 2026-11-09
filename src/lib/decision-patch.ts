import { isDecisionLocked, type LockableDecision } from '@/lib/locks'

export type PatchIntent = 'notes' | 'finalize' | 'draft' | 'core'

type PatchAuthorization = { ok: true } | { ok: false; status: 403 | 409; error: string }

export function classifyDecisionPatch(
  body: Record<string, unknown>,
  record: { isDraft: boolean }
): PatchIntent {
  const keys = Object.keys(body)
  if (keys.length === 1 && keys[0] === 'supplementaryNotes') return 'notes'
  if (body.finalize === true) return 'finalize'
  if (record.isDraft) return 'draft'
  return 'core'
}

export function authorizeDecisionPatch(
  record: LockableDecision & { isDraft: boolean },
  intent: PatchIntent,
  now = new Date()
): PatchAuthorization {
  switch (intent) {
    case 'notes':
      return { ok: true }
    case 'finalize':
    case 'draft':
      return record.isDraft
        ? { ok: true }
        : { ok: false, status: 409, error: 'This decision is already finalized.' }
    case 'core':
      return isDecisionLocked(record, now)
        ? { ok: false, status: 403, error: 'Record is locked. Only supplementary notes can be updated.' }
        : { ok: true }
  }
}

export function buildFinalizeTimestamps(
  record: { isDraft: boolean; createdAt: Date },
  now: Date
): { createdAt?: Date; draftStartedAt?: Date } {
  if (!record.isDraft) return {}
  return { createdAt: now, draftStartedAt: record.createdAt }
}
