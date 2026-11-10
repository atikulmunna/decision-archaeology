import type { OutcomeUpdate } from '@prisma/client'
import { Badge } from '@/components/ui/Badge'
import { Callout, type CalloutTone } from '@/components/ui/Callout'
import { OUTCOME_LABELS, OUTCOME_TONES } from '@/lib/outcomes'

type OutcomeRating = OutcomeUpdate['outcomeRating']

/** Celebrate good news, flag bad news, stay neutral while it is too early. */
export function latestOutcomeTone(rating: OutcomeRating): CalloutTone {
  if (rating === 'TOO_EARLY_TO_TELL') return 'info'
  if (rating === 'SLIGHTLY_WORSE' || rating === 'MUCH_WORSE') return 'warning'
  return 'success'
}

export function LatestOutcomeNotice({ outcome }: { outcome: OutcomeUpdate }) {
  return (
    <Callout tone={latestOutcomeTone(outcome.outcomeRating)} title="Latest update from the owner">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={OUTCOME_TONES[outcome.outcomeRating]}>{OUTCOME_LABELS[outcome.outcomeRating]}</Badge>
          <span className="font-mono text-[11px] text-ink-2">
            {new Date(outcome.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        <p className="whitespace-pre-wrap break-words">{outcome.whatHappened}</p>
      </div>
    </Callout>
  )
}
