import Link from 'next/link'
import type { DecisionRecord, OutcomeUpdate } from '@prisma/client'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { CatalogNumber } from '@/components/ui/CatalogNumber'
import { OUTCOME_LABELS, OUTCOME_TONES } from '@/lib/outcomes'

type Props = {
  decision: DecisionRecord & { outcomes: OutcomeUpdate[] }
  searchQuery?: string
}

function highlightText(text: string, query?: string) {
  if (!query?.trim()) return text

  const tokens = query
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)

  if (tokens.length === 0) return text

  const matcher = new RegExp(`(${tokens.join('|')})`, 'gi')
  const parts = text.split(matcher)

  return parts.map((part, index) => {
    const isMatch = tokens.some((token) => part.toLowerCase() === token.toLowerCase())
    return isMatch ? (
      <mark key={`${part}-${index}`} className="bg-highlight px-0.5 text-ink">
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  })
}

export function DecisionCard({ decision, searchQuery }: Props) {
  const latestOutcome = decision.outcomes[0] ?? null
  const date = new Date(decision.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <Link
      href={`/decisions/${decision.id}`}
      className="group block border-b border-rule py-4 transition-colors duration-150 hover:bg-surface sm:px-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
            <CatalogNumber value={decision.catalogNumber} />
            <span>{date}</span>
            {decision.isLocked && (
              <span className="inline-flex items-center gap-1" title="Core fields sealed">
                <Lock aria-hidden="true" size={11} strokeWidth={1.5} />
                Sealed
              </span>
            )}
          </div>
          <h3 className="mt-1 break-words font-display text-[22px] leading-snug text-ink">
            {highlightText(decision.title, searchQuery)}
          </h3>
        </div>

        <div className="shrink-0">
          {latestOutcome ? (
            <Badge tone={OUTCOME_TONES[latestOutcome.outcomeRating]}>{OUTCOME_LABELS[latestOutcome.outcomeRating]}</Badge>
          ) : (
            <Badge>Pending outcome</Badge>
          )}
        </div>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-ink-2">{highlightText(decision.summary, searchQuery)}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {decision.domainTag && (
          <Badge tone="ink">{decision.domainTag.charAt(0) + decision.domainTag.slice(1).toLowerCase()}</Badge>
        )}
        {decision.customTags.map((tag) => (
          <Badge key={tag} tone="outline">
            #{tag}
          </Badge>
        ))}
        {decision.confidenceLevel && (
          <span className="ml-auto font-mono text-[11px] text-muted">Confidence {decision.confidenceLevel}/10</span>
        )}
      </div>
    </Link>
  )
}
