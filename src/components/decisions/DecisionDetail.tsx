'use client'

import { useState } from 'react'
import type { DecisionRecord, OutcomeUpdate, CorrectionRequest } from '@prisma/client'
import {
  CORRECTION_FIELDS,
  getCorrectionFieldLabel,
  getLatestApprovedCorrection,
  type CorrectionField,
} from '@/lib/corrections'
import { Lock } from 'lucide-react'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { CatalogNumber } from '@/components/ui/CatalogNumber'
import { PageHeader } from '@/components/ui/PageHeader'
import { Textarea } from '@/components/ui/Textarea'
import { AddOutcomeForm } from './AddOutcomeForm'
import { AttachmentManager } from './AttachmentManager'
import { OutcomeHistory } from './OutcomeHistory'
import { SupplementaryNotesEditor } from './SupplementaryNotesEditor'
import { SharePanel } from '@/components/sharing/SharePanel'
import { CommentThread } from '@/components/sharing/CommentThread'

type Decision = DecisionRecord & {
  outcomes: OutcomeUpdate[]
  corrections: CorrectionRequest[]
}

type CollaboratorShare = {
  id: string
  shareId: string
  collaborator: {
    id: string
    email: string
    displayName: string | null
    avatarUrl: string | null
  }
}

type ShareDiscussion = {
  shareId: string
  collaboratorName: string
  comments: Array<{
    id: string
    content: string
    createdAt: string
    author: { id: string; displayName: string | null; avatarUrl: string | null } | null
  }>
}

type CollaborationData = {
  currentUserId: string
  shares: CollaboratorShare[]
  discussions: ShareDiscussion[]
}

const LOCKED_FIELDS: { key: CorrectionField; label: string }[] = CORRECTION_FIELDS.map((field) => ({
  key: field.key,
  label: field.label,
}))

const OPTIONAL_FIELDS: { key: keyof DecisionRecord; label: string }[] = [
  { key: 'values', label: 'Values at Play' },
  { key: 'uncertainties', label: 'Key Uncertainties' },
  { key: 'predictedOutcome', label: 'Predicted Outcome' },
]

const CORRECTION_STATUS_TONES: Record<string, BadgeTone> = {
  PENDING: 'neutral',
  APPROVED: 'signal',
  REJECTED: 'outline',
}

const sectionLabel = 'mb-3 font-mono text-[11px] uppercase tracking-[0.09em] text-muted'

