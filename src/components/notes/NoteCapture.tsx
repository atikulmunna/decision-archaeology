'use client'

import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { fieldClasses } from '@/components/ui/Input'
import { ENERGY_WORDS, MOOD_WORDS, NOTE_MAX, toFieldNoteView, type FieldNoteView } from '@/lib/field-notes'

const chipClass = (pressed: boolean) =>
  `rounded-sm border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.06em] ${
    pressed ? 'border-ink bg-signal text-on-signal' : 'border-rule bg-surface text-ink-2 hover:text-ink'
  }`

/** One choice from a word scale, or none; pressing the chosen word clears it. */
export function ChipGroup({
  name,
  words,
  value,
  onChange,
}: {
  name: string
  words: readonly string[]
  value: number | null
  onChange: (next: number | null) => void
}) {
  return (
    <div role="group" aria-label={name} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-mono text-[11px] uppercase tracking-[0.09em] text-muted" aria-hidden="true">
        {name}
      </span>
      {words.map((word, index) => {
        const level = index + 1
        return (
          <button
            key={word}
            type="button"
            aria-pressed={value === level}
            onClick={() => onChange(value === level ? null : level)}
            className={chipClass(value === level)}
          >
            {word}
          </button>
        )
      })}
    </div>
  )
}

/** Maps a note returned by the API into the view the page draws. */
export function noteFromResponse(json: Record<string, unknown>, decisionHrefPrefix: string): FieldNoteView {
  return toFieldNoteView(
    { ...(json as unknown as Parameters<typeof toFieldNoteView>[0]), createdAt: new Date(String(json.createdAt)) },
    (id) => `${decisionHrefPrefix}${id}`
  )
}

/** Quick capture: a few lines, optional mood and energy, optionally linked. Ctrl+Enter or Cmd+Enter saves. */
export function NoteCapture({
  decisionOptions,
  fixedDecisionId,
  decisionHrefPrefix,
  onSaved,
  label = 'What are you noticing?',
}: {
  decisionOptions: Array<{ id: string; label: string }>
  fixedDecisionId?: string
  decisionHrefPrefix: string
  onSaved: (note: FieldNoteView) => void
  label?: string
}) {
  const id = useId()
  const [body, setBody] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [decisionId, setDecisionId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A ref, not state: a second Ctrl+Enter in the same tick must see the first save as pending.
  const pending = useRef(false)

  async function submit() {
    if (pending.current) return
    if (!body.trim()) {
      setError('Write something first.')
      return
    }
    pending.current = true
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim(), mood, energy, decisionId: fixedDecisionId ?? (decisionId || null) }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      onSaved(noteFromResponse(await response.json(), decisionHrefPrefix))
      setBody('')
      setMood(null)
      setEnergy(null)
      setDecisionId('')
    } catch {
      setError('Could not save. Try again.')
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-sm border border-rule bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <label htmlFor={`${id}-body`} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <textarea
        id={`${id}-body`}
        value={body}
        maxLength={NOTE_MAX}
        rows={3}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            void submit()
          }
        }}
        className={`${fieldClasses()} resize-y`}
      />
      <ChipGroup name="Mood" words={MOOD_WORDS} value={mood} onChange={setMood} />
      <ChipGroup name="Energy" words={ENERGY_WORDS} value={energy} onChange={setEnergy} />
      {!fixedDecisionId && decisionOptions.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-link`} className="text-sm font-medium text-ink-2">
            Link to a decision
          </label>
          <select id={`${id}-link`} value={decisionId} onChange={(event) => setDecisionId(event.target.value)} className={fieldClasses()}>
            <option value="">No decision</option>
            {decisionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" loading={saving} disabled={saving}>
          Save note
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  )
}
