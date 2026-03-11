import type { OutcomeUpdate, DecisionRecord, DomainTag } from '@prisma/client'

type OutcomeRating = OutcomeUpdate['outcomeRating']

// SRS DA-FR25 calibration formula
// Aligned    = AS_EXPECTED | SLIGHTLY_BETTER | SLIGHTLY_WORSE  → +1
// Misaligned = MUCH_BETTER | MUCH_WORSE                        → -1
// Excluded   = TOO_EARLY_TO_TELL                               → ignored
// Score = (Aligned - Misaligned) / (Aligned + Misaligned) × 100

const ALIGNED: Set<OutcomeRating> = new Set([
  'AS_EXPECTED',
  'SLIGHTLY_BETTER',
  'SLIGHTLY_WORSE',
])

const MISALIGNED: Set<OutcomeRating> = new Set([
  'MUCH_BETTER',
  'MUCH_WORSE',
])

export function computeCalibrationScore(
  outcomes: OutcomeUpdate[],
  minRequired = 5
): number | null {
  const closed = outcomes.filter((o) => o.outcomeRating !== 'TOO_EARLY_TO_TELL')
  if (closed.length < minRequired) return null

  let aligned = 0
  let misaligned = 0

  for (const o of closed) {
    if (ALIGNED.has(o.outcomeRating)) aligned++
    else if (MISALIGNED.has(o.outcomeRating)) misaligned++
  }

  const denominator = aligned + misaligned
  if (denominator === 0) return null

  return Math.round(((aligned - misaligned) / denominator) * 100)
}

export function computeCalibrationByDomain(
  records: (DecisionRecord & { outcomes: OutcomeUpdate[] })[],
  minRequired = 5
): Partial<Record<DomainTag, number | null>> {
  const byDomain = new Map<DomainTag, OutcomeUpdate[]>()

  for (const record of records) {
    if (!record.domainTag) continue
    const existing = byDomain.get(record.domainTag) ?? []
    byDomain.set(record.domainTag, [...existing, ...record.outcomes])
  }

  const result: Partial<Record<DomainTag, number | null>> = {}
  for (const [domain, outcomes] of byDomain) {
    result[domain] = computeCalibrationScore(outcomes, minRequired)
  }
  return result
}

export function scoreLabel(score: number | null): string {
  if (score === null) return 'Not enough data'
  if (score >= 80) return 'Excellent calibration'
  if (score >= 60) return 'Good calibration'
  if (score >= 40) return 'Fair calibration'
  if (score >= 20) return 'Needs improvement'
  return 'Poor calibration'
}

export function scoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400'
  if (score >= 60) return 'text-emerald-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}
