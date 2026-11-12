import { describe, expect, it } from 'vitest'
import {
  bandIndex,
  brierByDomain,
  brierScore,
  brierTerm,
  calibrationFinding,
  displayStatement,
  forecastSentence,
  isDue,
  isPastResolveBy,
  reliabilityBands,
  resolutionBlock,
  RESOLUTION_LABELS,
  scoredCount,
  summarizeForecasts,
  type ForecastResolution,
} from '@/lib/forecasting'

const at = (iso: string) => new Date(iso)
const f = (probability: number, resolution: ForecastResolution | null) => ({
  probability,
  resolveBy: at('2026-01-01T00:00:00.000Z'),
  resolution,
})
const many = (n: number, probability: number, happened: number) =>
  Array.from({ length: n }, (_, i) => f(probability, i < happened ? 'HAPPENED' : 'DIDNT'))

describe('Brier score', () => {
  it("scores Happened and Didn't happen only, from five scored", () => {
    const set = [f(70, 'HAPPENED'), f(70, 'DIDNT'), f(90, 'HAPPENED'), f(20, 'DIDNT'), f(50, 'VOID'), f(10, 'DIDNT')]
    expect(brierScore(set)).toBeCloseTo(0.128, 10)
    expect(scoredCount(set)).toBe(5)
    expect(brierScore(set.slice(0, 4))).toBeNull()
    expect(brierTerm(40, 'DIDNT')).toBeCloseTo(0.16, 10)
  })
})

describe('reliability bands', () => {
  it('puts probabilities in ten bands', () => {
    expect([5, 10, 15, 45, 90, 95].map(bandIndex)).toEqual([0, 1, 1, 4, 9, 9])
    expect(reliabilityBands([f(80, 'HAPPENED'), f(85, 'DIDNT'), f(10, 'DIDNT')])).toEqual([
      { band: 1, count: 1, meanStated: 10, shareHappened: 0 },
      { band: 8, count: 2, meanStated: 82.5, shareHappened: 50 },
    ])
  })
})

describe('calibration finding', () => {
  it('reports the end with the larger gap, with a verdict', () => {
    expect(calibrationFinding(many(5, 80, 2))).toEqual({
      end: 'confident',
      sentence: 'When you said 70% or more, it happened 40% of the time.',
      verdict: 'Overconfident',
    })
    expect(calibrationFinding(many(5, 70, 5))?.verdict).toBe('Underconfident')
    expect(calibrationFinding(many(5, 80, 4))?.verdict).toBe('Well calibrated')
    // A gap of exactly 10 points is still well calibrated.
    expect(calibrationFinding(many(5, 90, 4))?.verdict).toBe('Well calibrated')
    expect(calibrationFinding(many(5, 20, 3))).toEqual({
      end: 'doubtful',
      sentence: 'When you said 30% or less, it happened 60% of the time.',
      verdict: 'Overconfident',
    })
    expect(calibrationFinding(many(5, 30, 0))?.verdict).toBe('Underconfident')
    // Equal gaps: the confident end is reported.
    expect(calibrationFinding([...many(5, 80, 2), ...many(5, 20, 3)])?.end).toBe('confident')
    expect(calibrationFinding(many(4, 80, 0))).toBeNull()
  })
})

describe('Brier by domain', () => {
  it('scores domains with at least three scored forecasts', () => {
    expect(
      brierByDomain([
        { domainTag: 'CAREER', forecasts: many(3, 80, 3) },
        { domainTag: 'HEALTH', forecasts: many(2, 80, 0) },
        { domainTag: null, forecasts: many(5, 50, 5) },
      ])
    ).toEqual([{ domain: 'CAREER', brier: expect.closeTo(0.04, 10), count: 3 }])
  })
})

