import type { CorrectionRequest, DecisionRecord, OutcomeUpdate } from '@prisma/client'
import { DEMO_NOW, daysBefore } from './clock'
import { DEMO_SEEDS, type DemoDecisionSeed } from './seed'

export const DEMO_USER_ID = 'demo-user'

export type DemoDecision = DecisionRecord & { outcomes: OutcomeUpdate[]; corrections: CorrectionRequest[] }

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

  const updatedAt = new Date(
    Math.max(createdAt.getTime(), ...outcomes.map((o) => o.createdAt.getTime()), ...corrections.map((c) => c.createdAt.getTime()))
  )

  return {
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
    draftStartedAt:
      seed.deliberationMinutes === undefined ? null : new Date(createdAt.getTime() - seed.deliberationMinutes * MINUTE_MS),
    createdAt,
    updatedAt,
    outcomes,
    corrections,
  }
}

/** The whole demo archive, oldest first, as the same Prisma shapes the app renders. */
export function buildDemoArchive(now: Date = DEMO_NOW): DemoDecision[] {
  return SEEDS_BY_CREATION.map((seed, index) => buildDecision(seed, index + 1, now))
}
