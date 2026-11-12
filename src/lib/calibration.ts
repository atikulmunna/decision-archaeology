import type { OutcomeUpdate, DecisionRecord, DomainTag, Forecast } from '@prisma/client'
import { summarizeForecasts, type ForecastSummary } from '@/lib/forecasting'

type OutcomeRating = OutcomeUpdate['outcomeRating']
type DecisionWithOutcomes = DecisionRecord & { outcomes: OutcomeUpdate[] }

// SRS DA-FR25 calibration formula
// Aligned    = AS_EXPECTED | SLIGHTLY_BETTER | SLIGHTLY_WORSE
// Misaligned = MUCH_BETTER | MUCH_WORSE
// Excluded   = TOO_EARLY_TO_TELL
// Score = Aligned / (Aligned + Misaligned) × 100

const ALIGNED: Set<OutcomeRating> = new Set([
  'AS_EXPECTED',
  'SLIGHTLY_BETTER',
  'SLIGHTLY_WORSE',
])

const MISALIGNED: Set<OutcomeRating> = new Set([
  'MUCH_BETTER',
  'MUCH_WORSE',
])

function getLatestClosedOutcome(outcomes: OutcomeUpdate[]): OutcomeUpdate | null {
  const closed = outcomes
    .filter((outcome) => outcome.outcomeRating !== 'TOO_EARLY_TO_TELL')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return closed[0] ?? null
}

export function getClosedPredictedDecisions(records: DecisionWithOutcomes[]): DecisionWithOutcomes[] {
  return records.filter((record) => record.predictedOutcome && getLatestClosedOutcome(record.outcomes))
}

export function computeCalibrationScore(
  records: DecisionWithOutcomes[],
  minRequired = 5
): number | null {
  const closedPredictedRecords = getClosedPredictedDecisions(records)
  if (closedPredictedRecords.length < minRequired) return null

  let aligned = 0
  let misaligned = 0

  for (const record of closedPredictedRecords) {
    const outcome = getLatestClosedOutcome(record.outcomes)
    if (!outcome) continue

    if (ALIGNED.has(outcome.outcomeRating)) aligned++
    else if (MISALIGNED.has(outcome.outcomeRating)) misaligned++
  }

  const denominator = aligned + misaligned
  if (denominator === 0) return null

  return Math.round((aligned / denominator) * 100)
}

export function computeCalibrationByDomain(
  records: DecisionWithOutcomes[],
  minRequired = 5
): Partial<Record<DomainTag, number | null>> {
  const byDomain = new Map<DomainTag, DecisionWithOutcomes[]>()

  for (const record of records) {
    if (!record.domainTag) continue
    const existing = byDomain.get(record.domainTag) ?? []
    byDomain.set(record.domainTag, [...existing, record])
  }

  const result: Partial<Record<DomainTag, number | null>> = {}
  for (const [domain, domainRecords] of byDomain) {
    result[domain] = computeCalibrationScore(domainRecords, minRequired)
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

/** Text token for a calibration score (Field Archive). */
export function scoreColor(score: number | null): string {
  if (score === null) return 'text-muted'
  if (score >= 80) return 'text-signal-ink'
  if (score >= 60) return 'text-ink'
  return 'text-danger'
}

/** SVG stroke token for the calibration gauge arc. */
export function scoreStroke(score: number): string {
  if (score >= 80) return 'stroke-signal-ink'
  if (score >= 60) return 'stroke-ink'
  return 'stroke-danger'
}

/** What the calibration view renders: the forecast scores, plus the older outcome alignment. */
export type CalibrationData = {
  score: number | null
  byDomain: Partial<Record<DomainTag, number | null>>
  closedDecisions: number
  totalDecisions: number
  minRequired: number
  forecasts: ForecastSummary<DomainTag>
}

export function summarizeCalibration(
  records: Array<DecisionWithOutcomes & { forecasts?: Forecast[] }>,
  now: Date,
  minRequired = 5
): CalibrationData {
  return {
    score: computeCalibrationScore(records, minRequired),
    byDomain: computeCalibrationByDomain(records),
    closedDecisions: getClosedPredictedDecisions(records).length,
    totalDecisions: records.length,
    minRequired,
    forecasts: summarizeForecasts(
      records.map((record) => ({ id: record.id, domainTag: record.domainTag, forecasts: record.forecasts ?? [] })),
      now
    ),
  }
}
