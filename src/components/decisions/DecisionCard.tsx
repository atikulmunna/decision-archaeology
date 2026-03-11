import Link from 'next/link'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'
import { OUTCOME_COLORS, OUTCOME_LABELS } from '@/lib/decisions'

type Props = {
  decision: DecisionRecord & { outcomes: OutcomeUpdate[] }
}

const DOMAIN_COLORS: Record<string, string> = {
  CAREER: 'bg-violet-100 text-violet-700',
  FINANCE: 'bg-emerald-100 text-emerald-700',
  HEALTH: 'bg-rose-100 text-rose-700',
  RELATIONSHIPS: 'bg-pink-100 text-pink-700',
  CREATIVE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

export function DecisionCard({ decision }: Props) {
  const latestOutcome = decision.outcomes[0] ?? null
  const date = new Date(decision.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/decisions/${decision.id}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {decision.isLocked && (
              <span className="text-gray-400 text-xs" title="Fields locked">🔒</span>
            )}
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
              {decision.title}
            </h3>
          </div>
          <p className="text-xs text-gray-400">{date}</p>
        </div>

        {/* Outcome badge */}
        <div className="shrink-0">
          {latestOutcome ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_COLORS[latestOutcome.outcomeRating]}`}>
              {OUTCOME_LABELS[latestOutcome.outcomeRating]}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
              Pending outcome
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {decision.domainTag && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DOMAIN_COLORS[decision.domainTag] ?? 'bg-gray-100 text-gray-600'}`}>
            {decision.domainTag.charAt(0) + decision.domainTag.slice(1).toLowerCase()}
          </span>
        )}
        {decision.customTags.map((tag) => (
          <span key={tag} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-600">
            #{tag}
          </span>
        ))}
        {decision.confidenceLevel && (
          <span className="ml-auto text-xs text-gray-400">
            Confidence: <span className="font-semibold text-gray-600">{decision.confidenceLevel}/10</span>
          </span>
        )}
      </div>

      {/* Summary preview */}
      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{decision.summary}</p>
    </Link>
  )
}
