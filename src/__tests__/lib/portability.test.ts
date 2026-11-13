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
    challengeOutcome: null,
    challengeModel: null,
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
      // Northwind carries forecasts and a sealed challenge, so its seal payload is v3.
      version: 'da-seal-v3',
      hash: record.sealHash,
      sealedAt: record.sealedAt!.toISOString(),
      retroactive: false,
    })
    expect(await computeSealHash(seal.payload)).toBe(seal.hash)
    expect(buildArchiveExport([record]).schemaVersion).toBe('1.5.0')
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
    expect(buildArchiveExport([record]).schemaVersion).toBe('1.5.0')
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

describe('forecasts in exports and imports', () => {
  const withForecasts = (key: string) => ({ ...getDemoDecision(demoDecisionIdForKey(key))!, outcomes: [] })
  const day = (date: Date) => date.toISOString().slice(0, 10)

  it('exports forecasts with their resolutions and a seal that re-hashes', async () => {
    const record = withForecasts('northwind-offer')
    const portable = toPortableDecision(record)
    expect(portable.forecasts).toEqual(
      record.forecasts.map((forecast) => ({
        statement: forecast.statement,
        probability: forecast.probability,
        resolveBy: forecast.resolveBy.toISOString(),
        resolution: forecast.resolution,
        resolvedAt: forecast.resolvedAt?.toISOString() ?? null,
      }))
    )
    expect(portable.forecasts[0]).toMatchObject({ statement: 'I own a major part of the product within a year', probability: 80, resolution: 'HAPPENED' })
    expect(portable.seal!.version).toBe('da-seal-v3')
    expect(portable.seal!.payload).toContain('"forecasts": [')
    expect(await computeSealHash(portable.seal!.payload)).toBe(portable.seal!.hash)
    expect(buildArchiveExport([record]).schemaVersion).toBe('1.5.0')
  })

  it('writes a Forecasts section after the predicted outcome, and none without forecasts', () => {
    const record = withForecasts('northwind-offer')
    const markdown = buildDecisionMarkdown(record)
    expect(markdown.indexOf('## Forecasts')).toBeGreaterThan(markdown.indexOf('## Predicted Outcome'))
    const [first] = record.forecasts
    expect(markdown).toContain(
      `- 80% that I own a major part of the product within a year by ${day(first.resolveBy)}: Happened (resolved ${day(first.resolvedAt!)})`
    )
    const podcast = withForecasts('fernhill-podcast')
    expect(buildDecisionMarkdown(podcast)).toContain(
      `- 60% that we publish six episodes in the first three months by ${day(podcast.forecasts[0].resolveBy)}: Open`
    )
    expect(buildDecisionMarkdown({ ...record, forecasts: [] })).not.toContain('## Forecasts')
  })

  it('imports an export without losing a forecast, still takes older files, and validates probabilities', async () => {
    const record = withForecasts('first-customer-discount')
    const parsed = parseImportPayload(JSON.parse(JSON.stringify(buildArchiveExport([record]))))
    const rows = await importPortableDecisions({ id: 'u1' } as User, parsed.decisions)
    expect(rows[0].forecasts).toEqual({
      create: record.forecasts.map((forecast, position) => ({
        position,
        statement: forecast.statement,
        probability: forecast.probability,
        resolveBy: forecast.resolveBy,
        resolution: forecast.resolution,
        resolvedAt: forecast.resolvedAt,
      })),
    })

    const older = JSON.parse(JSON.stringify(buildArchiveExport([{ ...record, forecasts: [] }])))
    older.schemaVersion = '1.2.0'
    delete older.decisions[0].forecasts
    const olderRows = await importPortableDecisions({ id: 'u1' } as User, parseImportPayload(older).decisions)
    expect(olderRows[0].forecasts).toEqual({ create: [] })

    const bad = JSON.parse(JSON.stringify(buildArchiveExport([record])))
    bad.decisions[0].forecasts[0].probability = 72
    expect(() => parseImportPayload(bad)).toThrow()
  })
})

