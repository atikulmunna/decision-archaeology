import type { AssumptionReview, ChallengeOutcome, DecisionRecord, Forecast, OutcomeUpdate } from '@prisma/client'
import { formatCatalogNumber } from '@/lib/catalog'
import type { ReviewLike } from '@/lib/assumptions'

/** Everything the revisit page shows, as plain data a client component can receive. */
export type RevisitData = {
  id: string
  catalogLabel: string
  title: string
  chosenOption: string
  reasoning: string
  predictedOutcome: string | null
  confidenceLevel: number | null
  challenge: { outcome: ChallengeOutcome | null; model: string | null; questions: Array<{ position: number; question: string; answer: string | null }> }
  uncertainties: string | null
  reviews: ReviewLike[]
  canReview: boolean
  forecasts: Forecast[]
  outcomes: OutcomeUpdate[]
  pendingCheckIn: Date | null
  backHref: string
}

type RevisitSource = DecisionRecord & {
  assumptionReviews?: AssumptionReview[]
  forecasts?: Forecast[]
  outcomes: OutcomeUpdate[]
  challengeQuestions?: Array<{ position: number; question: string; answer: string | null }>
}

export function toRevisitData(record: RevisitSource, backHref: string, pendingCheckIn: Date | null): RevisitData {
  return {
    id: record.id,
    catalogLabel: record.catalogNumber === null ? 'Uncatalogued' : formatCatalogNumber(record.catalogNumber),
    title: record.title,
    chosenOption: record.chosenOption,
    reasoning: record.reasoning,
    predictedOutcome: record.predictedOutcome,
    confidenceLevel: record.confidenceLevel,
    challenge: {
      outcome: record.challengeOutcome,
      model: record.challengeModel,
      questions: (record.challengeQuestions ?? []).map((item) => ({ position: item.position, question: item.question, answer: item.answer })),
    },
    uncertainties: record.uncertainties,
    reviews: (record.assumptionReviews ?? []).map((review) => ({ itemText: review.itemText, verdict: review.verdict, note: review.note, updatedAt: review.updatedAt })),
    canReview: record.isLocked || record.isImported,
    forecasts: [...(record.forecasts ?? [])].sort((a, b) => a.position - b.position),
    outcomes: record.outcomes,
    pendingCheckIn,
    backHref,
  }
}
