import { describe, it, expect } from 'vitest'
import {
  buildNormalizationPrompt,
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

describe('buildNormalizationPrompt', () => {
  it('includes all key decision fields', () => {
    const prompt = buildNormalizationPrompt([makeDecision()])
    expect(prompt).toContain('Accept senior role at Acme')
    expect(prompt).toContain('Deciding whether to accept the offer')
    expect(prompt).toContain('Better salary and growth')
  })

  it('numbers decisions sequentially', () => {
    const prompt = buildNormalizationPrompt([makeDecision(), makeDecision({ id: '2', title: 'Decision 2' })])
    expect(prompt).toContain('[Decision 1]')
    expect(prompt).toContain('[Decision 2]')
  })
})

describe('buildBiasDetectionPrompt', () => {
  it('includes all 8 cognitive bias names from the taxonomy', () => {
    const prompt = buildBiasDetectionPrompt('{"assumptions":[]}')
    expect(prompt).toContain('Overconfidence Bias')
    expect(prompt).toContain('Confirmation Bias')
    expect(prompt).toContain('Sunk Cost Fallacy')
    expect(prompt).toContain('Availability Heuristic')
    expect(prompt).toContain('Planning Fallacy')
    expect(prompt).toContain('Status Quo Bias')
    expect(prompt).toContain('Optimism Bias')
    expect(prompt).toContain('Anchoring Bias')
  })

  it('requests severity levels in the output schema', () => {
    const prompt = buildBiasDetectionPrompt('{}')
    expect(prompt).toContain('MILD')
    expect(prompt).toContain('MODERATE')
    expect(prompt).toContain('STRONG')
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
      biasesJson: '{}',
      calibrationJson: '{}',
      totalDecisions: 12,
      dateRange: 'Jan 2025 – Mar 2025',
    })
    expect(prompt).toContain('12 decisions')
    expect(prompt).toContain('Jan 2025 – Mar 2025')
  })

  it('requests JSON output with expected fields', () => {
    const prompt = buildSynthesisPrompt({
      biasesJson: '{}',
      calibrationJson: '{}',
      totalDecisions: 5,
      dateRange: 'Jan 2025',
    })
    expect(prompt).toContain('"summary"')
    expect(prompt).toContain('"biases"')
    expect(prompt).toContain('"calibrationInsight"')
  })
})
