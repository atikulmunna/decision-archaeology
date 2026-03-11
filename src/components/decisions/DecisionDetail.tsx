'use client'

import { useState } from 'react'
import type { DecisionRecord, OutcomeUpdate, CorrectionRequest } from '@prisma/client'
import { OUTCOME_COLORS, OUTCOME_LABELS } from '@/lib/decisions'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AddOutcomeForm } from './AddOutcomeForm'

type Decision = DecisionRecord & {
  outcomes: OutcomeUpdate[]
  corrections: CorrectionRequest[]
}

const LOCKED_FIELDS: { key: keyof DecisionRecord; label: string }[] = [
  { key: 'summary', label: 'Decision Summary' },
  { key: 'context', label: 'Context' },
  { key: 'alternatives', label: 'Alternatives Considered' },
  { key: 'chosenOption', label: 'Chosen Option' },
  { key: 'reasoning', label: 'Reasoning' },
]

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

export function DecisionDetail({ decision }: { decision: Decision }) {
  const [notes, setNotes] = useState(decision.supplementaryNotes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [outcomes, setOutcomes] = useState<OutcomeUpdate[]>(decision.outcomes)

  const createdAt = new Date(decision.createdAt).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const lockedAt = decision.lockedAt
    ? new Date(decision.lockedAt).toLocaleString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

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
            return (
              <div key={key} className={`rounded-xl p-4 ${decision.isLocked ? 'border border-gray-200 bg-gray-50' : 'border border-white bg-white shadow-sm'}`}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  {decision.isLocked && <span>🔒</span>}
                  {label}
                </p>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{String(value)}</p>
              </div>
            )
          })}
        </div>
      </section>

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

      {/* Outcome Updates */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Outcomes ({outcomes.length})
        </h2>
        {outcomes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            No outcomes logged yet. Come back when you can evaluate how this played out.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {outcomes.map((outcome) => (
              <div key={outcome.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${OUTCOME_COLORS[outcome.outcomeRating]}`}>
                    {OUTCOME_LABELS[outcome.outcomeRating]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(outcome.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{outcome.whatHappened}</p>
                {outcome.lessonsLearned && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">Lessons learned</p>
                    <p className="text-sm text-gray-700">{outcome.lessonsLearned}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
    </div>
  )
}
