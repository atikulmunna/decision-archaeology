import { describe, it, expect } from 'vitest'
import {
  computeCalibrationScore,
  computeCalibrationByDomain,
  scoreLabel,
  scoreColor,
} from '@/lib/calibration'
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

describe('computeCalibrationScore', () => {
  it('returns null with fewer than 5 closed decisions', () => {
    const outcomes = [makeOutcome('AS_EXPECTED'), makeOutcome('AS_EXPECTED')]
    expect(computeCalibrationScore(outcomes)).toBe(null)
  })

  it('returns +100 when all outcomes are AS_EXPECTED', () => {
    const outcomes = Array.from({ length: 5 }, (_, i) =>
      makeOutcome('AS_EXPECTED', String(i))
    )
    expect(computeCalibrationScore(outcomes)).toBe(100)
  })

  it('returns +100 when all outcomes are SLIGHTLY_BETTER', () => {
    const outcomes = Array.from({ length: 5 }, (_, i) =>
      makeOutcome('SLIGHTLY_BETTER', String(i))
    )
    expect(computeCalibrationScore(outcomes)).toBe(100)
  })

  it('returns -100 when all outcomes are MUCH_WORSE', () => {
    const outcomes = Array.from({ length: 5 }, (_, i) =>
      makeOutcome('MUCH_WORSE', String(i))
    )
    expect(computeCalibrationScore(outcomes)).toBe(-100)
  })

  it('returns 0 when aligned and misaligned are equal', () => {
    const outcomes = [
      makeOutcome('AS_EXPECTED', '1'),
      makeOutcome('AS_EXPECTED', '2'),
      makeOutcome('MUCH_WORSE', '3'),
      makeOutcome('MUCH_WORSE', '4'),
      makeOutcome('MUCH_BETTER', '5'), // misaligned
    ]
    // aligned=2, misaligned=3 → (2-3)/(2+3) = -20
    expect(computeCalibrationScore(outcomes)).toBe(-20)
  })

  it('excludes TOO_EARLY_TO_TELL from denominator', () => {
    const outcomes = [
      makeOutcome('AS_EXPECTED', '1'),
      makeOutcome('AS_EXPECTED', '2'),
      makeOutcome('AS_EXPECTED', '3'),
      makeOutcome('AS_EXPECTED', '4'),
      makeOutcome('AS_EXPECTED', '5'),
      makeOutcome('TOO_EARLY_TO_TELL', '6'), // ignored
      makeOutcome('TOO_EARLY_TO_TELL', '7'), // ignored
    ]
    expect(computeCalibrationScore(outcomes)).toBe(100)
  })

  it('returns null when all outcomes are TOO_EARLY_TO_TELL', () => {
    const outcomes = Array.from({ length: 7 }, (_, i) =>
      makeOutcome('TOO_EARLY_TO_TELL', String(i))
    )
    expect(computeCalibrationScore(outcomes)).toBe(null)
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
    expect(scoreLabel(-50)).toBe('Poor calibration')
  })
})

describe('scoreColor', () => {
  it('returns gray for null score', () => {
    expect(scoreColor(null)).toContain('gray')
  })
  it('returns emerald for high scores', () => {
    expect(scoreColor(80)).toContain('emerald')
  })
  it('returns red for low scores', () => {
    expect(scoreColor(10)).toContain('red')
  })
})
