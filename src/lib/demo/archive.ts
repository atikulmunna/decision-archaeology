import type { ChallengeQuestion, CorrectionRequest, DecisionRecord, Forecast, OutcomeUpdate } from '@prisma/client'
import { DEMO_NOW, daysBefore } from './clock'
import { DEMO_FORECASTS } from './forecasts'
import { demoChallengeFor } from './challenges'
import { DEMO_SEEDS, type DemoDecisionSeed } from './seed'
import { buildSealPayload } from '@/lib/seal'
import { computeSealHashSync } from '@/lib/seal-node'

export const DEMO_USER_ID = 'demo-user'

export type DemoDecision = DecisionRecord & {
  outcomes: OutcomeUpdate[]
  corrections: CorrectionRequest[]
  forecasts: Forecast[]
  challengeQuestions: ChallengeQuestion[]
}

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS
const LOCK_WINDOW_MS = 5 * MINUTE_MS

/** Seeds in creation order: the oldest decision gets catalog number 1. */
const SEEDS_BY_CREATION = [...DEMO_SEEDS].sort((a, b) => b.daysAgo - a.daysAgo)

export function demoDecisionId(catalogNumber: number): string {
  return `demo-${String(catalogNumber).padStart(4, '0')}`
}

export function demoDecisionIdForKey(key: string): string {
  const index = SEEDS_BY_CREATION.findIndex((seed) => seed.key === key)
  if (index === -1) throw new Error(`Unknown demo seed: ${key}`)
  return demoDecisionId(index + 1)
}

function buildDecision(seed: DemoDecisionSeed, catalogNumber: number, now: Date): DemoDecision {
  const id = demoDecisionId(catalogNumber)
  const createdAt = daysBefore(now, seed.daysAgo)

  const outcomes: OutcomeUpdate[] = [...seed.outcomes]
    .sort((a, b) => b.daysAgo - a.daysAgo)
    .map((outcome, index) => ({
      id: `${id}-o${index + 1}`,
      decisionId: id,
      whatHappened: outcome.whatHappened,
      outcomeRating: outcome.outcomeRating,
      lessonsLearned: outcome.lessonsLearned ?? null,
      createdAt: daysBefore(now, outcome.daysAgo),
    }))

  const corrections: CorrectionRequest[] = [...(seed.corrections ?? [])]
    .sort((a, b) => a.daysAgo - b.daysAgo)
    .map((correction, index) => ({
      id: `${id}-c${index + 1}`,
      decisionId: id,
      fieldName: correction.fieldName,
      originalText: seed[correction.fieldName],
      correctedText: correction.correctedText,
      reason: correction.reason,
      status: correction.status,
      createdAt: daysBefore(now, correction.daysAgo),
    }))

  // Resolve-by dates count from midnight UTC of the day the decision was sealed.
  const sealDay = Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate())
  const forecasts: Forecast[] = (DEMO_FORECASTS[seed.key] ?? []).map((forecast, position) => {
    const resolvedAt = forecast.resolution ? daysBefore(now, forecast.resolvedDaysAgo ?? 0) : null
    return {
      id: `${id}-f${position + 1}`,
      decisionId: id,
      position,
      statement: forecast.statement,
      probability: forecast.probability,
      resolveBy: new Date(sealDay + forecast.resolveByDays * DAY_MS),
      resolution: forecast.resolution ?? null,
      resolvedAt,
      createdAt,
      updatedAt: resolvedAt ?? createdAt,
    }
  })

  // Devil's Advocate questions for the eight decisions that show the step; the rest predate it.
  const challenge = demoChallengeFor(seed.key)
  const challengeQuestions: ChallengeQuestion[] = (challenge?.questions ?? []).map((item) => ({
    id: `${id}-q${item.position + 1}`,
    decisionId: id,
    position: item.position,
    question: item.question,
    answer: item.answer,
    createdAt,
  }))

  const updatedAt = new Date(
    Math.max(createdAt.getTime(), ...outcomes.map((o) => o.createdAt.getTime()), ...corrections.map((c) => c.createdAt.getTime()))
  )

  const record = {
    id,
    userId: DEMO_USER_ID,
    title: seed.title,
    summary: seed.summary,
    context: seed.context,
    alternatives: seed.alternatives,
    chosenOption: seed.chosenOption,
    reasoning: seed.reasoning,
    isLocked: true,
    lockedAt: new Date(createdAt.getTime() + LOCK_WINDOW_MS),
    values: seed.values ?? null,
    uncertainties: seed.uncertainties ?? null,
    predictedOutcome: seed.predictedOutcome ?? null,
    predictedTimeframe:
      seed.predictedTimeframeDays === undefined ? null : new Date(createdAt.getTime() + seed.predictedTimeframeDays * DAY_MS),
    confidenceLevel: seed.confidenceLevel,
    domainTag: seed.domainTag,
    customTags: [...seed.customTags],
    attachments: [],
    supplementaryNotes: seed.supplementaryNotes ?? null,
    isImported: false,
    catalogNumber,
    isDraft: false,
    challengeOutcome: challenge?.outcome ?? null,
    challengeModel: challenge?.model ?? null,
    draftStartedAt:
      seed.deliberationMinutes === undefined ? null : new Date(createdAt.getTime() - seed.deliberationMinutes * MINUTE_MS),
    createdAt,
    updatedAt,
    sealHash: null as string | null,
    sealedAt: null as Date | null,
    outcomes,
    corrections,
    forecasts,
    challengeQuestions,
  }
  // Demo seals are taken at finalization, so they are never retroactive. Forecasts make the payload v2; a challenge makes it v3.
  return { ...record, sealHash: computeSealHashSync(buildSealPayload(record)), sealedAt: createdAt }
}

/** The whole demo archive, oldest first, as the same Prisma shapes the app renders. */
export function buildDemoArchive(now: Date = DEMO_NOW): DemoDecision[] {
  return SEEDS_BY_CREATION.map((seed, index) => buildDecision(seed, index + 1, now))
}
