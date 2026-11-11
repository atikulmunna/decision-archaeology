import { canonicalText } from '@/lib/seal'

/**
 * Assumptions are the sealed "Key uncertainties" split into items, so each one
 * can later be marked as having held up or not. The split is deterministic and
 * the text is sealed, so a record's list never changes.
 */

export type AssumptionVerdict = 'HELD' | 'PARTLY' | 'DIDNT'

export const VERDICT_LABELS: Record<AssumptionVerdict, string> = {
  HELD: 'Held up',
  PARTLY: 'Partly',
  DIDNT: "Didn't hold up",
}

export type ReviewLike = { itemText: string; verdict: AssumptionVerdict; note: string | null; updatedAt: Date }

const ABBREVIATIONS = new Set(['e.g.', 'i.e.', 'etc.', 'vs.'])
const LIST_MARKER = /^(?:[-*•]|\d+[.)])\s+/
const SENTENCE_END = /[.?!]+(?=\s)/g

export function normalizeAssumption(text: string): string {
  return canonicalText(text).trim()
}

function splitSentences(text: string): string[] {
  const parts: string[] = []
  let start = 0
  for (const match of text.matchAll(SENTENCE_END)) {
    const end = match.index + match[0].length
    const lastWord = text.slice(start, end).trim().split(/\s+/).pop()?.toLowerCase() ?? ''
    if (ABBREVIATIONS.has(lastWord)) continue
    parts.push(text.slice(start, end))
    start = end
  }
  parts.push(text.slice(start))
  return parts.map((part) => part.trim()).filter(Boolean)
}

export function splitAssumptions(uncertainties: string | null): string[] {
  if (!uncertainties) return []
  const text = normalizeAssumption(uncertainties)
  if (!text) return []

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length >= 2) {
    return lines.map((line) => line.replace(LIST_MARKER, '').trim()).filter(Boolean)
  }
  return splitSentences(text)
}

/** Pairs each current item with its review; reviews matching no item are orphans. */
export function matchReviews<R extends { itemText: string }>(
  items: string[],
  reviews: R[]
): { matched: Array<{ item: string; review: R | null }>; orphans: R[] } {
  const used = new Set<R>()
  const matched = items.map((item) => {
    const key = normalizeAssumption(item)
    const review = reviews.find((candidate) => !used.has(candidate) && normalizeAssumption(candidate.itemText) === key) ?? null
    if (review) used.add(review)
    return { item, review }
  })
  return { matched, orphans: reviews.filter((review) => !used.has(review)) }
}
