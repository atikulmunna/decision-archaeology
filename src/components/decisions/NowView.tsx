'use client'

import { useState } from 'react'
import type { Forecast, OutcomeUpdate } from '@prisma/client'
import { Badge } from '@/components/ui/Badge'
import { OUTCOME_LABELS, OUTCOME_TONES } from '@/lib/outcomes'
import type { ReviewLike } from '@/lib/assumptions'
import { AddOutcomeForm } from './AddOutcomeForm'
import { AssumptionList } from './AssumptionList'
import { ForecastList } from './ForecastList'
import { AttachmentManager } from './AttachmentManager'
import { OutcomeHistory } from './OutcomeHistory'
import { SupplementaryNotesEditor } from './SupplementaryNotesEditor'
import { SharePanel } from '@/components/sharing/SharePanel'
import { CommentThread } from '@/components/sharing/CommentThread'
import type { CollaborationData, Decision } from './detail-types'

const sectionLabel = 'mb-3 font-mono text-[11px] uppercase tracking-[0.09em] text-muted'

/** Now: what happened since sealing, how each assumption held up, and the owner's working panels. */
export function NowView({
  decision,
  readOnly,
  timeZone,
  collaboration,
  reviews,
  onReviewsChange,
  now,
}: {
  decision: Decision
  readOnly: boolean
  timeZone?: string
  collaboration?: CollaborationData
  reviews: ReviewLike[]
  onReviewsChange: (next: ReviewLike[]) => void
  now: Date
}) {
  const [outcomes, setOutcomes] = useState<OutcomeUpdate[]>(decision.outcomes)
  const [forecasts, setForecasts] = useState<Forecast[]>(decision.forecasts ?? [])
  const latest = outcomes.at(-1)

  return (
    <div className="flex flex-col gap-8">
      {latest && (
        <section>
          <h2 className={sectionLabel}>Latest outcome</h2>
          <div className="rounded-sm border border-rule bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={OUTCOME_TONES[latest.outcomeRating]}>{OUTCOME_LABELS[latest.outcomeRating]}</Badge>
              <span className="font-mono text-[11px] text-muted">
                {new Date(latest.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone })}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{latest.whatHappened}</p>
          </div>
        </section>
      )}

      <AssumptionList
        decisionId={decision.id}
        uncertainties={decision.uncertainties}
        reviews={reviews}
        canEdit={!readOnly}
        canReview={decision.isLocked || decision.isImported}
        onReviewsChange={onReviewsChange}
      />

      <ForecastList
        decisionId={decision.id}
        forecasts={forecasts}
        canEdit={!readOnly}
        canResolve={decision.isLocked || decision.isImported}
        now={now}
        onForecastsChange={setForecasts}
      />

      {!readOnly && (
        <section aria-label="Attachments">
          <AttachmentManager decisionId={decision.id} />
        </section>
      )}

      {/* Outcome Updates */}
      <section>
        <OutcomeHistory
          outcomes={outcomes}
          timeZone={timeZone}
          title="Outcomes"
          emptyMessage="No outcomes logged yet. Come back when you can evaluate how this played out."
        />
        {!readOnly && (
          <div className="mt-3">
            <AddOutcomeForm
              decisionId={decision.id}
              onAdded={(o) => setOutcomes((prev) => [...prev, o])}
            />
          </div>
        )}
      </section>

      {readOnly ? (
        decision.supplementaryNotes && (
          <section>
            <h2 className={sectionLabel}>Supplementary notes</h2>
            <p className="whitespace-pre-wrap break-words rounded-sm border border-rule bg-surface p-4 text-sm leading-relaxed text-ink">
              {decision.supplementaryNotes}
            </p>
          </section>
        )
      ) : (
        <SupplementaryNotesEditor decisionId={decision.id} initialNotes={decision.supplementaryNotes} />
      )}

      {/* Collaboration */}
      {!readOnly && collaboration && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
              Collaboration
            </h2>
            <p className="mt-1 text-sm text-muted">
              Manage who can review this decision and keep the discussion close to the record.
            </p>
          </div>

          <SharePanel decisionId={decision.id} initialShares={collaboration.shares} />

          {collaboration.discussions.length > 0 && (
            <div className="flex flex-col gap-4">
              {collaboration.discussions.map((discussion) => (
                <div key={discussion.shareId} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-ink-2">
                    Discussion with {discussion.collaboratorName}
                  </p>
                  <CommentThread
                    decisionId={decision.id}
                    shareId={discussion.shareId}
                    initialComments={discussion.comments}
                    currentUserId={collaboration.currentUserId}
                    isCollaborator={false}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
