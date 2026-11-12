import { matchReviews, splitAssumptions, type ReviewLike } from '@/lib/assumptions'
import { formatDeliberation, formatElapsed } from '@/lib/elapsed'

export type DetailView = 'then' | 'now'

/** A decision opens in Now once something has happened to it, otherwise in Then. */
export function defaultDetailView(hasOutcome: boolean, hasReview: boolean, hasResolvedForecast = false): DetailView {
  return hasOutcome || hasReview || hasResolvedForecast ? 'now' : 'then'
}

export function parseDetailView(value: string | string[] | undefined, fallback: DetailView): DetailView {
  const first = Array.isArray(value) ? value[0] : value
  return first === 'then' || first === 'now' ? first : fallback
}

/** The header's summary line, keeping only the parts that apply. */
export function buildSummaryParts(input: {
  draftStartedAt: Date | null
  createdAt: Date
  isLocked: boolean
  now: Date
  uncertainties: string | null
  reviews: ReviewLike[]
}): string[] {
  const parts: string[] = []
  const createdAt = new Date(input.createdAt)
  if (input.draftStartedAt) parts.push(`Deliberated ${formatDeliberation(new Date(input.draftStartedAt), createdAt)}`)
  if (input.isLocked) {
    const elapsed = formatElapsed(createdAt, new Date(input.now))
    parts.push(elapsed === 'today' ? 'Sealed today' : `Sealed ${elapsed} ago`)
  }
  const { matched } = matchReviews(splitAssumptions(input.uncertainties), input.reviews)
  const reviewed = matched.filter(({ review }) => review !== null)
  if (reviewed.length > 0) {
    const held = reviewed.filter(({ review }) => review!.verdict === 'HELD').length
    // Without the unreviewed count, "1 of 4 held up" reads as three that did not.
    const unreviewed = matched.length - reviewed.length
    parts.push(`${held} of ${matched.length} assumptions held up${unreviewed > 0 ? `, ${unreviewed} not reviewed` : ''}`)
  }
  return parts
}