describe('forecast sentence', () => {
  it('lowercases only common sentence-opening words, never names', () => {
    expect(
      ['Sam makes the first repayment', 'Northwind raises a round', 'Thursday evenings feel calmer', 'My commute drops', 'We sign', 'Every customer moves'].map(displayStatement)
    ).toEqual(['Sam makes the first repayment', 'Northwind raises a round', 'Thursday evenings feel calmer', 'my commute drops', 'we sign', 'every customer moves'])
    expect(
      forecastSentence({
        statement: 'The podcast reaches 500 listeners',
        probability: 70,
        resolveBy: at('2026-10-01T00:00:00.000Z'),
      })
    ).toBe('70% that the podcast reaches 500 listeners by Oct 1, 2026')
    expect(['I am promoted', 'NASA launches', 'a'].map(displayStatement)).toEqual(['I am promoted', 'NASA launches', 'a'])
    // The article A reads as a word, unlike I or an abbreviation such as A/B.
    expect(['A listener pays', 'A/B test wins'].map(displayStatement)).toEqual(['a listener pays', 'A/B test wins'])
    expect(RESOLUTION_LABELS).toEqual({ HAPPENED: 'Happened', DIDNT: "Didn't happen", VOID: "Can't tell" })
  })
})

describe('resolving', () => {
  it("opens Didn't happen and Can't tell only after the UTC day ends", () => {
    const by = at('2027-06-30T00:00:00.000Z')
    expect(isPastResolveBy(by, at('2027-06-30T23:59:59.999Z'))).toBe(false)
    expect(isPastResolveBy(by, at('2027-07-01T00:00:00.000Z'))).toBe(true)
    expect(resolutionBlock(by, 'DIDNT', at('2027-06-30T23:59:59.999Z'))).toBe('You can mark this after Jun 30, 2027.')
    expect(resolutionBlock(by, 'VOID', at('2027-07-01T00:00:00.000Z'))).toBeNull()
    expect(resolutionBlock(by, 'HAPPENED', at('2026-01-01T00:00:00.000Z'))).toBeNull()
    expect(resolutionBlock(by, null, at('2026-01-01T00:00:00.000Z'))).toBeNull()
    expect(isDue({ probability: 50, resolveBy: by, resolution: null }, at('2027-07-01T00:00:00.000Z'))).toBe(true)
    expect(isDue({ probability: 50, resolveBy: by, resolution: 'DIDNT' }, at('2027-07-01T00:00:00.000Z'))).toBe(false)
  })
})

describe('forecast summary', () => {
  it('counts, lists what is due oldest first, and withholds scores below the minimum', () => {
    const now = at('2026-11-10T12:00:00.000Z')
    const forecast = (id: string, statement: string, probability: number, resolveBy: string, resolution: ForecastResolution | null) => ({
      id,
      statement,
      position: 0,
      probability,
      resolveBy: at(`${resolveBy}T00:00:00.000Z`),
      resolution,
    })
    const summary = summarizeForecasts(
      [
        {
          id: 'd1',
          domainTag: 'CAREER',
          forecasts: [
            forecast('f1', 'A', 70, '2026-01-01', 'HAPPENED'),
            forecast('f2', 'B', 30, '2026-06-01', null),
            forecast('f3', 'C', 50, '2027-01-01', null),
          ],
        },
        { id: 'd2', domainTag: null, forecasts: [forecast('f4', 'D', 60, '2026-03-01', null), forecast('f5', 'E', 40, '2026-02-01', 'VOID')] },
      ],
      now
    )
    expect(summary).toMatchObject({ brier: null, scored: 1, resolved: 2, open: 3, due: 2, needed: 4, finding: null, byDomain: [] })
    expect(summary.dueList).toEqual([
      { decisionId: 'd2', forecastId: 'f4', sentence: '60% that D by Mar 1, 2026', resolveBy: at('2026-03-01T00:00:00.000Z') },
      { decisionId: 'd1', forecastId: 'f2', sentence: '30% that B by Jun 1, 2026', resolveBy: at('2026-06-01T00:00:00.000Z') },
    ])
    expect(summary.bands).toEqual([{ band: 7, count: 1, meanStated: 70, shareHappened: 100 }])
  })
})
