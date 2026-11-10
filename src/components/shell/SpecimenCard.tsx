import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CatalogNumber } from '@/components/ui/CatalogNumber'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'
import { SPECIMEN_EXCERPT, SPECIMEN_KEY, SPECIMEN_SENTENCE } from '@/lib/demo/seed'
import { OUTCOME_LABELS } from '@/lib/outcomes'

function formatDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`
}

/** A real sealed decision from the demo archive, shown on the landing and auth pages. */
export function SpecimenCard({ href }: { href?: string }) {
  const specimen = getDemoDecision(demoDecisionIdForKey(SPECIMEN_KEY))
  if (!specimen) return null

  const [before, after] = SPECIMEN_SENTENCE.split(SPECIMEN_EXCERPT)
  const latest = specimen.outcomes.at(-1)?.outcomeRating
  const domain = specimen.domainTag ? specimen.domainTag.charAt(0) + specimen.domainTag.slice(1).toLowerCase() : null

  const card = (
    <Card as="article" className="p-5">
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <CatalogNumber value={specimen.catalogNumber} />
          {domain && <Badge tone="ink">{domain}</Badge>}
        </div>
        <span className="font-mono text-[11px] text-muted">{formatDay(specimen.createdAt)}</span>
      </div>
      <h2 className="mt-4 break-words font-display text-[26px] leading-[1.1] text-ink">{specimen.title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        {before}
        <mark className="bg-highlight px-0.5 text-ink">{SPECIMEN_EXCERPT}</mark>
        {after}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {specimen.confidenceLevel && <Badge>{specimen.confidenceLevel * 10}% confident</Badge>}
        {latest && <Badge tone="outline">Outcome: {OUTCOME_LABELS[latest].toLowerCase()}</Badge>}
        <Badge tone="signal">Sealed</Badge>
      </div>
    </Card>
  )

  if (!href) return card

  return (
    <Link
      href={href}
      className="block rounded-sm transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {card}
    </Link>
  )
}
