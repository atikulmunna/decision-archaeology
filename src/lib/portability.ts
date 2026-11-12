import { z } from 'zod'
import type { AssumptionReview, DecisionRecord, FieldNote, Forecast, OutcomeUpdate, User, Tier } from '@prisma/client'
import { matchReviews, splitAssumptions, VERDICT_LABELS } from '@/lib/assumptions'
import { CreateDecisionSchema, DomainTagEnum, DraftForecastSchema, FORECAST_MAX } from '@/lib/validations/decision'
import { OUTCOME_LABELS } from '@/lib/outcomes'
import { buildSealPayload, isRetroactiveSeal, sealVersion } from '@/lib/seal'
import { displayStatement, RESOLUTION_LABELS, type ForecastResolution } from '@/lib/forecasting'
import { moodEnergyLabel } from '@/lib/field-notes'

export const EXPORT_SCHEMA_VERSION = '1.4.0'

const OutcomeRatingEnum = z.enum([
  'MUCH_BETTER',
  'SLIGHTLY_BETTER',
  'AS_EXPECTED',
  'SLIGHTLY_WORSE',
  'MUCH_WORSE',
  'TOO_EARLY_TO_TELL',
])

export type DecisionWithOutcomes = DecisionRecord & {
  outcomes: OutcomeUpdate[]
  assumptionReviews?: AssumptionReview[]
  forecasts?: Forecast[]
  fieldNotes?: FieldNote[]
}

/** A field note as exported. Imports ignore notes, as they ignore assumption reviews. */
export type PortableFieldNote = { body: string; mood: number | null; energy: number | null; promoted: boolean; writtenAt: string }

function toPortableFieldNote(note: FieldNote): PortableFieldNote {
  return { body: note.body, mood: note.mood, energy: note.energy, promoted: note.promoted, writtenAt: note.createdAt.toISOString() }
}

