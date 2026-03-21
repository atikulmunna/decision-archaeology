const LOCK_WINDOW_MS = 5 * 60 * 1000

type LockableDecision = {
  isLocked: boolean
  lockedAt: Date | null
  createdAt: Date
  isImported: boolean
}

export function getDecisionLockDeadline(record: Pick<LockableDecision, 'createdAt'>): Date {
  return new Date(record.createdAt.getTime() + LOCK_WINDOW_MS)
}

export function isDecisionLocked(record: LockableDecision, now = new Date()): boolean {
  if (record.isImported) return false
  if (record.isLocked) return true
  return getDecisionLockDeadline(record).getTime() <= now.getTime()
}

export function normalizeDecisionLockState<T extends LockableDecision>(record: T, now = new Date()): T {
  if (!isDecisionLocked(record, now)) return record

  return {
    ...record,
    isLocked: true,
    lockedAt: record.lockedAt ?? getDecisionLockDeadline(record),
  }
}
