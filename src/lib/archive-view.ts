export type ArchiveEmptyState = 'first-run' | 'drafts-only' | 'no-results'

/** Which empty state the archive shows when the current page has no sealed records. */
export function archiveEmptyState({
  sealedCount,
  draftCount,
  hasFilters,
}: {
  sealedCount: number
  draftCount: number
  hasFilters: boolean
}): ArchiveEmptyState {
  if (hasFilters || sealedCount > 0) return 'no-results'
  return draftCount > 0 ? 'drafts-only' : 'first-run'
}
