import { describe, expect, it } from 'vitest'
import { buildSummaryParts, defaultDetailView, parseDetailView } from '@/lib/detail-view'

const t = (iso: string) => new Date(iso)

describe('detail view', () => {
  it('defaults to Now once something happened, and parses the URL value', () => {
    expect(defaultDetailView(false, false)).toBe('then')
    expect(defaultDetailView(true, false)).toBe('now')
    expect(defaultDetailView(false, true)).toBe('now')
    expect(defaultDetailView(false, false, true)).toBe('now')
    expect(defaultDetailView(false, false, false, true)).toBe('now')
    expect(parseDetailView('then', 'now')).toBe('then')
    expect(parseDetailView(['now', 'then'], 'then')).toBe('now')
    expect(parseDetailView('sideways', 'then')).toBe('then')
    expect(parseDetailView(undefined, 'now')).toBe('now')
  })

  it('builds only the summary parts that apply', () => {
    const base = {
      createdAt: t('2025-08-15T12:00:00Z'),
      now: t('2026-11-10T12:00:00Z'),
      uncertainties: 'Team holds. Hours stay sane.',
    }
    expect(
      buildSummaryParts({
        ...base,
        draftStartedAt: t('2025-08-15T08:00:00Z'),
        isLocked: true,
        reviews: [
          { itemText: 'Team holds.', verdict: 'HELD', note: null, updatedAt: base.now },
          { itemText: 'Hours stay sane.', verdict: 'PARTLY', note: null, updatedAt: base.now },
          { itemText: 'An orphan.', verdict: 'HELD', note: null, updatedAt: base.now },
        ],
      })
    ).toEqual(['Deliberated 4 hours', 'Sealed 14 months ago', '1 of 2 assumptions held up'])
    expect(buildSummaryParts({ ...base, draftStartedAt: null, isLocked: false, reviews: [] })).toEqual([])
  })

  it('says how many assumptions are not reviewed yet', () => {
    const now = t('2026-11-10T12:00:00Z')
    expect(
      buildSummaryParts({
        createdAt: t('2025-08-15T12:00:00Z'),
        now,
        uncertainties: 'Team holds. Hours stay sane. Runway lasts.',
        draftStartedAt: null,
        isLocked: false,
        reviews: [{ itemText: 'Team holds.', verdict: 'HELD', note: null, updatedAt: now }],
      })
    ).toEqual(['1 of 3 assumptions held up, 2 not reviewed'])
  })

  it('says sealed today rather than today ago', () => {
    expect(
      buildSummaryParts({
        createdAt: t('2026-11-10T08:00:00Z'),
        now: t('2026-11-10T12:00:00Z'),
        draftStartedAt: null,
        isLocked: true,
        uncertainties: null,
        reviews: [],
      })
    ).toEqual(['Sealed today'])
  })
})