function notesOldestFirst(notes: FieldNote[] | undefined): FieldNote[] {
  return [...(notes ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
}

/** A forecast as exported, with its resolution. Imports keep these: imported records are never sealed. */
export type PortableForecast = {
  statement: string
  probability: number
  resolveBy: string
  resolution: ForecastResolution | null
  resolvedAt: string | null
}

// The statement and probability rules of a forecast, without the future-date check: imports carry history.
const ImportForecastSchema = DraftForecastSchema.pick({ statement: true, probability: true }).extend({
  resolveBy: z.iso.datetime(),
  resolution: z.enum(['HAPPENED', 'DIDNT', 'VOID']).nullable().optional(),
  resolvedAt: z.iso.datetime().nullable().optional(),
})

/** A verdict on one assumption as exported. Imports ignore these, like seals. */
export type PortableAssumptionReview = {
  assumption: string
  verdict: AssumptionReview['verdict']
  note: string | null
  reviewedAt: string
}

export const PortableOutcomeSchema = z.object({
  whatHappened: z.string().min(10, 'Outcome description must be at least 10 characters'),
  outcomeRating: OutcomeRatingEnum,
  lessonsLearned: z.string().optional(),
  createdAt: z.string().datetime().optional(),
})

export const PortableDecisionSchema = CreateDecisionSchema.extend({
  values: z.string().optional(),
  uncertainties: z.string().optional(),
  predictedOutcome: z.string().optional(),
  predictedTimeframe: z.string().datetime().optional().nullable(),
  confidenceLevel: z.number().int().min(1).max(10).optional().nullable(),
  domainTag: DomainTagEnum.optional().nullable(),
  customTags: z.array(z.string()).max(5).default([]),
  supplementaryNotes: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  outcomes: z.array(PortableOutcomeSchema).default([]),
  forecasts: z.array(ImportForecastSchema).max(FORECAST_MAX).default([]),
})

export const PortableArchiveSchema = z.object({
  schemaVersion: z.string(),
  exportedAt: z.string().datetime(),
  decisions: z.array(PortableDecisionSchema),
})

export type PortableDecision = z.infer<typeof PortableDecisionSchema>

/** A record's seal as exported: enough to verify it offline by hashing `payload`. */
export type PortableSeal = { version: string; hash: string; sealedAt: string; retroactive: boolean; payload: string }

export function toPortableSeal(record: DecisionRecord & { forecasts?: Forecast[] }): PortableSeal | null {
  if (!record.sealHash || !record.sealedAt) return null
  return {
    version: sealVersion(record),
    hash: record.sealHash,
    sealedAt: record.sealedAt.toISOString(),
    retroactive: isRetroactiveSeal(record),
    payload: buildSealPayload(record),
  }
}

function orderedForecasts(record: { forecasts?: Forecast[] }): Forecast[] {
  return [...(record.forecasts ?? [])].sort((a, b) => a.position - b.position)
}

const isoDay = (date: Date) => new Date(date).toISOString().slice(0, 10)

/** "- 70% that ... by 2027-06-30: Happened (resolved 2026-11-02)", or ": Open" while unresolved. */
function forecastMarkdownLine(forecast: Forecast): string {
  const head = `- ${forecast.probability}% that ${displayStatement(forecast.statement)} by ${isoDay(forecast.resolveBy)}`
  if (!forecast.resolution) return `${head}: Open`
  const resolved = forecast.resolvedAt ? ` (resolved ${isoDay(forecast.resolvedAt)})` : ''
  return `${head}: ${RESOLUTION_LABELS[forecast.resolution]}${resolved}`
}

// Imports parse with PortableDecisionSchema, which strips unknown keys, so an exported seal is never imported.
export function toPortableDecision(
  record: DecisionWithOutcomes
): Omit<PortableDecision, 'forecasts'> & {
  forecasts: PortableForecast[]
  fieldNotes: PortableFieldNote[]
  seal: PortableSeal | null
  assumptionReviews: PortableAssumptionReview[]
} {
  return {
    title: record.title,
    summary: record.summary,
    context: record.context,
    alternatives: record.alternatives,
    chosenOption: record.chosenOption,
    reasoning: record.reasoning,
    values: record.values ?? undefined,
    uncertainties: record.uncertainties ?? undefined,
    predictedOutcome: record.predictedOutcome ?? undefined,
    predictedTimeframe: record.predictedTimeframe?.toISOString() ?? null,
    confidenceLevel: record.confidenceLevel ?? null,
    domainTag: record.domainTag ?? null,
    customTags: record.customTags ?? [],
    supplementaryNotes: record.supplementaryNotes ?? undefined,
    createdAt: record.createdAt.toISOString(),
    outcomes: record.outcomes.map((outcome) => ({
      whatHappened: outcome.whatHappened,
      outcomeRating: outcome.outcomeRating,
      lessonsLearned: outcome.lessonsLearned ?? undefined,
      createdAt: outcome.createdAt.toISOString(),
    })),
    forecasts: orderedForecasts(record).map((forecast) => ({
      statement: forecast.statement,
      probability: forecast.probability,
      resolveBy: forecast.resolveBy.toISOString(),
      resolution: forecast.resolution,
      resolvedAt: forecast.resolvedAt?.toISOString() ?? null,
    })),
    fieldNotes: notesOldestFirst(record.fieldNotes).map(toPortableFieldNote),
    seal: toPortableSeal(record),
    assumptionReviews: (record.assumptionReviews ?? []).map((review) => ({
      assumption: review.itemText,
      verdict: review.verdict,
      note: review.note,
      reviewedAt: review.updatedAt.toISOString(),
    })),
  }
}

/** The whole archive; `freeNotes` are the field notes not linked to any decision. */
export function buildArchiveExport(records: DecisionWithOutcomes[], freeNotes: FieldNote[] = []) {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    decisions: records.map(toPortableDecision),
    notes: notesOldestFirst(freeNotes).map(toPortableFieldNote),
  }
}

function domainLabel(domainTag: string | null | undefined) {
  return domainTag ? domainTag.charAt(0) + domainTag.slice(1).toLowerCase() : 'Uncategorized'
}

export function buildDecisionMarkdown(record: DecisionWithOutcomes) {
  const lines = [
    `# ${record.title}`,
    '',
    `- Recorded: ${record.createdAt.toISOString()}`,
    `- Domain: ${domainLabel(record.domainTag)}`,
    `- Confidence: ${record.confidenceLevel ? `${record.confidenceLevel}/10` : 'Not set'}`,
    `- Imported: ${record.isImported ? 'Yes' : 'No'}`,
    '',
    '## Summary',
    '',
    record.summary,
    '',
    '## Context',
    '',
    record.context,
    '',
    '## Alternatives Considered',
    '',
    record.alternatives,
    '',
    '## Chosen Option',
    '',
    record.chosenOption,
    '',
    '## Reasoning',
    '',
    record.reasoning,
  ]

  if (record.values) {
    lines.push('', '## Values at Play', '', record.values)
  }
  if (record.uncertainties) {
    lines.push('', '## Key Uncertainties', '', record.uncertainties)
  }
  const assumptions = splitAssumptions(record.uncertainties)
  if (assumptions.length > 0) {
    const { matched } = matchReviews(assumptions, record.assumptionReviews ?? [])
    lines.push(
      '',
      '## Assumptions',
      '',
      ...matched.map(({ item, review }) =>
        review
          ? `- ${item} ${VERDICT_LABELS[review.verdict]}${review.note ? `: ${review.note}` : ''}`
          : `- ${item} Not reviewed`
      )
    )
  }
  if (record.predictedOutcome) {
    lines.push('', '## Predicted Outcome', '', record.predictedOutcome)
  }
  const forecasts = orderedForecasts(record)
  if (forecasts.length > 0) {
    lines.push('', '## Forecasts', '', ...forecasts.map(forecastMarkdownLine))
  }
  if (record.supplementaryNotes) {
    lines.push('', '## Supplementary Notes', '', record.supplementaryNotes)
  }
  if (record.customTags.length > 0) {
    lines.push('', '## Tags', '', record.customTags.map((tag) => `- ${tag}`).join('\n'))
  }
  const seal = toPortableSeal(record)
  if (seal) {
    lines.push(
      '',
      '## Seal',
      '',
      `- Fingerprint (SHA-256): \`${seal.hash}\``,
      `- Sealed: ${seal.sealedAt}${seal.retroactive ? ' (retroactive)' : ''}`,
      '- Verify: hash the payload in the JSON export, for example with sha256sum.'
    )
  }
  if (record.outcomes.length > 0) {
    lines.push('', '## Outcome History', '')
    for (const outcome of record.outcomes) {
      lines.push(`### ${OUTCOME_LABELS[outcome.outcomeRating]}`)
      lines.push(`- Logged: ${outcome.createdAt.toISOString()}`)
      lines.push('', outcome.whatHappened)
      if (outcome.lessonsLearned) {
        lines.push('', `Lessons learned: ${outcome.lessonsLearned}`)
      }
      lines.push('')
    }
  }
  const notes = notesOldestFirst(record.fieldNotes)
  if (notes.length > 0) {
    lines.push('', '## Field Notes', '')
    for (const note of notes) {
      const feeling = moodEnergyLabel(note.mood, note.energy)
      lines.push(`- ${note.createdAt.toISOString().slice(0, 10)}: ${note.body}${feeling ? ` (${feeling})` : ''}`)
    }
  }

  return lines.join('\n')
}

export function buildArchiveMarkdown(records: DecisionWithOutcomes[]) {
  const sections = ['# Decision Archaeology Export', '', `Exported: ${new Date().toISOString()}`, '']

  for (const record of records) {
    sections.push(buildDecisionMarkdown(record), '', '---', '')
  }

  return sections.join('\n')
}

export function getArchiveFilename(format: 'json' | 'markdown') {
  return `decision-archive-export.${format === 'markdown' ? 'md' : 'json'}`
}

export function getDecisionFilename(title: string, format: 'json' | 'markdown') {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'decision-record'

  return `${base}.${format === 'markdown' ? 'md' : 'json'}`
}

export function assertImportTier(tier: Tier) {
  return tier === 'POWER'
}

export function getImportTemplateJson() {
  return JSON.stringify(
    {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      decisions: [
        {
          title: 'Deciding whether to move to a new city for a job opportunity',
          summary: 'I am weighing whether the opportunity in another city is worth the disruption, cost, and change in my current routine.',
          context: 'The role offers stronger growth, but the move would separate me from my support system and increase my monthly expenses.',
          alternatives: 'Option 1: Stay where I am. Option 2: Accept the move. Option 3: Negotiate a remote arrangement first.',
          chosenOption: 'Accept the role and move if relocation support is confirmed and the compensation still makes sense after expenses.',
          reasoning: 'The opportunity compounds my long-term career options, but only if the downside is manageable and I am honest about the transition cost.',
          values: 'Growth, stability, and maintaining strong personal relationships.',
          uncertainties: 'Whether the team culture is as healthy as it seems and how quickly I would adapt to the new city.',
          predictedOutcome: 'I expect the move to accelerate my career and feel worthwhile within one year.',
          predictedTimeframe: new Date().toISOString(),
          confidenceLevel: 7,
          domainTag: 'CAREER',
          customTags: ['relocation', 'career'],
          supplementaryNotes: 'Imported from older notes.',
          createdAt: new Date().toISOString(),
          outcomes: [
            {
              whatHappened: 'Six months later the role delivered stronger growth, but the transition stress was higher than expected.',
              outcomeRating: 'SLIGHTLY_BETTER',
              lessonsLearned: 'I should have planned more explicitly for the social transition, not just the financial one.',
              createdAt: new Date().toISOString(),
            },
          ],
        },
      ],
    },
    null,
    2
  )
}

export const CSV_TEMPLATE_HEADERS = [
  'title',
  'summary',
  'context',
  'alternatives',
  'chosenOption',
  'reasoning',
  'values',
  'uncertainties',
  'predictedOutcome',
  'predictedTimeframe',
  'confidenceLevel',
  'domainTag',
  'customTags',
  'supplementaryNotes',
  'createdAt',
  'outcomeWhatHappened',
  'outcomeRating',
  'outcomeLessonsLearned',
  'outcomeCreatedAt',
] as const

function escapeCsv(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function getImportTemplateCsv() {
  const example = [
    'Deciding whether to move to a new city for a job opportunity',
    'I am weighing whether the opportunity in another city is worth the disruption, cost, and change in my current routine.',
    'The role offers stronger growth, but the move would separate me from my support system and increase my monthly expenses.',
    'Option 1: Stay where I am. Option 2: Accept the move. Option 3: Negotiate a remote arrangement first.',
    'Accept the role and move if relocation support is confirmed and the compensation still makes sense after expenses.',
    'The opportunity compounds my long-term career options, but only if the downside is manageable and I am honest about the transition cost.',
    'Growth, stability, and maintaining strong personal relationships.',
    'Whether the team culture is as healthy as it seems and how quickly I would adapt to the new city.',
    'I expect the move to accelerate my career and feel worthwhile within one year.',
    new Date().toISOString(),
    '7',
    'CAREER',
    'relocation|career',
    'Imported from older notes.',
    new Date().toISOString(),
    'Six months later the role delivered stronger growth, but the transition stress was higher than expected.',
    'SLIGHTLY_BETTER',
    'I should have planned more explicitly for the social transition, not just the financial one.',
    new Date().toISOString(),
  ]

  return `${CSV_TEMPLATE_HEADERS.join(',')}\n${example.map(escapeCsv).join(',')}\n`
}

export function parseCsv(text: string) {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(current)
      current = ''
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row)
      row = []
      continue
    }

    current += char
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current)
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row)
  }

  if (rows.length === 0) return []

  const [headerRow, ...bodyRows] = rows
  return bodyRows.map((cells) =>
    Object.fromEntries(headerRow.map((header, index) => [header, cells[index] ?? '']))
  )
}

