import Link from 'next/link'
import type { DecisionRecord } from '@prisma/client'
import { Badge } from '@/components/ui/Badge'

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
      className="group block rounded-sm border border-dashed border-rule bg-surface p-4 transition-colors duration-150 hover:border-ink"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge>Draft</Badge>
            <h3 className="truncate font-display text-lg text-ink">{title}</h3>
          </div>
          <p className="line-clamp-2 text-sm text-ink-2">{preview}</p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-muted">
          Updated {formatRelativeTime(new Date(decision.updatedAt))}
        </span>
      </div>
    </Link>
  )
}