export function DecisionDetail({
  decision,
  collaboration,
}: {
  decision: Decision
  collaboration: CollaborationData
}) {
  const [outcomes, setOutcomes] = useState<OutcomeUpdate[]>(decision.outcomes)
  const [corrections, setCorrections] = useState<CorrectionRequest[]>(decision.corrections)
  const [activeCorrectionField, setActiveCorrectionField] = useState<CorrectionField | null>(null)
  const [correctedText, setCorrectedText] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')
  const [savingCorrection, setSavingCorrection] = useState(false)
  const [updatingCorrectionId, setUpdatingCorrectionId] = useState<string | null>(null)
  const [correctionError, setCorrectionError] = useState<string | null>(null)
  const [correctionNotice, setCorrectionNotice] = useState<string | null>(null)

  const createdAt = new Date(decision.createdAt).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const lockedAt = decision.lockedAt
    ? new Date(decision.lockedAt).toLocaleString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  const approvedCorrections = Object.fromEntries(
    LOCKED_FIELDS.map(({ key }) => [key, getLatestApprovedCorrection(corrections, key)])
  ) as Record<CorrectionField, CorrectionRequest | null>

  function beginCorrection(field: CorrectionField) {
    const originalValue = String(decision[field] ?? '')
    const approvedValue = approvedCorrections[field]?.correctedText ?? ''
    setActiveCorrectionField(field)
    setCorrectedText(approvedValue || originalValue)
    setCorrectionReason('')
    setCorrectionError(null)
    setCorrectionNotice(null)
  }

  async function submitCorrection() {
    if (!activeCorrectionField) return

    setSavingCorrection(true)
    setCorrectionError(null)
    setCorrectionNotice(null)

    try {
      const response = await fetch(`/api/decisions/${decision.id}/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName: activeCorrectionField,
          correctedText,
          reason: correctionReason,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setCorrectionError(payload.error ?? 'Unable to submit correction request.')
        return
      }

      setCorrections((prev) => [payload as CorrectionRequest, ...prev])
      setCorrectionNotice('Correction request submitted. Review it below and approve when ready.')
      setActiveCorrectionField(null)
      setCorrectedText('')
      setCorrectionReason('')
    } finally {
      setSavingCorrection(false)
    }
  }

  async function updateCorrectionStatus(correctionId: string, status: 'APPROVED' | 'REJECTED') {
    setUpdatingCorrectionId(correctionId)
    setCorrectionError(null)
    setCorrectionNotice(null)

    try {
      const response = await fetch(`/api/decisions/${decision.id}/corrections/${correctionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setCorrectionError(payload.error ?? 'Unable to update correction request.')
        return
      }

      setCorrections((prev) => prev.map((correction) => (
        correction.id === correctionId ? payload as CorrectionRequest : correction
      )))
      setCorrectionNotice(
        status === 'APPROVED'
          ? 'Correction approved. The original text remains preserved in the audit trail.'
          : 'Correction request rejected.'
      )
    } finally {
      setUpdatingCorrectionId(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <PageHeader
          title={decision.title}
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
      </div>

      {decision.isLocked ? (
        <Callout title="Core fields are sealed">Supplementary notes, outcomes and typo corrections can still be added.</Callout>
      ) : (
        <Callout tone="warning" title="Edit window open">The core fields are not sealed yet, so editing is still possible.</Callout>
      )}

      <section>
        <h2 className={`${sectionLabel} flex items-center gap-1.5`}>
          {decision.isLocked && <Lock aria-hidden="true" size={12} strokeWidth={1.5} />}
          Core fields
        </h2>
        <div className="flex flex-col gap-4">
          {LOCKED_FIELDS.map(({ key, label }) => {
            const value = decision[key]
            if (!value) return null
            const approvedCorrection = approvedCorrections[key]
            return (
              <div key={key} className="rounded-sm border border-rule bg-surface p-4">
                <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">{label}</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{String(value)}</p>
                {approvedCorrection && (
                  <div className="mt-3 rounded-sm border border-ink bg-highlight p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-signal-ink">
                      Approved typo correction
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-signal-ink">
                      {approvedCorrection.correctedText}
                    </p>
                  </div>
                )}
                {decision.isLocked && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => beginCorrection(key)}
                    >
                      Request typo correction
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {decision.isLocked && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted">
              Correction Requests
            </h2>
            <p className="mt-1 text-sm text-muted">
              Locked fields keep the original wording forever. If you spot a typo, submit a small spelling or punctuation correction and preserve the change in the audit trail.
            </p>
          </div>

          {activeCorrectionField && (
            <div className="rounded-sm border border-rule bg-sunken p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-signal-ink">
                    Request correction for {getCorrectionFieldLabel(activeCorrectionField)}
                  </p>
                  <p className="mt-1 text-xs text-signal-ink">
                    Keep this to a small typo fix. Larger wording changes should stay in supplementary notes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveCorrectionField(null)
                    setCorrectionError(null)
                  }}
                >
                  Cancel
                </Button>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                <div className="rounded-sm border border-rule bg-surface p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Original text
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-ink">
                    {String(decision[activeCorrectionField] ?? '')}
                  </p>
                </div>

                <Textarea
                  id="correctedText"
                  label="Corrected text"
                  value={correctedText}
                  onChange={(e) => setCorrectedText(e.target.value)}
                  placeholder="Fix only the typo or punctuation issue here..."
                />

                <Textarea
                  id="correctionReason"
                  label="Reason (optional)"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Example: Correcting a company name typo."
                  className="min-h-[80px]"
                />

                {correctionError && <p className="text-sm text-danger">{correctionError}</p>}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={submitCorrection}
                    loading={savingCorrection}
                    disabled={correctedText.trim().length === 0}
                  >
                    Submit correction request
                  </Button>
                </div>
              </div>
            </div>
          )}

          {correctionNotice && (
            <div className="rounded-sm border border-ink bg-highlight px-4 py-3 text-sm text-signal-ink">
              {correctionNotice}
            </div>
          )}

          {corrections.length === 0 ? (
            <div className="rounded-sm border border-dashed border-rule bg-surface p-6 text-center text-sm text-muted">
              No correction requests yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {corrections.map((correction) => (
                <div key={correction.id} className="rounded-sm border border-rule bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {getCorrectionFieldLabel(correction.fieldName)}
                    </p>
                    <Badge tone={CORRECTION_STATUS_TONES[correction.status] ?? 'neutral'}>{correction.status}</Badge>
                    <span className="text-xs text-muted">
                      {new Date(correction.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-sm bg-sunken p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Original
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                        {correction.originalText}
                      </p>
                    </div>
                    <div className="rounded-sm bg-highlight p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-signal-ink">
                        Requested correction
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-signal-ink">
                        {correction.correctedText}
                      </p>
                    </div>
                  </div>

                  {correction.reason && (
                    <p className="mt-3 text-sm text-ink-2">
                      Reason: {correction.reason}
                    </p>
                  )}

                  {correction.status === 'PENDING' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateCorrectionStatus(correction.id, 'APPROVED')}
                        loading={updatingCorrectionId === correction.id}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => updateCorrectionStatus(correction.id, 'REJECTED')}
                        disabled={updatingCorrectionId === correction.id}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Optional fields */}
      {OPTIONAL_FIELDS.some(({ key }) => !!decision[key]) && (
        <section>
          <h2 className={sectionLabel}>Additional Context</h2>
          <div className="flex flex-col gap-4">
            {OPTIONAL_FIELDS.map(({ key, label }) => {
              const value = decision[key]
              if (!value) return null
              return (
                <div key={key} className="rounded-sm border border-rule bg-surface p-4">
                  <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted">{label}</p>
                  <p className="whitespace-pre-wrap text-sm text-ink">{String(value)}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section aria-label="Attachments">
        <AttachmentManager decisionId={decision.id} />
      </section>

      {/* Outcome Updates */}
      <section>
        <OutcomeHistory
          outcomes={outcomes}
          title="Outcomes"
          emptyMessage="No outcomes logged yet. Come back when you can evaluate how this played out."
        />
        <div className="mt-3">
          <AddOutcomeForm
            decisionId={decision.id}
            onAdded={(o) => setOutcomes((prev) => [...prev, o])}
          />
        </div>
      </section>

      <SupplementaryNotesEditor decisionId={decision.id} initialNotes={decision.supplementaryNotes} />

      {/* Collaboration */}
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
    </div>
  )
}
