import { DomainTag, type OutcomeUpdate } from '@prisma/client'

type OutcomeRating = OutcomeUpdate['outcomeRating']

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

export const OUTCOME_FILTERS = ['pending', 'has', 'positive', 'negative', 'expected', 'too_early'] as const
export type OutcomeFilter = (typeof OUTCOME_FILTERS)[number]

export type DecisionFilters = {
  q?: string
  domain?: DomainTag
  dateFrom?: string
  dateTo?: string
  outcome?: OutcomeFilter
  minConfidence?: number
  maxConfidence?: number
  tag?: string
  page?: number
  limit?: number
}

/** Whether a record whose latest outcome is `latest` passes the archive's outcome filter. */
export function matchesOutcomeFilter(latest: OutcomeRating | undefined, filter: OutcomeFilter | undefined): boolean {
  switch (filter) {
    case 'pending':
      return !latest
    case 'has':
      return Boolean(latest)
    case 'positive':
      return latest === 'MUCH_BETTER' || latest === 'SLIGHTLY_BETTER'
    case 'negative':
      return latest === 'SLIGHTLY_WORSE' || latest === 'MUCH_WORSE'
    case 'expected':
      return latest === 'AS_EXPECTED'
    case 'too_early':
      return latest === 'TOO_EARLY_TO_TELL'
    default:
      return true
  }
}

/** Raw URL params. Next passes a repeated key (`?q=a&q=b`) as an array. */
export type ArchiveSearchParams = Partial<
  Record<'q' | 'domain' | 'outcome' | 'dateFrom' | 'dateTo' | 'minConfidence' | 'tag' | 'page' | 'view' | 'year', string | string[]>
>

const PAGE_SIZE = 20

function isDomainTag(value: string): value is DomainTag {
  return (Object.values(DomainTag) as string[]).includes(value)
}

function isOutcomeFilter(value: string): value is OutcomeFilter {
  return (OUTCOME_FILTERS as readonly string[]).includes(value)
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function validDate(value: string | undefined): string | undefined {
  return value && !Number.isNaN(Date.parse(value)) ? value : undefined
}

/**
 * Turns raw archive search params into filters, dropping anything invalid
 * rather than failing, plus the serialized filters for pagination links.
 */
export function parseArchiveSearchParams(raw: ArchiveSearchParams): {
  filters: DecisionFilters
  pageParams: string
  hasFilters: boolean
} {
  const params = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, firstValue(value)])) as Partial<
    Record<keyof ArchiveSearchParams, string>
  >
  const parsedPage = Number.parseInt(params.page ?? '', 10)
  const parsedConfidence = Number.parseInt(params.minConfidence ?? '', 10)

  const q = params.q?.trim() || undefined
  const domain = params.domain && isDomainTag(params.domain) ? params.domain : undefined
  const outcome = params.outcome && isOutcomeFilter(params.outcome) ? params.outcome : undefined
  const dateFrom = validDate(params.dateFrom)
  const dateTo = validDate(params.dateTo)
  const minConfidence = Number.isNaN(parsedConfidence) ? undefined : Math.max(1, Math.min(10, parsedConfidence))
  const tag = params.tag?.trim() || undefined

  // Insertion order is the serialization order of the pagination links.
  const kept = Object.fromEntries(
    Object.entries({ q, domain, outcome, dateFrom, dateTo, minConfidence, tag }).filter(([, value]) => value !== undefined)
  ) as Omit<DecisionFilters, 'page' | 'limit' | 'maxConfidence'>

  const pageParams = new URLSearchParams(Object.entries(kept).map(([key, value]) => [key, String(value)])).toString()
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage

  return { filters: { ...kept, page, limit: PAGE_SIZE }, pageParams, hasFilters: pageParams !== '' }
}

export type ArchiveViewMode = 'list' | 'strata'

const YEAR_SHAPE = /^[0-9]{4}$/

/** The archive view and, for the strata, the zoomed year. Anything unexpected falls back to the list and all time. */
export function parseStrataParams(raw: ArchiveSearchParams): { view: ArchiveViewMode; year: number | null } {
  const view: ArchiveViewMode = firstValue(raw.view) === 'strata' ? 'strata' : 'list'
  const rawYear = firstValue(raw.year)
  const parsed = rawYear && YEAR_SHAPE.test(rawYear) ? Number(rawYear) : null
  const year = view === 'strata' && parsed !== null && parsed >= 1970 && parsed <= 2999 ? parsed : null
  return { view, year }
}

/** A link to the list or the strata (optionally zoomed to a year) that keeps the current filters. */
export function archiveViewHref(pageParams: string, view: ArchiveViewMode, year?: number | null): string {
  const params = new URLSearchParams(pageParams)
  if (view === 'strata') {
    params.set('view', 'strata')
    if (year) params.set('year', String(year))
  }
  return `?${params.toString()}`
}
