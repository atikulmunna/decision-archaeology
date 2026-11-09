import type { OutcomeRating } from '@prisma/client'
import type { BadgeTone } from '@/components/ui/Badge'

export const OUTCOME_LABELS: Record<OutcomeRating, string> = {
  MUCH_BETTER: 'Much better than expected',
  SLIGHTLY_BETTER: 'Slightly better than expected',
  AS_EXPECTED: 'As expected',
  SLIGHTLY_WORSE: 'Slightly worse than expected',
  MUCH_WORSE: 'Much worse than expected',
  TOO_EARLY_TO_TELL: 'Too early to tell',
}

/** Badge tone per outcome (Field Archive). Better outcomes lean on signal; worse ones on danger. */
export const OUTCOME_TONES: Record<OutcomeRating, BadgeTone> = {
  MUCH_BETTER: 'signal',
  SLIGHTLY_BETTER: 'outline',
  AS_EXPECTED: 'ink',
  SLIGHTLY_WORSE: 'neutral',
  MUCH_WORSE: 'danger',
  TOO_EARLY_TO_TELL: 'neutral',
}
