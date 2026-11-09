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

export const OUTCOME_COLORS: Record<OutcomeRating, string> = {
  MUCH_BETTER: 'bg-emerald-100 text-emerald-700',
  SLIGHTLY_BETTER: 'bg-green-100 text-green-700',
  AS_EXPECTED: 'bg-blue-100 text-blue-700',
  SLIGHTLY_WORSE: 'bg-amber-100 text-amber-700',
  MUCH_WORSE: 'bg-red-100 text-red-700',
  TOO_EARLY_TO_TELL: 'bg-gray-100 text-gray-600',
}