export function normalizeCsvImport(records: Array<Record<string, string>>) {
  return records.map((row) => ({
    title: row.title,
    summary: row.summary,
    context: row.context,
    alternatives: row.alternatives,
    chosenOption: row.chosenOption,
    reasoning: row.reasoning,
    values: row.values || undefined,
    uncertainties: row.uncertainties || undefined,
    predictedOutcome: row.predictedOutcome || undefined,
    predictedTimeframe: row.predictedTimeframe || null,
    confidenceLevel: row.confidenceLevel ? Number(row.confidenceLevel) : null,
    domainTag: row.domainTag || null,
    customTags: row.customTags
      ? row.customTags.split('|').map((tag) => tag.trim()).filter(Boolean)
      : [],
    supplementaryNotes: row.supplementaryNotes || undefined,
    createdAt: row.createdAt || undefined,
    outcomes: row.outcomeWhatHappened
      ? [
          {
            whatHappened: row.outcomeWhatHappened,
            outcomeRating: row.outcomeRating || 'AS_EXPECTED',
            lessonsLearned: row.outcomeLessonsLearned || undefined,
            createdAt: row.outcomeCreatedAt || undefined,
          },
        ]
      : [],
  }))
}

export function parseImportPayload(raw: unknown) {
  if (Array.isArray(raw)) {
    return PortableArchiveSchema.parse({
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      decisions: raw,
    })
  }

  return PortableArchiveSchema.parse(raw)
}

