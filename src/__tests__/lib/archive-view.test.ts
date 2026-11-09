import { describe, expect, it } from 'vitest'
import { archiveEmptyState } from '@/lib/archive-view'

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
