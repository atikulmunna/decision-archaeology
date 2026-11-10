import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { OutcomeUpdate } from '@prisma/client'
import { LatestOutcomeNotice, latestOutcomeTone } from '@/components/decisions/LatestOutcomeNotice'

const outcome = (outcomeRating: OutcomeUpdate['outcomeRating']): OutcomeUpdate => ({
  id: 'o1',
  decisionId: 'd1',
  whatHappened: 'Shipped late and over budget.',
  outcomeRating,
  lessonsLearned: null,
  createdAt: new Date('2026-11-01'),
})

describe('LatestOutcomeNotice', () => {
  it('picks the callout tone from the outcome instead of always celebrating', () => {
    expect(latestOutcomeTone('MUCH_BETTER')).toBe('success')
    expect(latestOutcomeTone('AS_EXPECTED')).toBe('success')
    expect(latestOutcomeTone('SLIGHTLY_WORSE')).toBe('warning')
    expect(latestOutcomeTone('MUCH_WORSE')).toBe('warning')
    expect(latestOutcomeTone('TOO_EARLY_TO_TELL')).toBe('info')
  })

  it('keeps a bad outcome and its date off the highlight background', () => {
    render(<LatestOutcomeNotice outcome={outcome('MUCH_WORSE')} />)
    const notice = screen.getByRole('status')
    expect(notice.className).not.toMatch(/bg-highlight/)
    expect(screen.getByText('Nov 1, 2026').className).not.toMatch(/text-muted/)
  })
})
