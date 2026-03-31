import { z } from 'zod'
import type { DecisionRecord, OutcomeUpdate, User, Tier } from '@prisma/client'
import { CreateDecisionSchema, DomainTagEnum } from '@/lib/validations/decision'
import { OUTCOME_LABELS } from '@/lib/outcomes'

export const EXPORT_SCHEMA_VERSION = '1.0.0'

const OutcomeRatingEnum = z.enum([
  'MUCH_BETTER',
  'SLIGHTLY_BETTER',
  'AS_EXPECTED',
  'SLIGHTLY_WORSE',
  'MUCH_WORSE',
  'TOO_EARLY_TO_TELL',
])

export type DecisionWithOutcomes = DecisionRecord & { outcomes: OutcomeUpdate[] }

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
})

export const PortableArchiveSchema = z.object({
  schemaVersion: z.string(),
  exportedAt: z.string().datetime(),
  decisions: z.array(PortableDecisionSchema),
})

export type PortableDecision = z.infer<typeof PortableDecisionSchema>

export function toPortableDecision(record: DecisionWithOutcomes): PortableDecision {
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
  }
}

export function buildArchiveExport(records: DecisionWithOutcomes[]) {
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    decisions: records.map(toPortableDecision),
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
  if (record.predictedOutcome) {
    lines.push('', '## Predicted Outcome', '', record.predictedOutcome)
  }
  if (record.supplementaryNotes) {
    lines.push('', '## Supplementary Notes', '', record.supplementaryNotes)
  }
  if (record.customTags.length > 0) {
    lines.push('', '## Tags', '', record.customTags.map((tag) => `- ${tag}`).join('\n'))
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
  }))
}
