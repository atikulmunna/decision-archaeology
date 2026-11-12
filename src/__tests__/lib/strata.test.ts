import { describe, expect, it } from 'vitest'
import type { DomainTag, OutcomeUpdate } from '@prisma/client'
import { layoutStrata, outcomeStyle, STRATA_TOP, type StrataRecord } from '@/lib/strata'

type Rating = OutcomeUpdate['outcomeRating']

const NOW = new Date('2026-11-10T12:00:00.000Z')
const rec = (
  catalogNumber: number,
  domainTag: DomainTag | null,
  sealed: string,
  outcomes: Array<[string, Rating]> = [],
  title = `Decision ${catalogNumber}`
): StrataRecord => ({
  id: `d${catalogNumber}`,
  catalogNumber,
  title,
  domainTag,
  createdAt: new Date(sealed),
  outcomes: outcomes.map(([at, outcomeRating]) => ({ createdAt: new Date(at), outcomeRating })),
})
const specimen = (layout: ReturnType<typeof layoutStrata>, id: string) => layout.specimens.find((s) => s.id === id)!

describe('layoutStrata', () => {
  it('draws quarter bands from the oldest record to now', () => {
    const layout = layoutStrata(
      [rec(1, 'CAREER', '2025-05-16T12:00:00.000Z'), rec(2, 'FINANCE', '2026-08-16T00:00:00.000Z')],
      { year: null, now: NOW }
    )
    expect(layout.bands.map((band) => band.label)).toEqual(['Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'])
    expect(layout.bandHeight).toBe(40)
    expect(layout.height).toBe(308)
    expect(layout.bands[0]).toMatchObject({ y: 268, tone: 'a' })
    expect(layout.bands[1].tone).toBe('b')
    expect(specimen(layout, 'd1')).toMatchObject({ x: 74, y: 288, lane: 'CAREER' })
    expect(specimen(layout, 'd2')).toMatchObject({ x: 126, y: 88, lane: 'FINANCE' })
  })

  it('places an outcome above its decision with its style and a core line', () => {
    const layout = layoutStrata(
      [
        rec(1, 'CAREER', '2025-05-16T12:00:00.000Z', [['2025-11-16T00:00:00.000Z', 'AS_EXPECTED']], 'Take the platform role'),
        rec(3, 'HEALTH', '2025-06-01T00:00:00.000Z'),
      ],
      { year: null, now: NOW }
    )
    expect(layout.outcomes).toEqual([{ decisionId: 'd1', x: 74, y: 208, style: 'expected', beyond: null }])
    expect(layout.cores).toEqual([{ decisionId: 'd1', x: 74, y1: 282, y2: 208 }])
    const first = specimen(layout, 'd1')
    expect(first.pending).toBe(false)
    expect(first.name).toBe('DA-0001, Career, Take the platform role, sealed May 16, 2025, latest outcome As expected')
    expect(first.card).toEqual({
      catalog: 'DA-0001',
      domain: 'Career',
      title: 'Take the platform role',
      sealed: 'Sealed May 16, 2025',
      status: 'Latest outcome: As expected',
    })
    const third = specimen(layout, 'd3')
    expect(third.pending).toBe(true)
    expect(third.name.endsWith('no outcome yet')).toBe(true)
    expect(third.card.status).toBe('No outcome yet')
  })

  it('puts a decision on a band boundary at the bottom of the newer band, in UTC', () => {
    const layout = layoutStrata(
      [rec(1, 'CAREER', '2026-04-01T00:00:00.000Z'), rec(2, 'FINANCE', '2026-03-31T18:00:00.000Z')],
      { year: null, now: NOW }
    )
    const q1 = layout.bands.find((band) => band.label === 'Q1 2026')!
    const q2 = layout.bands.find((band) => band.label === 'Q2 2026')!
    expect(specimen(layout, 'd1').y).toBe(q2.y + 40)
    const lateMarch = specimen(layout, 'd2').y
    expect(lateMarch).toBeGreaterThan(q1.y)
    expect(lateMarch).toBeLessThan(q1.y + 40)
    expect(specimen(layout, 'd1').card.sealed).toBe('Sealed Apr 1, 2026')
    expect(specimen(layout, 'd2').card.sealed).toBe('Sealed Mar 31, 2026')
  })

  it('sends a decision without a domain to Other', () => {
    const layout = layoutStrata([rec(1, null, '2026-05-16T12:00:00.000Z')], { year: null, now: NOW })
    expect(specimen(layout, 'd1')).toMatchObject({ x: 334, lane: 'OTHER' })
    expect(specimen(layout, 'd1').card.domain).toBe('Other')
  })

  it('spreads colliding specimens sideways, then up', () => {
    const at = '2026-02-14T12:00:00.000Z'
    const layout = layoutStrata([1, 2, 3, 4].map((n) => rec(n, 'CAREER', at)), { year: null, now: NOW })
    const placed = ['d1', 'd2', 'd3', 'd4'].map((id) => specimen(layout, id))
    expect(placed.map((s) => s.x)).toEqual([74, 60, 88, 74])
    expect(placed[1].y).toBe(placed[0].y)
    expect(placed[2].y).toBe(placed[0].y)
    expect(placed[3].y).toBe(placed[0].y - 14)
  })

  it('never overlaps specimens or leaves the column in a busy week', () => {
    const start = Date.parse('2026-11-05T00:00:00.000Z')
    const records = Array.from({ length: 40 }, (_, i) => new Date(start + i * 3 * 3600 * 1000).toISOString()).flatMap((at, i) => [
      rec(i * 2 + 1, 'CAREER', at),
      rec(i * 2 + 2, 'HEALTH', at),
    ])
    const layout = layoutStrata(records, { year: null, now: NOW })
    expect(layout.bands).toHaveLength(1)
    expect(layout.bandHeight).toBe(406)
    const all = layout.specimens
    expect(all).toHaveLength(80)
    for (let i = 0; i < all.length; i += 1) {
      expect(all[i].y).toBeGreaterThanOrEqual(STRATA_TOP + 6)
      expect(all[i].y).toBeLessThanOrEqual(layout.height - 6)
      for (let j = i + 1; j < all.length; j += 1) {
        const apart = Math.abs(all[i].x - all[j].x) >= 14 || Math.abs(all[i].y - all[j].y) >= 14
        expect(apart).toBe(true)
      }
    }
  })

  it('zooms into a year', () => {
    const records = [
      rec(1, 'CAREER', '2025-05-16T12:00:00.000Z', [['2026-03-10T00:00:00.000Z', 'SLIGHTLY_BETTER']]),
      rec(2, 'FINANCE', '2026-08-16T00:00:00.000Z'),
    ]
    const y2025 = layoutStrata(records, { year: 2025, now: NOW })
    expect(y2025.bands.map((band) => band.label)).toEqual(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'])
    expect(y2025.height).toBe(508)
    expect(y2025.specimens.map((s) => s.id)).toEqual(['d1'])
    expect(y2025.outcomes).toEqual([{ decisionId: 'd1', x: 74, y: 28, style: 'better', beyond: 'Mar 2026' }])

    const y2026 = layoutStrata(records, { year: 2026, now: NOW })
    expect(y2026.bands).toHaveLength(11)
    expect(y2026.bands.at(-1)!.label).toBe('NOV')
    expect(y2026.specimens.map((s) => s.id)).toEqual(['d2'])

    const y2024 = layoutStrata(records, { year: 2024, now: NOW })
    expect(y2024.bands).toHaveLength(12)
    expect(y2024.specimens).toEqual([])

    for (const layout of [y2025, y2026, y2024]) expect(layout.years).toEqual([2025, 2026])
  })

  it('maps every rating to a style and summarizes the drawn decisions', () => {
    expect(
      (['MUCH_BETTER', 'SLIGHTLY_BETTER', 'AS_EXPECTED', 'SLIGHTLY_WORSE', 'MUCH_WORSE', 'TOO_EARLY_TO_TELL'] as const).map(outcomeStyle)
    ).toEqual(['better', 'better', 'expected', 'worse', 'worse', 'early'])
    const records = [rec(1, 'CAREER', '2025-05-16T12:00:00.000Z'), rec(2, 'FINANCE', '2026-08-16T00:00:00.000Z')]
    expect(layoutStrata(records, { year: null, now: NOW }).summary).toBe('2 decisions from Q2 2025 to Q4 2026')
    expect(layoutStrata(records, { year: 2026, now: NOW }).summary).toBe('1 decision from Jan 2026 to Nov 2026')
  })

  it('deposits outcomes above a decision even after a busy week pushes it up, in date order', () => {
    const at = '2026-02-14T12:00:00.000Z'
    const records = [1, 2, 3].map((n) => rec(n, 'CAREER', at))
    records.push(rec(4, 'CAREER', at, [['2026-03-01T12:00:00.000Z', 'AS_EXPECTED'], ['2026-03-02T12:00:00.000Z', 'MUCH_BETTER']]))
    const layout = layoutStrata(records, { year: null, now: NOW })
    const pushed = specimen(layout, 'd4')
    const [first, second] = layout.outcomes.filter((outcome) => outcome.decisionId === 'd4')
    expect(first.y).toBeLessThanOrEqual(pushed.y - 14)
    expect(second.y).toBeLessThan(first.y)
    const core = layout.cores.find((line) => line.decisionId === 'd4')!
    expect(core.y2).toBeLessThan(core.y1)
  })

  it('extends the bands to a decision dated after now instead of failing', () => {
    const records = [rec(1, 'CAREER', '2026-05-16T12:00:00.000Z'), rec(2, 'FINANCE', '2027-01-02T00:00:00.000Z')]
    const layout = layoutStrata(records, { year: null, now: NOW })
    expect(layout.bands.at(-1)!.label).toBe('Q1 2027')
    expect(specimen(layout, 'd2').y).toBeGreaterThanOrEqual(STRATA_TOP + 6)
    const december = layoutStrata([rec(3, 'HEALTH', '2026-12-20T00:00:00.000Z')], { year: 2026, now: NOW })
    expect(december.bands).toHaveLength(12)
  })
})
