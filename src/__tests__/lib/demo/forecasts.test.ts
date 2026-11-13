import { describe, expect, it } from 'vitest'
import { buildDemoArchive } from '@/lib/demo/archive'
import { DEMO_NOW } from '@/lib/demo/clock'
import { brierScore, calibrationFinding, isDue, scoredCount } from '@/lib/forecasting'
import { buildSealPayload } from '@/lib/seal'
import { computeSealHashSync } from '@/lib/seal-node'

const DAY_MS = 24 * 60 * 60 * 1000
const archive = buildDemoArchive()
const all = archive.flatMap((decision) => decision.forecasts)

describe("Rowan's forecasts", () => {
  it('has the fixed counts', () => {
    expect(all).toHaveLength(70)
    expect(Math.max(...archive.map((decision) => decision.forecasts.length))).toBeLessThanOrEqual(3)
    expect(scoredCount(all)).toBe(60)
    expect(all.filter((forecast) => forecast.resolution === 'VOID')).toHaveLength(1)
    expect(all.filter((forecast) => forecast.resolution === null)).toHaveLength(9)
    expect(all.filter((forecast) => isDue(forecast, DEMO_NOW))).toHaveLength(3)
  })

  it('keeps every date and probability inside the rules', () => {
    for (const decision of archive) {
      decision.forecasts.forEach((forecast, index) => {
        expect(forecast.id).toBe(`${decision.id}-f${index + 1}`)
        expect(forecast.position).toBe(index)
        expect(forecast.probability % 5).toBe(0)
        expect(forecast.probability).toBeGreaterThanOrEqual(5)
        expect(forecast.probability).toBeLessThanOrEqual(95)
        expect(forecast.resolveBy.toISOString().endsWith('T00:00:00.000Z')).toBe(true)
        if (forecast.resolution === null) {
          expect(forecast.resolvedAt).toBeNull()
          return
        }
        const resolvedAt = forecast.resolvedAt!.getTime()
        expect(resolvedAt).toBeGreaterThanOrEqual(decision.createdAt.getTime())
        expect(resolvedAt).toBeLessThanOrEqual(DEMO_NOW.getTime())
        if (forecast.resolution !== 'HAPPENED') {
          expect(resolvedAt).toBeGreaterThanOrEqual(forecast.resolveBy.getTime() + DAY_MS)
        }
      })
    }
  })

  it('scores to the numbers the demo calibration page shows', () => {
    expect(brierScore(all)).toBeCloseTo(11.3875 / 60, 10)
    expect(brierScore(all)!.toFixed(2)).toBe('0.19')
    expect(calibrationFinding(all)).toEqual({
      end: 'confident',
      sentence: 'When you said 70% or more, it happened 71% of the time.',
      verdict: 'Overconfident',
    })
  })

  it('seals forecasts in v2 and leaves the newest decisions unresolved', () => {
    for (const decision of archive) {
      const payload = buildSealPayload(decision)
      expect(computeSealHashSync(payload)).toBe(decision.sealHash)
      // A sealed challenge makes the payload v3; forecasts alone keep v2.
      if (decision.forecasts.length > 0) expect(payload).toContain(decision.challengeOutcome ? '"seal": "da-seal-v3"' : '"seal": "da-seal-v2"')
      if (decision.outcomes.length === 0) expect(scoredCount(decision.forecasts)).toBe(0)
    }
    for (const decision of archive.slice(-3)) {
      expect(decision.forecasts.every((forecast) => forecast.resolution === null)).toBe(true)
    }
  })
})
