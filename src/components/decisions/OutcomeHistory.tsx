import type { OutcomeUpdate } from '@prisma/client'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { OUTCOME_LABELS, OUTCOME_TONES } from '@/lib/outcomes'

type Props = {
  outcomes: OutcomeUpdate[]
  emptyMessage: string
  title?: string
  description?: string
  /** Pins how dates render; defaults to the renderer's zone. */
  timeZone?: string
}

export function OutcomeHistory({ outcomes, emptyMessage, title, description, timeZone }: Props) {
  return (
    <section>
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <Eyebrow>
              {title} ({outcomes.length})
            </Eyebrow>
          )}
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
      )}

      {outcomes.length === 0 ? (
        <div className="rounded-sm border border-dashed border-rule bg-surface p-6 text-center text-sm text-muted">
          {emptyMessage}
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {outcomes.map((outcome, index) => (
            <Card as="li" key={outcome.id} className="p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
                    Update {String(index + 1).padStart(2, '0')}
                  </span>
                  <Badge tone={OUTCOME_TONES[outcome.outcomeRating]}>{OUTCOME_LABELS[outcome.outcomeRating]}</Badge>
                </div>
                <span className="font-mono text-[11px] text-muted">
                  {new Date(outcome.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone,
                  })}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-ink">{outcome.whatHappened}</p>
              {outcome.lessonsLearned && (
                <div className="mt-3 border-t border-rule pt-3">
                  <Eyebrow>Lessons learned</Eyebrow>
                  <p className="mt-1 text-sm text-ink-2">{outcome.lessonsLearned}</p>
                </div>
              )}
            </Card>
          ))}
        </ol>
      )}
    </section>
  )
}
