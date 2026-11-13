import { describe, it, expect } from 'vitest'
import {
  computeCalibrationScore,
  getClosedPredictedDecisions,
  scoreLabel,
  scoreColor,
  scoreStroke,
} from '@/lib/calibration'
import { summarizeCalibration } from '@/lib/calibration'
import { buildDemoArchive } from '@/lib/demo/archive'
import { DEMO_NOW } from '@/lib/demo/clock'
import type { OutcomeUpdate, DecisionRecord } from '@prisma/client'

function makeOutcome(rating: OutcomeUpdate['outcomeRating'], id = '1'): OutcomeUpdate {
  return {
    id,
    decisionId: 'dec1',
    outcomeRating: rating,
    whatHappened: 'test',
    lessonsLearned: null,
    createdAt: new Date(),
  }
}

function makeDecision(
  overrides: Partial<DecisionRecord & { outcomes: OutcomeUpdate[] }> = {}
): DecisionRecord & { outcomes: OutcomeUpdate[] } {
  return {
    id: overrides.id ?? 'dec1',
    userId: 'user1',
    title: 'Decision title long enough',
    summary: 'A summary that is comfortably longer than twenty characters.',
    context: 'A context field that is comfortably longer than twenty characters.',
    alternatives: 'Several alternatives that are comfortably longer than twenty characters.',
    chosenOption: 'A chosen option that is comfortably longer than twenty characters.',
    reasoning: 'Reasoning that is comfortably longer than twenty characters.',
    values: null,
    uncertainties: null,
    predictedOutcome: 'A predicted outcome',
    predictedTimeframe: null,
    confidenceLevel: 7,
    domainTag: 'CAREER',
    customTags: [],
    attachments: [],
    supplementaryNotes: null,
    isImported: false,
    isDraft: false,
    draftStartedAt: null,
    challengeOutcome: null,
    challengeModel: null,
    sealHash: null,
    sealedAt: null,
    catalogNumber: null,
    isLocked: true,
    lockedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    outcomes: [],
    ...overrides,
  }
}

describe('computeCalibrationScore', () => {
  it('returns null with fewer than 5 closed predicted decisions', () => {
    const records = [
      makeDecision({ id: '1', outcomes: [makeOutcome('AS_EXPECTED', '1')] }),
      makeDecision({ id: '2', outcomes: [makeOutcome('AS_EXPECTED', '2')] }),
    ]
    expect(computeCalibrationScore(records)).toBe(null)
  })

  it('returns 100 when all outcomes are aligned', () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      makeDecision({ id: String(i), outcomes: [makeOutcome('AS_EXPECTED', String(i))] })
    )
    expect(computeCalibrationScore(records)).toBe(100)
  })

  it('returns 0 when all outcomes are misaligned', () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      makeDecision({ id: String(i), outcomes: [makeOutcome('MUCH_WORSE', String(i))] })
    )
    expect(computeCalibrationScore(records)).toBe(0)
  })

  it('returns the aligned percentage for mixed results', () => {
    const records = [
      makeDecision({ id: '1', outcomes: [makeOutcome('AS_EXPECTED', '1')] }),
      makeDecision({ id: '2', outcomes: [makeOutcome('AS_EXPECTED', '2')] }),
      makeDecision({ id: '3', outcomes: [makeOutcome('MUCH_WORSE', '3')] }),
      makeDecision({ id: '4', outcomes: [makeOutcome('MUCH_WORSE', '4')] }),
      makeDecision({ id: '5', outcomes: [makeOutcome('MUCH_BETTER', '5')] }),
    ]
    expect(computeCalibrationScore(records)).toBe(40)
  })

  it('excludes TOO_EARLY_TO_TELL and uses the latest closed outcome', () => {
    const records = [
      makeDecision({
        id: '1',
        outcomes: [makeOutcome('AS_EXPECTED', '1'), makeOutcome('TOO_EARLY_TO_TELL', '2')],
      }),
      makeDecision({ id: '2', outcomes: [makeOutcome('AS_EXPECTED', '3')] }),
      makeDecision({ id: '3', outcomes: [makeOutcome('AS_EXPECTED', '4')] }),
      makeDecision({ id: '4', outcomes: [makeOutcome('AS_EXPECTED', '5')] }),
      makeDecision({ id: '5', outcomes: [makeOutcome('AS_EXPECTED', '6')] }),
    ]
    expect(computeCalibrationScore(records)).toBe(100)
  })

  it('returns null when all outcomes are TOO_EARLY_TO_TELL', () => {
    const records = Array.from({ length: 7 }, (_, i) =>
      makeDecision({ id: String(i), outcomes: [makeOutcome('TOO_EARLY_TO_TELL', String(i))] })
    )
    expect(computeCalibrationScore(records)).toBe(null)
  })

  it('ignores records without a predicted outcome', () => {
    const records = [
      makeDecision({ id: '1', predictedOutcome: null, outcomes: [makeOutcome('MUCH_WORSE', '1')] }),
      makeDecision({ id: '2', outcomes: [makeOutcome('AS_EXPECTED', '2')] }),
      makeDecision({ id: '3', outcomes: [makeOutcome('AS_EXPECTED', '3')] }),
      makeDecision({ id: '4', outcomes: [makeOutcome('AS_EXPECTED', '4')] }),
      makeDecision({ id: '5', outcomes: [makeOutcome('AS_EXPECTED', '5')] }),
      makeDecision({ id: '6', outcomes: [makeOutcome('AS_EXPECTED', '6')] }),
    ]
    expect(computeCalibrationScore(records)).toBe(100)
  })
})

