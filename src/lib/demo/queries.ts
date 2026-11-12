import type { AssumptionReview, DecisionRecord, FieldNote, OutcomeUpdate } from '@prisma/client'
import { normalizeAssumption } from '@/lib/assumptions'
import { computeSealHashSync } from '@/lib/seal-node'
import { matchesOutcomeFilter, type DecisionFilters } from '@/lib/archive-view'
import { buildDemoArchive, demoDecisionIdForKey, type DemoDecision } from './archive'
import { DEMO_SEEDS } from './seed'
import { DEMO_NOW } from './clock'
import { buildDemoNotes } from './notes'
import type { StrataRecord } from '@/lib/strata'

/** A list row: like getDecisions, `outcomes` holds only the latest outcome. */
export type DemoListRecord = DecisionRecord & { outcomes: OutcomeUpdate[] }

/** The same fields the app's archive search covers. */
const SEARCH_FIELDS = [
  'title',
  'summary',
  'context',
  'alternatives',
  'chosenOption',
  'reasoning',
  'values',
  'uncertainties',
  'predictedOutcome',
  'supplementaryNotes',
] as const

function matchesSearch(record: DemoDecision, q: string | undefined): boolean {
  const tokens = q?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? []
  if (tokens.length === 0) return true
  const haystacks = SEARCH_FIELDS.map((field) => (record[field] ?? '').toLowerCase())
  return tokens.every((token) => haystacks.some((text) => text.includes(token)))
}

function matchesFilters(record: DemoDecision, filters: DecisionFilters): boolean {
  const { domain, dateFrom, dateTo, outcome, minConfidence, maxConfidence, tag } = filters
  const confidence = record.confidenceLevel
  if (domain && record.domainTag !== domain) return false
  if (dateFrom && record.createdAt < new Date(dateFrom)) return false
  if (dateTo && record.createdAt > new Date(dateTo)) return false
  if (typeof minConfidence === 'number' && (confidence === null || confidence < minConfidence)) return false
  if (typeof maxConfidence === 'number' && (confidence === null || confidence > maxConfidence)) return false
  if (tag?.trim() && !record.customTags.includes(tag.trim())) return false
  return matchesOutcomeFilter(record.outcomes.at(-1)?.outcomeRating, outcome) && matchesSearch(record, filters.q)
}

function toListRecord(decision: DemoDecision): DemoListRecord {
  const record: DemoListRecord & { corrections?: unknown } = { ...decision, outcomes: decision.outcomes.slice(-1) }
  delete record.corrections
  return record
}

/** In-memory equivalent of the archive query: newest first, paginated, latest outcome only. */
export function listDemoDecisions(
  filters: DecisionFilters,
  now: Date = DEMO_NOW
): { records: DemoListRecord[]; total: number; page: number; limit: number } {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const matching = buildDemoArchive(now)
    .filter((record) => matchesFilters(record, filters))
    .reverse()

  const records = matching.slice((page - 1) * limit, page * limit).map(toListRecord)

  return { records, total: matching.length, page, limit }
}

/** One demo decision with all outcomes (oldest first) and corrections (newest first), or null. */
/** One demo decision with its field notes (oldest first), or null. */
export function getDemoDecision(id: string, now: Date = DEMO_NOW): (DemoDecision & { fieldNotes: FieldNote[] }) | null {
  const decision = buildDemoArchive(now).find((record) => record.id === id)
  if (!decision) return null
  const fieldNotes = buildDemoNotes(now)
    .filter((note) => note.decisionId === id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return { ...decision, fieldNotes }
}

export function getDemoCalibrationRecords(now: Date = DEMO_NOW): DemoDecision[] {
  return buildDemoArchive(now)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Rowan's seeded verdicts for one demo decision, shaped like stored reviews. */
export function getDemoAssumptionReviews(id: string, now: Date = DEMO_NOW): AssumptionReview[] {
  const seed = DEMO_SEEDS.find((candidate) => demoDecisionIdForKey(candidate.key) === id)
  const decision = getDemoDecision(id, now)
  if (!seed?.assumptionReviews?.length || !decision) return []
  // Reviewed when the latest outcome came in, or a day after sealing if there is none.
  const reviewedAt = decision.outcomes.at(-1)?.createdAt ?? new Date(decision.createdAt.getTime() + DAY_MS)
  return seed.assumptionReviews.map((review, index) => ({
    id: `${id}-r${index + 1}`,
    decisionId: id,
    itemHash: computeSealHashSync(normalizeAssumption(review.item)),
    itemText: review.item,
    verdict: review.verdict,
    note: review.note ?? null,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  }))
}

/** Every demo decision matching the archive filters, shaped for the strata layout: oldest first, all outcomes. */
export function listDemoStrataRecords(filters: DecisionFilters, now: Date = DEMO_NOW): { records: StrataRecord[]; total: number } {
  const records = buildDemoArchive(now)
    .filter((record) => matchesFilters(record, filters))
    .map((record) => ({
      id: record.id,
      catalogNumber: record.catalogNumber,
      title: record.title,
      domainTag: record.domainTag,
      createdAt: record.createdAt,
      outcomes: record.outcomes.map(({ createdAt, outcomeRating }) => ({ createdAt, outcomeRating })),
    }))
  return { records, total: records.length }
}
