import { describe, expect, it } from 'vitest'
import {
  buildArchiveExport,
  buildDecisionMarkdown,
  normalizeCsvImport,
  parseCsv,
} from '@/lib/portability'
import { importPortableDecisions, parseImportPayload, toPortableDecision } from '@/lib/portability'
import type { DecisionRecord, OutcomeUpdate, User } from '@prisma/client'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoAssumptionReviews, getDemoDecision } from '@/lib/demo/queries'
import { computeSealHash } from '@/lib/seal'

function createDecision(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    id: 'decision_1',
    userId: 'user_1',
    title: 'Deciding whether to move to a new city for a job opportunity',
    summary: 'I am weighing whether the opportunity in another city is worth the disruption, cost, and change in my current routine.',
    context: 'The role offers stronger growth, but the move would separate me from my support system and increase my monthly expenses.',
    alternatives: 'Option 1: Stay where I am. Option 2: Accept the move. Option 3: Negotiate a remote arrangement first.',
    chosenOption: 'Accept the role if the relocation package and long-term upside still look sound after a final review.',
    reasoning: 'The opportunity compounds my long-term options, but only if the downside is manageable and I am honest about the transition cost.',
    isLocked: true,
    lockedAt: new Date('2026-01-01T00:05:00.000Z'),
    values: 'Growth, stability, and maintaining strong personal relationships.',
    uncertainties: 'Whether the team culture is as healthy as it seems and how quickly I would adapt to the new city.',
    predictedOutcome: 'I expect the move to accelerate my career and feel worthwhile within one year.',
    predictedTimeframe: new Date('2026-12-31T00:00:00.000Z'),
    confidenceLevel: 7,
    domainTag: 'CAREER',
    customTags: ['relocation', 'career'],
    attachments: [],
    supplementaryNotes: 'Imported from older notes.',
    isImported: false,
    isDraft: false,
    draftStartedAt: null,
    sealHash: null,
    sealedAt: null,
    catalogNumber: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createOutcome(overrides: Partial<OutcomeUpdate> = {}): OutcomeUpdate {
  return {
    id: 'outcome_1',
    decisionId: 'decision_1',
    whatHappened: 'Six months later the role delivered stronger growth, but the transition stress was higher than expected.',
    outcomeRating: 'SLIGHTLY_BETTER',
    lessonsLearned: 'I should have planned more explicitly for the social transition, not just the financial one.',
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('buildArchiveExport', () => {
  it('returns a portable archive shape with decisions', () => {
    const archive = buildArchiveExport([
      { ...createDecision(), outcomes: [createOutcome()] },
    ])

    expect(archive.schemaVersion).toBeTruthy()
    expect(archive.decisions).toHaveLength(1)
    expect(archive.decisions[0].outcomes[0].outcomeRating).toBe('SLIGHTLY_BETTER')
  })
})

describe('buildDecisionMarkdown', () => {
  it('includes locked fields and outcome history', () => {
    const markdown = buildDecisionMarkdown({
      ...createDecision(),
      outcomes: [createOutcome()],
    })

    expect(markdown).toContain('# Deciding whether to move to a new city for a job opportunity')
    expect(markdown).toContain('## Outcome History')
    expect(markdown).toContain('Slightly better than expected')
  })
})

describe('parseCsv / normalizeCsvImport', () => {
  it('parses a CSV row into import-ready decision data', () => {
    const csv = [
      'title,summary,context,alternatives,chosenOption,reasoning,customTags,outcomeWhatHappened,outcomeRating',
      '"Deciding whether to move to a new city for a job opportunity","I am weighing whether the opportunity in another city is worth the disruption, cost, and change in my current routine.","The role offers stronger growth, but the move would separate me from my support system and increase my monthly expenses.","Option 1: Stay where I am. Option 2: Accept the move. Option 3: Negotiate a remote arrangement first.","Accept the role if the relocation package and long-term upside still look sound after a final review.","The opportunity compounds my long-term options, but only if the downside is manageable and I am honest about the transition cost.","relocation|career","Six months later the role delivered stronger growth, but the transition stress was higher than expected.","SLIGHTLY_BETTER"',
    ].join('\n')

    const normalized = normalizeCsvImport(parseCsv(csv))

    expect(normalized[0].customTags).toEqual(['relocation', 'career'])
    expect(normalized[0].outcomes[0].outcomeRating).toBe('SLIGHTLY_BETTER')
  })
})

describe('seals in exports and imports', () => {
  const sealedRecord = () => ({ ...getDemoDecision(demoDecisionIdForKey('northwind-offer'))!, outcomes: [] })

  it('exports a seal whose payload re-hashes to the stored hash', async () => {
    const record = sealedRecord()
    const seal = toPortableDecision(record).seal!
    expect(seal).toMatchObject({
      version: 'da-seal-v1',
      hash: record.sealHash,
      sealedAt: record.sealedAt!.toISOString(),
      retroactive: false,
    })
    expect(await computeSealHash(seal.payload)).toBe(seal.hash)
    expect(buildArchiveExport([record]).schemaVersion).toBe('1.2.0')
  })

  it('exports null for unsealed records and adds a Seal block only for sealed ones', () => {
    const sealed = sealedRecord()
    const unsealed = { ...sealed, sealHash: null, sealedAt: null }
    expect(toPortableDecision(unsealed).seal).toBeNull()
    const markdown = buildDecisionMarkdown(sealed)
    expect(markdown).toContain('## Seal')
    expect(markdown).toContain(`- Fingerprint (SHA-256): \`${sealed.sealHash}\``)
    expect(markdown).toContain(`- Sealed: ${sealed.sealedAt!.toISOString()}`)
    expect(markdown).toContain('- Verify: hash the payload in the JSON export, for example with sha256sum.')
    expect(buildDecisionMarkdown(unsealed)).not.toContain('## Seal')
  })

  it('marks retroactive seals in Markdown', () => {
    const retro = { ...sealedRecord(), sealedAt: new Date('2026-11-11T09:00:00.000Z') }
    expect(toPortableDecision(retro).seal!.retroactive).toBe(true)
    expect(buildDecisionMarkdown(retro)).toContain('- Sealed: 2026-11-11T09:00:00.000Z (retroactive)')
  })

  it('drops any seal when importing an export', async () => {
    const parsed = parseImportPayload(JSON.parse(JSON.stringify(buildArchiveExport([sealedRecord()]))))
    expect(parsed.decisions[0]).not.toHaveProperty('seal')
    const rows = await importPortableDecisions({ id: 'u1' } as User, parsed.decisions)
    expect(rows[0]).not.toHaveProperty('sealHash')
    expect(rows[0]).not.toHaveProperty('sealedAt')
  })
})

describe('assumption reviews in exports', () => {
  it('exports assumption reviews in JSON and Markdown', () => {
    const id = demoDecisionIdForKey('northwind-offer')
    const record = { ...getDemoDecision(id)!, outcomes: [], assumptionReviews: getDemoAssumptionReviews(id) }
    const portable = toPortableDecision(record)
    expect(portable.assumptionReviews).toEqual([
      {
        assumption: 'Whether the team is as good on a bad week as in interviews.',
        verdict: 'HELD',
        note: 'The team was the whole bet, and it was right.',
        reviewedAt: record.assumptionReviews[0].updatedAt.toISOString(),
      },
      {
        assumption: 'Whether the hours stay reasonable.',
        verdict: 'PARTLY',
        note: 'Long in two stretches, never unsustainable.',
        reviewedAt: record.assumptionReviews[1].updatedAt.toISOString(),
      },
    ])
    expect(buildArchiveExport([record]).schemaVersion).toBe('1.2.0')
    const markdown = buildDecisionMarkdown(record)
    expect(markdown).toContain('## Assumptions')
    expect(markdown).toContain('- Whether the team is as good on a bad week as in interviews. Held up: The team was the whole bet, and it was right.')
    expect(markdown).toContain('- Whether the hours stay reasonable. Partly: Long in two stretches, never unsustainable.')
  })

  it('marks unreviewed assumptions and drops reviews on import', () => {
    const record = { ...getDemoDecision(demoDecisionIdForKey('fernhill-podcast'))!, outcomes: [], assumptionReviews: [] }
    const markdown = buildDecisionMarkdown(record)
    expect(markdown).toContain('- Whether anyone listens. Not reviewed')
    expect(markdown).toContain('- Whether it eats product time. Not reviewed')
    expect(toPortableDecision(record).assumptionReviews).toEqual([])
    const parsed = parseImportPayload(JSON.parse(JSON.stringify(buildArchiveExport([record]))))
    expect(parsed.decisions[0]).not.toHaveProperty('assumptionReviews')
  })

  it('leaves out the Assumptions section when there are no uncertainties', () => {
    const record = { ...getDemoDecision(demoDecisionIdForKey('pottery-class'))!, outcomes: [], assumptionReviews: [] }
    expect(buildDecisionMarkdown(record)).not.toContain('## Assumptions')
  })
})
