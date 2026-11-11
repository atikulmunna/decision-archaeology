'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { CatalogNumber } from '@/components/ui/CatalogNumber'
import { PageHeader } from '@/components/ui/PageHeader'
import { SealBadge } from '@/components/seal/SealBadge'
import type { ReviewLike } from '@/lib/assumptions'
import { buildSummaryParts, defaultDetailView, type DetailView } from '@/lib/detail-view'
import { getDecisionLockDeadline } from '@/lib/locks'
import { isRetroactiveSeal } from '@/lib/seal'
import { tamperReasoning } from '@/lib/tamper'
import type { CollaborationData, Decision } from './detail-types'
import { NowView } from './NowView'
import { ThenView } from './ThenView'
import { ViewToggle } from './ViewToggle'

/**
 * The decision detail: a shared header, then a Then / Now toggle. Then is the sealed
 * record; Now is what happened and how each assumption held up. Both views stay
 * mounted (the inactive one is hidden) so work in either survives switching.
 * `readOnly` (the public demo) drops every control that writes; `timeZone` pins how
 * dates render; `now` is the server's clock so the header reads the same everywhere.
 */
export function DecisionDetail({
  decision,
  collaboration,
  readOnly = false,
  timeZone,
  tamperTest = false,
  reviews: initialReviews = [],
  initialView,
  now,
}: {
  decision: Decision
  collaboration?: CollaborationData
  readOnly?: boolean
  timeZone?: string
  /** Demo only: a toggle that changes one word in the browser so the seal visibly fails. */
  tamperTest?: boolean
  reviews?: ReviewLike[]
  initialView?: DetailView
  now: Date
}) {
  const [reviews, setReviews] = useState<ReviewLike[]>(initialReviews)
  const [view, setView] = useState<DetailView>(
    initialView ?? defaultDetailView(decision.outcomes.length > 0, initialReviews.length > 0)
  )
  const [tampered, setTampered] = useState(false)
  const tamper = useMemo(
    () => (tamperTest && tampered ? tamperReasoning(decision.reasoning) : null),
    [tamperTest, tampered, decision.reasoning]
  )
  const sealRecord = useMemo(() => (tamper ? { ...decision, reasoning: tamper.text } : decision), [decision, tamper])

  const zone = timeZone ? { timeZone, timeZoneName: 'short' as const } : {}
  const createdAt = new Date(decision.createdAt).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', ...zone,
  })
  const lockedAt = decision.lockedAt
    ? new Date(decision.lockedAt).toLocaleString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', ...zone,
      })
    : null

  const summary = buildSummaryParts({
    draftStartedAt: decision.draftStartedAt,
    createdAt: decision.createdAt,
    isLocked: decision.isLocked,
    now,
    uncertainties: decision.uncertainties,
    reviews,
  })

  function changeView(next: DetailView) {
    setView(next)
    const url = new URL(window.location.href)
    url.searchParams.set('view', next)
    window.history.replaceState(null, '', url)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader
          title={decision.title}
          actions={
            decision.sealHash && decision.isLocked ? (
              <SealBadge
                hash={decision.sealHash}
                catalogNumber={decision.catalogNumber}
                retroactive={isRetroactiveSeal(decision)}
              />
            ) : decision.sealHash ? (
              <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
                {`Seal final at ${getDecisionLockDeadline(decision).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`}
              </span>
            ) : undefined
          }
          meta={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <CatalogNumber value={decision.catalogNumber} />
              <span>Recorded {createdAt}</span>
              {lockedAt && <span>Sealed {lockedAt}</span>}
              {decision.confidenceLevel && <span>Confidence {decision.confidenceLevel}/10</span>}
            </span>
          }
        />
        {(decision.domainTag || decision.customTags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {decision.domainTag && (
              <Badge tone="ink">{decision.domainTag.charAt(0) + decision.domainTag.slice(1).toLowerCase()}</Badge>
            )}
            {decision.customTags.map((t) => (
              <Badge key={t} tone="outline">
                #{t}
              </Badge>
            ))}
          </div>
        )}
        {summary.length > 0 && (
          <p className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">{summary.join(' · ')}</p>
        )}
      </div>

      <ViewToggle view={view} onChange={changeView} />

      <div role="tabpanel" id="decision-view-then" aria-labelledby="decision-tab-then" hidden={view !== 'then'}>
        <ThenView
          decision={decision}
          readOnly={readOnly}
          timeZone={timeZone}
          sealRecord={sealRecord}
          tamper={tamper}
          onTamperedChange={tamperTest ? setTampered : undefined}
        />
      </div>
      <div role="tabpanel" id="decision-view-now" aria-labelledby="decision-tab-now" hidden={view !== 'now'}>
        <NowView
          decision={decision}
          readOnly={readOnly}
          timeZone={timeZone}
          collaboration={collaboration}
          reviews={reviews}
          onReviewsChange={setReviews}
        />
      </div>
    </div>
  )
}
