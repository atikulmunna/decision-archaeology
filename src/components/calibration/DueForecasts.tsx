import Link from 'next/link'
import type { ForecastSummary } from '@/lib/forecasting'
import type { AppRoutes } from '@/lib/routes'

/** Forecasts past their date and still open, oldest first, each linking to its decision's Now view. */
export function DueForecasts({ dueList, routes }: { dueList: ForecastSummary['dueList']; routes: AppRoutes }) {
  if (dueList.length === 0) return null
  return (
    <section aria-label="Due to resolve" className="min-w-0 rounded-sm border border-rule bg-surface p-5">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">Due to resolve</h2>
      <ul className="mt-2 flex flex-col">
        {dueList.map((due) => (
          <li key={due.forecastId} className="border-b border-rule py-2 last:border-b-0">
            <Link
              href={`${routes.decision(due.decisionId)}?view=now`}
              className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink hover:underline"
            >
              <span className="min-w-0 break-words">{due.sentence}</span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-2">Resolve</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
