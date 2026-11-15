import { describe, expect, it } from 'vitest'
import { DEMO_SEEDS } from '@/lib/demo/seed'

/** Every sealed and outcome sentence Rowan wrote, with the day it was written. */
function writings() {
  return DEMO_SEEDS.flatMap((seed) => [
    ...[seed.title, seed.summary, seed.context, seed.alternatives, seed.chosenOption, seed.reasoning, seed.values ?? '', seed.uncertainties ?? '', seed.predictedOutcome ?? ''].map(
      (text) => ({ key: seed.key, text })
    ),
    ...seed.outcomes.map((outcome) => ({ key: seed.key, text: outcome.whatHappened })),
  ])
}

describe('the demo story', () => {
  it('names no real products or companies', () => {
    const real = /\b(Slack|Google|Microsoft|Apple|Amazon|Notion|Zoom|Jira)\b/
    expect(writings().filter(({ text }) => real.test(text))).toEqual([])
  })

  it('only says "after a year" once a year has passed', () => {
    const early = DEMO_SEEDS.flatMap((seed) =>
      seed.outcomes
        .filter((outcome) => /\bafter a year\b/i.test(outcome.whatHappened))
        .filter((outcome) => seed.daysAgo - outcome.daysAgo < 330)
        .map((outcome) => `${seed.key}: ${seed.daysAgo - outcome.daysAgo} days`)
    )
    expect(early).toEqual([])
  })

  it('never leans on the emergency fund before it was built', () => {
    const fund = DEMO_SEEDS.find((seed) => seed.key === 'emergency-fund')!
    const filled = fund.outcomes[0].daysAgo
    const leaning = DEMO_SEEDS.filter((seed) => seed.key !== 'emergency-fund' && seed.daysAgo > filled)
      .filter((seed) => /emergency fund covers/i.test(seed.reasoning))
      .map((seed) => seed.key)
    expect(leaning).toEqual([])
    // Its own outcome may not credit a decision that came before the fund was full.
    expect(fund.outcomes[0].whatHappened).not.toMatch(/reason the Northwind offer felt/)
  })
})
