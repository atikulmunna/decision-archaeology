import { describe, expect, it } from 'vitest'
import {
  buildArchiveExport,
  buildDecisionMarkdown,
  normalizeCsvImport,
  parseCsv,
} from '@/lib/portability'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'

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
