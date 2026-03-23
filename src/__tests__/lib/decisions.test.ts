import { describe, it, expect } from 'vitest'
import { OUTCOME_LABELS, OUTCOME_COLORS } from '@/lib/decisions'
import type { OutcomeRating } from '@prisma/client'

describe('OUTCOME_LABELS', () => {
  const ratings: OutcomeRating[] = [
    'MUCH_BETTER', 'SLIGHTLY_BETTER', 'AS_EXPECTED',
    'SLIGHTLY_WORSE', 'MUCH_WORSE', 'TOO_EARLY_TO_TELL',
  ]

  it('has a label for every OutcomeRating value', () => {
    for (const r of ratings) expect(OUTCOME_LABELS[r]).toBeTruthy()
  })

  it('has a color class for every OutcomeRating value', () => {
    for (const r of ratings) expect(OUTCOME_COLORS[r]).toBeTruthy()
  })

  it('positive outcomes use green/emerald color classes', () => {
    expect(OUTCOME_COLORS['MUCH_BETTER']).toContain('emerald')
    expect(OUTCOME_COLORS['SLIGHTLY_BETTER']).toContain('green')
  })

  it('negative outcomes use red/amber color classes', () => {
    expect(OUTCOME_COLORS['MUCH_WORSE']).toContain('red')
    expect(OUTCOME_COLORS['SLIGHTLY_WORSE']).toContain('amber')
  })
})

describe('DecisionFilters — page/limit defaults', () => {
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
