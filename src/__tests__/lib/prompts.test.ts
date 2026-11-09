import { describe, it, expect } from 'vitest'
import {
  buildAssumptionExtractionPrompt,
  buildBiasDetectionPrompt,
  buildCalibrationAnalysisPrompt,
  buildSynthesisPrompt,
} from '@/lib/prompts'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'

function makeDecision(overrides: Partial<DecisionRecord> = {}): DecisionRecord {
  return {
    id: '1',
    userId: 'user1',
    title: 'Accept senior role at Acme',
    summary: 'Deciding whether to accept the offer',
    context: 'Context text here',
    alternatives: 'Stay or go',
    chosenOption: 'Accept the offer',
    reasoning: 'Better salary and growth',
    values: null,
    uncertainties: null,
    predictedOutcome: 'Will succeed',
    predictedTimeframe: null,
    confidenceLevel: 7,
    domainTag: 'CAREER',
    customTags: [],
    supplementaryNotes: null,
    isLocked: true,
    lockedAt: new Date(),
    isDraft: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  } as DecisionRecord
}

describe('buildAssumptionExtractionPrompt', () => {
  it('includes all key decision fields', () => {
    const prompt = buildAssumptionExtractionPrompt([makeDecision()])
    expect(prompt).toContain('Accept senior role at Acme')
    expect(prompt).toContain('Deciding whether to accept the offer')
    expect(prompt).toContain('Better salary and growth')
  })

  it('embeds decision text safely and labels decisions by id', () => {
    const reasoning = 'He said "go"\nthen \ left'
    const prompt = buildAssumptionExtractionPrompt([makeDecision({ id: 'abc', reasoning })])
    expect(prompt).toContain('"id":"abc"')
    expect(prompt).toContain(JSON.stringify(reasoning))
  })
})

describe('buildBiasDetectionPrompt', () => {
  it('includes all 8 cognitive bias names from the taxonomy', () => {
    const prompt = buildBiasDetectionPrompt({ decisions: [] }, {})
    expect(prompt).toContain('Overconfidence Bias')
    expect(prompt).toContain('Confirmation Bias')
    expect(prompt).toContain('Sunk Cost Fallacy')
    expect(prompt).toContain('Availability Heuristic')
    expect(prompt).toContain('Planning Fallacy')
    expect(prompt).toContain('Status Quo Bias')
    expect(prompt).toContain('Optimism Bias')
    expect(prompt).toContain('Anchoring Bias')
  })

  it('names affected decisions by title', () => {
    const prompt = buildBiasDetectionPrompt(
      { decisions: [{ decisionId: 'abc', assumptions: ['Rates stay low'] }] },
      { abc: 'Refinance the house' }
    )
    expect(prompt).toContain('Refinance the house')
    expect(prompt).toContain('Rates stay low')
  })
})

describe('buildCalibrationAnalysisPrompt', () => {
  it('returns empty string when no decisions have outcomes', () => {
    const d = { ...makeDecision(), outcomes: [] as OutcomeUpdate[], predictedOutcome: null }
    expect(buildCalibrationAnalysisPrompt([d])).toBe('')
  })

  it('includes decision data when outcomes exist', () => {
    const outcome: OutcomeUpdate = {
      id: 'o1',
      decisionId: '1',
      outcomeRating: 'AS_EXPECTED',
      whatHappened: 'Went well',
      lessonsLearned: null,
      createdAt: new Date(),
    }
    const d = { ...makeDecision(), outcomes: [outcome] }
    const prompt = buildCalibrationAnalysisPrompt([d])
    expect(prompt).toContain('Accept senior role at Acme')
    expect(prompt).toContain('AS_EXPECTED')
  })
})

describe('buildSynthesisPrompt', () => {
  it('includes decision count and date range', () => {
    const prompt = buildSynthesisPrompt({
      biases: { biases: [] },
      calibration: null,
      totalDecisions: 12,
      dateRange: 'Jan 2025 to Mar 2025',
    })
    expect(prompt).toContain('12 decisions')
    expect(prompt).toContain('Jan 2025 to Mar 2025')
  })

  it('includes bias findings and calibration patterns', () => {
    const prompt = buildSynthesisPrompt({
      biases: {
        biases: [
          { name: 'Optimism Bias', severity: 'MODERATE', evidence: 'e', affectedDecisions: ['A'], reframe: 'r' },
        ],
      },
      calibration: { patterns: [{ description: 'Underestimates timelines', frequency: 'frequent', affectedDecisions: ['A'] }] },
      totalDecisions: 12,
      dateRange: 'Jan 2025',
    })
    expect(prompt).toContain('Optimism Bias')
    expect(prompt).toContain('Underestimates timelines')
  })
})
