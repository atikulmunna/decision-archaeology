import { describe, expect, it } from 'vitest'
import { archiveEmptyState, matchesOutcomeFilter, parseArchiveSearchParams } from '@/lib/archive-view'

describe('archiveEmptyState', () => {
  it('welcomes a brand new archive', () => {
    expect(archiveEmptyState({ sealedCount: 0, draftCount: 0, hasFilters: false })).toBe('first-run')
  })

  it('points to the draft when nothing is sealed yet and no filters are set', () => {
    expect(archiveEmptyState({ sealedCount: 0, draftCount: 1, hasFilters: false })).toBe('drafts-only')
  })

  it('reports no results only when filters are active', () => {
    expect(archiveEmptyState({ sealedCount: 0, draftCount: 1, hasFilters: true })).toBe('no-results')
    expect(archiveEmptyState({ sealedCount: 5, draftCount: 0, hasFilters: true })).toBe('no-results')
  })

  it('treats an empty page of a non-empty archive as no results', () => {
    expect(archiveEmptyState({ sealedCount: 5, draftCount: 0, hasFilters: false })).toBe('no-results')
  })
})

describe('matchesOutcomeFilter', () => {
  it('matches each outcome filter against the latest rating', () => {
    expect(matchesOutcomeFilter(undefined, 'pending')).toBe(true)
    expect(matchesOutcomeFilter('AS_EXPECTED', 'pending')).toBe(false)
    expect(matchesOutcomeFilter('MUCH_BETTER', 'positive')).toBe(true)
    expect(matchesOutcomeFilter('SLIGHTLY_BETTER', 'positive')).toBe(true)
    expect(matchesOutcomeFilter('SLIGHTLY_WORSE', 'negative')).toBe(true)
    expect(matchesOutcomeFilter('MUCH_WORSE', 'positive')).toBe(false)
    expect(matchesOutcomeFilter('AS_EXPECTED', 'expected')).toBe(true)
    expect(matchesOutcomeFilter('TOO_EARLY_TO_TELL', 'too_early')).toBe(true)
    expect(matchesOutcomeFilter(undefined, 'has')).toBe(false)
    expect(matchesOutcomeFilter('TOO_EARLY_TO_TELL', 'has')).toBe(true)
    expect(matchesOutcomeFilter('AS_EXPECTED', undefined)).toBe(true)
  })
})

describe('parseArchiveSearchParams', () => {
  it('drops invalid search params instead of failing', () => {
    const { filters, hasFilters, pageParams } = parseArchiveSearchParams({
      domain: 'NOPE',
      outcome: 'bogus',
      page: 'abc',
      minConfidence: 'x',
      dateFrom: 'not-a-date',
      q: '   ',
    })
    expect(filters).toEqual({ page: 1, limit: 20 })
    expect(hasFilters).toBe(false)
    expect(pageParams).toBe('')
    expect(parseArchiveSearchParams({ page: '-3', minConfidence: '42' }).filters).toMatchObject({ page: 1, minConfidence: 10 })
    expect(parseArchiveSearchParams({ minConfidence: '0' }).filters).toMatchObject({ minConfidence: 1 })
  })

  it('keeps valid params and serializes them without the page', () => {
    expect(parseArchiveSearchParams({ q: ' equity ', domain: 'FINANCE', page: '2' })).toMatchObject({
      filters: { q: 'equity', domain: 'FINANCE', page: 2, limit: 20 },
      pageParams: 'q=equity&domain=FINANCE',
      hasFilters: true,
    })
    expect(
      parseArchiveSearchParams({ tag: 'sleep', minConfidence: '6', outcome: 'has', dateFrom: '2026-01-01', dateTo: '2026-06-30' })
        .pageParams
    ).toBe('outcome=has&dateFrom=2026-01-01&dateTo=2026-06-30&minConfidence=6&tag=sleep')
  })

  it('takes the first value when a search key repeats', () => {
    const { filters, pageParams } = parseArchiveSearchParams({ q: ['Northwind', 'other'], tag: ['equity', 'x'], page: ['2', '9'] })
    expect(filters).toMatchObject({ q: 'Northwind', tag: 'equity', page: 2 })
    expect(pageParams).toBe('q=Northwind&tag=equity')
  })
})
