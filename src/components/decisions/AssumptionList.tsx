'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  matchReviews,
  splitAssumptions,
  VERDICT_LABELS,
  type AssumptionVerdict,
  type ReviewLike,
} from '@/lib/assumptions'

const VERDICTS: AssumptionVerdict[] = ['HELD', 'PARTLY', 'DIDNT']
const NOTE_MAX = 280

const label = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const chipBase =
  'inline-flex max-w-full items-center rounded-sm px-1.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em]'
const CHIP_TONES: Record<AssumptionVerdict, string> = {
  HELD: 'bg-signal text-on-signal',
  PARTLY: 'border border-ink bg-highlight text-ink',
  DIDNT: 'border border-danger text-danger',
}

function VerdictChip({ verdict }: { verdict: AssumptionVerdict | null }) {
  return (
    <span data-chip className={`${chipBase} ${verdict ? CHIP_TONES[verdict] : 'border border-rule text-muted'}`}>
      {verdict ? VERDICT_LABELS[verdict] : 'Not reviewed'}
    </span>
  )
}

type ItemProps = {
  decisionId: string
  item: string
  review: ReviewLike | null
  editable: boolean
  reviews: ReviewLike[]
  onReviewsChange?: (next: ReviewLike[]) => void
}

function AssumptionItem({ decisionId, item, review, editable, reviews, onReviewsChange }: ItemProps) {
  const noteId = useId()
  const [verdict, setVerdict] = useState<AssumptionVerdict | null>(review?.verdict ?? null)
  const [note, setNote] = useState(review?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const others = reviews.filter((candidate) => candidate !== review)

  async function send(method: 'PUT' | 'DELETE', body: Record<string, unknown>, optimistic: ReviewLike[]) {
    const previous = reviews
    setSaving(true)
    setError(null)
    onReviewsChange?.(optimistic)
    try {
      const response = await fetch(`/api/decisions/${decisionId}/assumptions`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch {
      // Put back exactly what was there before the attempt.
      onReviewsChange?.(previous)
      setVerdict(review?.verdict ?? null)
      setNote(review?.note ?? '')
      setError('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function save() {
    if (!verdict) return
    const trimmed = note.trim() || null
    void send('PUT', { itemText: item, verdict, note: trimmed }, [
      ...others,
      { itemText: item, verdict, note: trimmed, updatedAt: new Date() },
    ])
  }

  function clear() {
    setVerdict(null)
    setNote('')
    void send('DELETE', { itemText: item }, others)
  }

  return (
    <li className="flex flex-col gap-2 border-b border-rule py-4 last:border-b-0">
      <p className="text-sm italic leading-relaxed text-ink-2">{item}</p>
      <div className="flex flex-wrap items-center gap-2">
        <VerdictChip verdict={review?.verdict ?? null} />
        {review?.note && <p className="text-sm text-ink">{review.note}</p>}
      </div>

      {editable && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {VERDICTS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={verdict === option ? 'primary' : 'secondary'}
                aria-pressed={verdict === option}
                onClick={() => setVerdict(option)}
              >
                {VERDICT_LABELS[option]}
              </Button>
            ))}
          </div>
          <label htmlFor={noteId} className={`${label} text-muted`}>
            Note
          </label>
          <input
            id={noteId}
            value={note}
            maxLength={NOTE_MAX}
            onChange={(event) => setNote(event.target.value)}
            className="rounded-sm border border-rule bg-surface px-3 py-2 text-sm text-ink"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={save} loading={saving} disabled={!verdict}>
              Save
            </Button>
            {review && (
              <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={saving}>
                Clear
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </li>
  )
}

/**
 * The sealed uncertainties as assumptions, each with how it turned out. Owners can
 * set, change or clear a verdict once the decision is sealed; everyone else reads.
 */
export function AssumptionList({
  decisionId,
  uncertainties,
  reviews,
  canEdit,
  canReview,
  onReviewsChange,
}: {
  decisionId: string
  uncertainties: string | null
  reviews: ReviewLike[]
  canEdit: boolean
  canReview: boolean
  onReviewsChange?: (next: ReviewLike[]) => void
}) {
  const items = splitAssumptions(uncertainties)
  const { matched, orphans } = matchReviews(items, reviews)
  const editable = canEdit && canReview

  return (
    <section aria-label="Assumptions" className="flex flex-col gap-2">
      <h2 className={`${label} text-muted`}>Assumptions</h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted">No uncertainties were recorded.</p>
      ) : (
        <ul className="flex flex-col rounded-sm border border-rule bg-surface px-4">
          {matched.map(({ item, review }) => (
            <AssumptionItem
              key={item}
              decisionId={decisionId}
              item={item}
              review={review}
              editable={editable}
              reviews={reviews}
              onReviewsChange={onReviewsChange}
            />
          ))}
        </ul>
      )}

      {canEdit && !canReview && items.length > 0 && (
        <p className="text-sm text-muted">Review assumptions once the decision is sealed.</p>
      )}

      {orphans.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className={`${label} text-muted`}>From an earlier reading of your uncertainties</p>
          <ul className="flex flex-col rounded-sm border border-rule bg-surface px-4">
            {orphans.map((orphan) => (
              <AssumptionItem
                key={orphan.itemText}
                decisionId={decisionId}
                item={orphan.itemText}
                review={orphan}
                editable={editable}
                reviews={reviews}
                onReviewsChange={onReviewsChange}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
