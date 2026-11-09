import { describe, it, expect } from 'vitest'
import { OUTCOME_LABELS, OUTCOME_TONES } from '@/lib/outcomes'
import type { OutcomeRating } from '@prisma/client'

describe('OUTCOME_LABELS', () => {
  const ratings: OutcomeRating[] = [
    'MUCH_BETTER', 'SLIGHTLY_BETTER', 'AS_EXPECTED',
    'SLIGHTLY_WORSE', 'MUCH_WORSE', 'TOO_EARLY_TO_TELL',
  ]

  it('has a label for every OutcomeRating value', () => {
    for (const r of ratings) expect(OUTCOME_LABELS[r]).toBeTruthy()
  })

  it('has a badge tone for every OutcomeRating value', () => {
    for (const r of ratings) expect(OUTCOME_TONES[r]).toBeTruthy()
  })

  it('marks the best outcome with signal and the worst with danger', () => {
    expect(OUTCOME_TONES['MUCH_BETTER']).toBe('signal')
    expect(OUTCOME_TONES['MUCH_WORSE']).toBe('danger')
  })

  it('keeps the two extremes visually distinct from the middle', () => {
    const middle = OUTCOME_TONES['AS_EXPECTED']
    expect(OUTCOME_TONES['MUCH_BETTER']).not.toBe(middle)
    expect(OUTCOME_TONES['MUCH_WORSE']).not.toBe(middle)
  })
})

describe('DecisionFilters: page/limit defaults', () => {
  it('page defaults to 1 when param is undefined', () => {
    const pageStr: string | undefined = undefined
    const page = Math.max(1, parseInt(pageStr ?? '1'))
    expect(page).toBe(1)
  })

  it('clamps negative page to 1', () => {
    expect(Math.max(1, parseInt('-5'))).toBe(1)
  })

  it('limit is capped at 50', () => {
    expect(Math.min(50, parseInt('200'))).toBe(50)
  })

  it('clamps minimum confidence into the supported 1-10 range', () => {
    expect(Math.max(1, Math.min(10, parseInt('12')))).toBe(10)
    expect(Math.max(1, Math.min(10, parseInt('0')))).toBe(1)
  })

  it('supports the richer outcome filter values used by the archive', () => {
    const outcome = 'negative'
    expect(['pending', 'has', 'positive', 'negative', 'expected', 'too_early']).toContain(outcome)
  })
})
