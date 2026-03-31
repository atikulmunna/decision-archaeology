import type { OutcomeRating } from '@prisma/client'

export const OUTCOME_LABELS: Record<OutcomeRating, string> = {
  MUCH_BETTER: 'Much better than expected',
  SLIGHTLY_BETTER: 'Slightly better than expected',
  AS_EXPECTED: 'As expected',
  SLIGHTLY_WORSE: 'Slightly worse than expected',
  MUCH_WORSE: 'Much worse than expected',
  TOO_EARLY_TO_TELL: 'Too early to tell',
}

export const OUTCOME_COLORS: Record<OutcomeRating, string> = {
  MUCH_BETTER: 'bg-emerald-100 text-emerald-700',
  SLIGHTLY_BETTER: 'bg-green-100 text-green-700',
  AS_EXPECTED: 'bg-blue-100 text-blue-700',
  SLIGHTLY_WORSE: 'bg-amber-100 text-amber-700',
  MUCH_WORSE: 'bg-red-100 text-red-700',
  TOO_EARLY_TO_TELL: 'bg-gray-100 text-gray-600',
}
