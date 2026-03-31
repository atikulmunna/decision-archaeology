'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { OUTCOME_LABELS } from '@/lib/outcomes'
import type { OutcomeUpdate } from '@prisma/client'

const RATING_OPTIONS = [
  { value: 'MUCH_BETTER', emoji: '🚀' },
  { value: 'SLIGHTLY_BETTER', emoji: '📈' },
  { value: 'AS_EXPECTED', emoji: '✓' },
  { value: 'SLIGHTLY_WORSE', emoji: '📉' },
  { value: 'MUCH_WORSE', emoji: '💥' },
  { value: 'TOO_EARLY_TO_TELL', emoji: '⏳' },
] as const

type Rating = (typeof RATING_OPTIONS)[number]['value']

interface Props {
  decisionId: string
  onAdded: (outcome: OutcomeUpdate) => void
}

export function AddOutcomeForm({ decisionId, onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [whatHappened, setWhatHappened] = useState('')
  const [rating, setRating] = useState<Rating>('AS_EXPECTED')
  const [lessons, setLessons] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (whatHappened.length < 10) {
      setError('Please describe what happened (at least 10 characters)')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/decisions/${decisionId}/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatHappened,
          outcomeRating: rating,
          lessonsLearned: lessons || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? 'Failed to save outcome')
        return
      }
      const outcome = await res.json()
      onAdded(outcome)
      setWhatHappened('')
      setLessons('')
      setRating('AS_EXPECTED')
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-indigo-300 bg-indigo-50 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition-colors"
      >
        + Log an outcome update
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Log outcome update</h3>

      {/* Rating selector */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-gray-700">How did it go?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RATING_OPTIONS.map(({ value, emoji }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                rating === value
                  ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{emoji}</span>
              <span className="truncate">{OUTCOME_LABELS[value]}</span>
            </button>
          ))}
        </div>
      </div>

      <Textarea
        id="whatHappened"
        label="What actually happened?"
        required
        value={whatHappened}
        onChange={(e) => setWhatHappened(e.target.value)}
        placeholder="Describe what actually happened as a result of this decision..."
        charCount={whatHappened.length}
        minChars={10}
        error={error}
      />

      <div className="mt-4">
        <Textarea
          id="lessons"
          label="Lessons learned (optional)"
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          placeholder="What would you do differently? What did this teach you?"
        />
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving}>
          Save outcome
        </Button>
      </div>
    </div>
  )
}
