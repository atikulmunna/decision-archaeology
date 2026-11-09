import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { CatalogNumber } from '@/components/ui/CatalogNumber'

/** A sample sealed decision used on the landing and auth pages. */
export function SpecimenCard() {
  return (
    <Card as="article" className="p-5">
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <CatalogNumber value={42} />
          <Badge tone="ink">Career</Badge>
        </div>
        <span className="font-mono text-[11px] text-muted">14.03.2026</span>
      </div>
      <h2 className="mt-4 break-words font-display text-[26px] leading-[1.1] text-ink">
        Accept the senior role at Northwind?
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        The role compounds my options, <mark className="bg-highlight px-0.5 text-ink">but only if the team is as strong as the interviews suggested</mark> and the extra hours do not erase the gains.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge>70% confident</Badge>
        <Badge tone="outline">Outcome: as expected</Badge>
        <Badge tone="signal">Sealed</Badge>
      </div>
    </Card>
  )
}
