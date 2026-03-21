import Link from 'next/link'
import type { DecisionRecord } from '@prisma/client'

type Props = {
  decision: DecisionRecord
}

function formatRelativeTime(date: Date) {
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function DraftDecisionCard({ decision }: Props) {
  const title = decision.title.trim() || 'Untitled draft'
  const preview =
    decision.summary?.trim() ||
    decision.context?.trim() ||
    decision.reasoning?.trim() ||
    'Resume this draft to continue capturing your reasoning.'

  return (
    <Link
      href={`/decisions/new?draftId=${decision.id}`}
      className="group block rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300 hover:bg-amber-100/70"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Draft
            </span>
            <h3 className="truncate font-semibold text-gray-900 group-hover:text-amber-900">
              {title}
            </h3>
          </div>
          <p className="line-clamp-2 text-sm text-gray-600">{preview}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-amber-700">
          Updated {formatRelativeTime(new Date(decision.updatedAt))}
        </span>
      </div>
    </Link>
  )
}