describe('getClosedPredictedDecisions', () => {
  it('returns only records with predictions and a closed outcome', () => {
    const records = [
      makeDecision({ id: '1', outcomes: [makeOutcome('AS_EXPECTED', '1')] }),
      makeDecision({ id: '2', predictedOutcome: null, outcomes: [makeOutcome('AS_EXPECTED', '2')] }),
      makeDecision({ id: '3', outcomes: [makeOutcome('TOO_EARLY_TO_TELL', '3')] }),
    ]

    expect(getClosedPredictedDecisions(records).map((record) => record.id)).toEqual(['1'])
  })
})

describe('scoreLabel', () => {
  it('returns "Not enough data" for null', () => {
    expect(scoreLabel(null)).toBe('Not enough data')
  })

  it('returns "Excellent calibration" for score >= 80', () => {
    expect(scoreLabel(90)).toBe('Excellent calibration')
  })

  it('returns "Poor calibration" for very low scores', () => {
    expect(scoreLabel(10)).toBe('Poor calibration')
  })
})

describe('scoreColor', () => {
  it('returns muted text for a missing score', () => {
    expect(scoreColor(null)).toBe('text-muted')
  })

  it('returns signal-ink for high scores', () => {
    expect(scoreColor(80)).toBe('text-signal-ink')
  })

  it('returns ink for middling scores', () => {
    expect(scoreColor(65)).toBe('text-ink')
  })

  it('returns danger for low scores', () => {
    expect(scoreColor(10)).toBe('text-danger')
  })
})

describe('scoreStroke', () => {
  it('maps scores to SVG stroke tokens', () => {
    expect(scoreStroke(85)).toBe('stroke-signal-ink')
    expect(scoreStroke(65)).toBe('stroke-ink')
    expect(scoreStroke(30)).toBe('stroke-danger')
  })
})

describe('summarizeCalibration', () => {
  it('summarizes the demo archive calibration', () => {
    const data = summarizeCalibration(buildDemoArchive(), DEMO_NOW)
    expect(data).toMatchObject({
      score: 71,
      closedDecisions: 14,
      totalDecisions: 24,
      minRequired: 5,
    })
    expect(data.forecasts).toMatchObject({ scored: 60, resolved: 61, open: 9, due: 3, needed: 0 })
    expect(data.forecasts.brier).toBeCloseTo(11.3875 / 60, 10)
  })

  it('withholds the score below the minimum', () => {
    expect(summarizeCalibration(buildDemoArchive().slice(0, 3), DEMO_NOW)).toMatchObject({ score: null, totalDecisions: 3 })
  })
})
