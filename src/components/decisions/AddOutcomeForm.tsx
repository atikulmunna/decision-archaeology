'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, Equal, Hourglass, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { OUTCOME_LABELS } from '@/lib/outcomes'
import type { OutcomeUpdate } from '@prisma/client'

const RATING_OPTIONS = [
  { value: 'MUCH_BETTER', Icon: ChevronsUp },
  { value: 'SLIGHTLY_BETTER', Icon: ChevronUp },
  { value: 'AS_EXPECTED', Icon: Equal },
  { value: 'SLIGHTLY_WORSE', Icon: ChevronDown },
  { value: 'MUCH_WORSE', Icon: ChevronsDown },
  { value: 'TOO_EARLY_TO_TELL', Icon: Hourglass },
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-rule py-3 font-mono text-[11px] uppercase tracking-[0.09em] text-ink-2 transition-colors hover:border-ink hover:text-ink"
      >
        <Plus aria-hidden="true" size={14} strokeWidth={1.5} />
        Log an outcome update
      </button>
    )
  }

  return (
    <div className="rounded-sm border border-rule bg-surface p-5">
      <h3 className="mb-4 font-display text-2xl text-ink">Log an outcome update</h3>

      {/* Rating selector */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-ink-2">How did it go?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {RATING_OPTIONS.map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
              className={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm transition-colors duration-150 ${
                rating === value
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule text-ink-2 hover:border-ink hover:bg-sunken'
              }`}
            >
              <Icon aria-hidden="true" size={14} strokeWidth={1.5} className="shrink-0" />
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