describe('field notes in exports', () => {
  it('exports linked notes oldest first in JSON and Markdown, and free notes with the archive', () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    const record = { ...decision, outcomes: decision.outcomes }
    const portable = toPortableDecision(record)
    expect(portable.fieldNotes.map((note) => note.body)).toEqual(decision.fieldNotes.map((note) => note.body))
    expect(portable.fieldNotes[0]).toEqual({
      body: decision.fieldNotes[0].body,
      mood: decision.fieldNotes[0].mood,
      energy: decision.fieldNotes[0].energy,
      promoted: true,
      writtenAt: decision.fieldNotes[0].createdAt.toISOString(),
    })
    const markdown = buildDecisionMarkdown(record)
    expect(markdown.indexOf('## Field Notes')).toBeGreaterThan(markdown.indexOf('## Outcome History'))
    const first = decision.fieldNotes[0]
    expect(markdown).toContain('- ' + first.createdAt.toISOString().slice(0, 10) + ': ' + first.body + ' (Steady · Lively)')
    expect(buildDecisionMarkdown({ ...record, fieldNotes: [] })).not.toContain('## Field Notes')

    const free = { ...decision.fieldNotes[0], id: 'free', decisionId: null, promoted: false, mood: null, energy: null }
    const archive = buildArchiveExport([record], [free])
    expect(archive.schemaVersion).toBe('1.5.0')
    expect(archive.notes).toEqual([{ body: free.body, mood: null, energy: null, promoted: false, writtenAt: free.createdAt.toISOString() }])
    const parsed = parseImportPayload(JSON.parse(JSON.stringify(archive)))
    expect(parsed.decisions[0]).not.toHaveProperty('fieldNotes')
  })
})


describe('challenge in exports', () => {
  // Northwind's own demo challenge is stripped, so each case sets exactly the challenge it tests.
  const base = { ...getDemoDecision(demoDecisionIdForKey('northwind-offer'))!, challengeOutcome: null, challengeModel: null, challengeQuestions: [] }
  const withChallenge = (outcome: 'ASKED' | 'SKIPPED' | 'UNAVAILABLE') => ({
    ...base,
    challengeOutcome: outcome,
    challengeModel: outcome === 'ASKED' ? 'openai/gpt-5-mini' : null,
    challengeQuestions:
      outcome === 'ASKED'
        ? [
            { id: 'q2', decisionId: base.id, position: 1, question: 'Second?', answer: null, createdAt: base.createdAt },
            { id: 'q1', decisionId: base.id, position: 0, question: 'First?', answer: 'kept', createdAt: base.createdAt },
          ]
        : [],
  })

  it('exports 1.5.0 with the challenge in position order', () => {
    const archive = buildArchiveExport([withChallenge('ASKED')])
    expect(archive.schemaVersion).toBe('1.5.0')
    expect(archive.decisions[0].challenge).toEqual({
      outcome: 'asked',
      model: 'openai/gpt-5-mini',
      questions: [
        { question: 'First?', answer: 'kept' },
        { question: 'Second?', answer: null },
      ],
    })
    expect(toPortableDecision(base).challenge).toBeNull()
  })

  it('writes a Questions Before Sealing Markdown section after Forecasts', () => {
    const markdown = buildDecisionMarkdown(withChallenge('ASKED'))
    expect(markdown).toContain(['## Questions Before Sealing', '', '1. First?', '   Answer: kept', '2. Second?', '   Left unanswered.'].join('\n'))
    expect(markdown.indexOf('## Forecasts')).toBeLessThan(markdown.indexOf('## Questions Before Sealing'))
    expect(buildDecisionMarkdown(withChallenge('SKIPPED'))).toContain('## Questions Before Sealing\n\nSealed without questions.')
    expect(buildDecisionMarkdown(withChallenge('UNAVAILABLE'))).toContain('## Questions Before Sealing\n\nThe AI could not be reached before sealing.')
    expect(buildDecisionMarkdown(base)).not.toContain('## Questions Before Sealing')
  })

  it('exports a v3 seal whose payload matches the record', async () => {
    const { buildSealPayload } = await import('@/lib/seal')
    const record = withChallenge('ASKED')
    const sealHash = await computeSealHash(buildSealPayload(record))
    const seal = toPortableDecision({ ...record, sealHash, sealedAt: record.createdAt }).seal!
    expect(seal.version).toBe('da-seal-v3')
    expect(seal.payload).toBe(buildSealPayload(record))
    expect(await computeSealHash(seal.payload)).toBe(sealHash)
  })

  it('imports a 1.5.0 file and ignores its challenge', async () => {
    const parsed = parseImportPayload(JSON.parse(JSON.stringify(buildArchiveExport([withChallenge('ASKED')]))))
    const rows = await importPortableDecisions({ id: 'u1' } as User, parsed.decisions)
    expect(rows[0]).not.toHaveProperty('challengeQuestions')
    expect(rows[0]).not.toHaveProperty('challengeOutcome')
  })
})
