import { describe, expect, it } from 'vitest'
import { splitAssumptions } from '@/lib/assumptions'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoAssumptionReviews } from '@/lib/demo/queries'
import { DEMO_SEEDS } from '@/lib/demo/seed'

describe('demo assumption reviews', () => {
  it('seeds verdicts only for real split assumptions', () => {
    for (const seed of DEMO_SEEDS) {
      const items = splitAssumptions(seed.uncertainties ?? null)
      for (const review of seed.assumptionReviews ?? []) expect(items).toContain(review.item)
    }
  })

  it('returns the Northwind verdicts as reviews', () => {
    const reviews = getDemoAssumptionReviews(demoDecisionIdForKey('northwind-offer'))
    expect(reviews.map((review) => [review.itemText, review.verdict, review.note])).toEqual([
      ['Whether the team is as good on a bad week as in interviews.', 'HELD', 'The team was the whole bet, and it was right.'],
      ['Whether the hours stay reasonable.', 'PARTLY', 'Long in two stretches, never unsustainable.'],
    ])
    expect(reviews[0].itemHash).toMatch(/^[0-9a-f]{64}$/)
    expect(reviews[0].decisionId).toBe(demoDecisionIdForKey('northwind-offer'))
  })

  it('seeds thirteen verdicts across all three kinds', () => {
    const all = DEMO_SEEDS.flatMap((seed) => seed.assumptionReviews ?? [])
    expect(all).toHaveLength(13)
    expect(new Set(all.map((review) => review.verdict))).toEqual(new Set(['HELD', 'PARTLY', 'DIDNT']))
    expect(getDemoAssumptionReviews('clx0abc123def456')).toEqual([])
  })
})
