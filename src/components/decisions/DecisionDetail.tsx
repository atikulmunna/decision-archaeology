'use client'

import { useState } from 'react'
import type { DecisionRecord, OutcomeUpdate, CorrectionRequest } from '@prisma/client'
import {
  CORRECTION_FIELDS,
  getCorrectionFieldLabel,
  getLatestApprovedCorrection,
  type CorrectionField,
} from '@/lib/corrections'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AddOutcomeForm } from './AddOutcomeForm'
import { AttachmentManager } from './AttachmentManager'
import { OutcomeHistory } from './OutcomeHistory'
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

const DOMAIN_COLORS: Record<string, string> = {
  CAREER: 'bg-violet-100 text-violet-700',
  FINANCE: 'bg-emerald-100 text-emerald-700',
  HEALTH: 'bg-rose-100 text-rose-700',
  RELATIONSHIPS: 'bg-pink-100 text-pink-700',
  CREATIVE: 'bg-amber-100 text-amber-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

const CORRECTION_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-gray-200 text-gray-600',
}

export function DecisionDetail({
  decision,
  collaboration,
}: {
  decision: Decision
  collaboration: CollaborationData
}) {
  const [notes, setNotes] = useState(decision.supplementaryNotes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
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

  async function saveNotes() {
    setSavingNotes(true)
    try {
      await fetch(`/api/decisions/${decision.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplementaryNotes: notes }),
      })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } finally {
      setSavingNotes(false)
    }
  }

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
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {decision.domainTag && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DOMAIN_COLORS[decision.domainTag] ?? 'bg-gray-100 text-gray-600'}`}>
              {decision.domainTag.charAt(0) + decision.domainTag.slice(1).toLowerCase()}
            </span>
          )}
          {decision.customTags.map((t) => (
            <span key={t} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-600">#{t}</span>
          ))}
          {decision.confidenceLevel && (
            <span className="ml-auto text-sm text-gray-400">
              Confidence: <span className="font-semibold text-gray-700">{decision.confidenceLevel}/10</span>
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{decision.title}</h1>
        <p className="mt-1 text-sm text-gray-400">Recorded {createdAt}</p>
        {lockedAt && (
          <p className="mt-0.5 text-xs text-gray-400">🔒 Locked {lockedAt}</p>
        )}
      </div>

      {/* Lock status banner */}
      {decision.isLocked ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
          <span>🔒</span>
          <span>Core fields are <strong>permanently locked</strong>. Supplementary notes can still be edited.</span>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <span>⏳</span>
          <span>Fields are <strong>not yet locked</strong> — editing is still possible.</span>
        </div>
      )}

      {/* Locked core fields */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Core Fields {decision.isLocked && '🔒'}
        </h2>
        <div className="flex flex-col gap-4">
          {LOCKED_FIELDS.map(({ key, label }) => {
            const value = decision[key]
            if (!value) return null
            const approvedCorrection = approvedCorrections[key]
            return (
              <div key={key} className={`rounded-xl p-4 ${decision.isLocked ? 'border border-gray-200 bg-gray-50' : 'border border-white bg-white shadow-sm'}`}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  {decision.isLocked && <span>🔒</span>}
                  {label}
                </p>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{String(value)}</p>
                {approvedCorrection && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Approved typo correction
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
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
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Correction Requests
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Locked fields keep the original wording forever. If you spot a typo, submit a small spelling or punctuation correction and preserve the change in the audit trail.
            </p>
          </div>

          {activeCorrectionField && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-indigo-900">
                    Request correction for {getCorrectionFieldLabel(activeCorrectionField)}
                  </p>
                  <p className="mt-1 text-xs text-indigo-700">
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
                <div className="rounded-lg border border-indigo-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Original text
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">
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

                {correctionError && <p className="text-sm text-red-600">{correctionError}</p>}

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
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {correctionNotice}
            </div>
          )}

          {corrections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
              No correction requests yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {corrections.map((correction) => (
                <div key={correction.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {getCorrectionFieldLabel(correction.fieldName)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CORRECTION_STATUS_STYLES[correction.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {correction.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(correction.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Original
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                        {correction.originalText}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Requested correction
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                        {correction.correctedText}
                      </p>
                    </div>
                  </div>

                  {correction.reason && (
                    <p className="mt-3 text-sm text-gray-600">
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Additional Context</h2>
          <div className="flex flex-col gap-4">
            {OPTIONAL_FIELDS.map(({ key, label }) => {
              const value = decision[key]
              if (!value) return null
              return (
                <div key={key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="mb-1.5 text-xs font-semibold text-gray-500">{label}</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">{String(value)}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Attachments
        </h2>
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

      {/* Supplementary Notes */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Supplementary Notes <span className="text-gray-300">(always editable)</span>
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add context, reflections, or updates that you want to preserve alongside the original record..."
            className="min-h-[120px] border-0 p-0 focus:ring-0 resize-none"
          />
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant={notesSaved ? 'secondary' : 'primary'}
              onClick={saveNotes}
              loading={savingNotes}
              disabled={notes === (decision.supplementaryNotes ?? '')}
            >
              {notesSaved ? '✓ Saved' : 'Save notes'}
            </Button>
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Collaboration
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage who can review this decision and keep the discussion close to the record.
          </p>
        </div>

        <SharePanel decisionId={decision.id} initialShares={collaboration.shares} />

        {collaboration.discussions.length > 0 && (
          <div className="flex flex-col gap-4">
            {collaboration.discussions.map((discussion) => (
              <div key={discussion.shareId} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-gray-600">
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
