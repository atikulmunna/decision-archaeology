import type { OutcomeUpdate } from '@prisma/client'
import { OUTCOME_COLORS, OUTCOME_LABELS } from '@/lib/decisions'

type Props = {
  outcomes: OutcomeUpdate[]
  emptyMessage: string
  title?: string
  description?: string
}

export function OutcomeHistory({ outcomes, emptyMessage, title, description }: Props) {
  return (
    <section>
      {(title || description) && (
        <div className="mb-3">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              {title} ({outcomes.length})
            </h2>
          )}
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
      )}

      {outcomes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {outcomes.map((outcome, index) => (
            <div key={outcome.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    Update {index + 1}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_COLORS[outcome.outcomeRating]}`}>
                    {OUTCOME_LABELS[outcome.outcomeRating]}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(outcome.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-800">{outcome.whatHappened}</p>
              {outcome.lessonsLearned && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="mb-1 text-xs font-semibold text-gray-400">Lessons learned</p>
                  <p className="text-sm text-gray-700">{outcome.lessonsLearned}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