export function getImportErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ')
  }

  return error instanceof Error ? error.message : 'Import failed.'
}

export async function importPortableDecisions(user: User, decisions: PortableDecision[]) {
  return decisions.map((decision) => ({
    userId: user.id,
    title: decision.title,
    summary: decision.summary,
    context: decision.context,
    alternatives: decision.alternatives,
    chosenOption: decision.chosenOption,
    reasoning: decision.reasoning,
    values: decision.values ?? null,
    uncertainties: decision.uncertainties ?? null,
    predictedOutcome: decision.predictedOutcome ?? null,
    predictedTimeframe: decision.predictedTimeframe ? new Date(decision.predictedTimeframe) : null,
    confidenceLevel: decision.confidenceLevel ?? null,
    domainTag: decision.domainTag ?? null,
    customTags: decision.customTags ?? [],
    supplementaryNotes: decision.supplementaryNotes ?? null,
    isDraft: false,
    isImported: true,
    isLocked: false,
    createdAt: decision.createdAt ? new Date(decision.createdAt) : new Date(),
    outcomes: {
      create: decision.outcomes.map((outcome) => ({
        whatHappened: outcome.whatHappened,
        outcomeRating: outcome.outcomeRating,
        lessonsLearned: outcome.lessonsLearned ?? null,
        createdAt: outcome.createdAt ? new Date(outcome.createdAt) : new Date(),
      })),
    },
    forecasts: {
      create: decision.forecasts.map((forecast, position) => ({
        position,
        statement: forecast.statement,
        probability: forecast.probability,
        resolveBy: new Date(forecast.resolveBy),
        resolution: forecast.resolution ?? null,
        resolvedAt: forecast.resolvedAt ? new Date(forecast.resolvedAt) : null,
      })),
    },
  }))
}
