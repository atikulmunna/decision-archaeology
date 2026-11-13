'use client'

import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { fieldClasses } from '@/components/ui/Input'
import { ENERGY_WORDS, MOOD_WORDS, NOTE_MAX, formatNoteStamp, moodEnergyLabel, type FieldNoteView } from '@/lib/field-notes'
import { draftHref } from '@/lib/routes'
import { ChipGroup, NoteCapture, noteFromResponse } from './NoteCapture'

const mono = 'font-mono text-[11px] uppercase tracking-[0.09em]'
const FAILED = 'Could not save. Try again.'

type ItemProps = {
  note: FieldNoteView
  canEdit: boolean
  decisionOptions: Array<{ id: string; label: string }>
  error: string | undefined
  promoting: boolean
  onPatch: (note: FieldNoteView, patch: Record<string, unknown>, optimistic: FieldNoteView) => void
  onDelete: (note: FieldNoteView) => void
  onPromote: (note: FieldNoteView) => void
}

function NoteItem({ note, canEdit, decisionOptions, error, promoting, onPatch, onDelete, onPromote }: ItemProps) {
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [linking, setLinking] = useState(false)
  const [choice, setChoice] = useState('')
  const [draft, setDraft] = useState({ body: note.body, mood: note.mood, energy: note.energy })
  const chips = moodEnergyLabel(note.mood, note.energy)

  return (
    <li className="flex flex-col gap-2 border-b border-rule py-4 last:border-b-0">
      <p className={`${mono} text-muted`}>{formatNoteStamp(note.createdAt)}</p>

      {editing ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const body = draft.body.trim()
            if (!body) return
            setEditing(false)
            onPatch(note, { body, mood: draft.mood, energy: draft.energy }, { ...note, ...draft, body })
          }}
        >
          <label htmlFor={`${id}-edit`} className="sr-only">
            Edit note
          </label>
          <textarea
            id={`${id}-edit`}
            value={draft.body}
            maxLength={NOTE_MAX}
            rows={3}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            className={`${fieldClasses()} resize-y`}
          />
          <ChipGroup name="Mood" words={MOOD_WORDS} value={draft.mood} onChange={(mood) => setDraft({ ...draft, mood })} />
          <ChipGroup name="Energy" words={ENERGY_WORDS} value={draft.energy} onChange={(energy) => setDraft({ ...draft, energy })} />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Save changes
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{note.body}</p>
      )}

      {(chips || note.decision) && (
        <div className="flex flex-wrap items-center gap-2">
          {chips && <span className={`rounded-sm border border-rule px-1.5 py-0.5 ${mono} text-ink-2`}>{chips}</span>}
          {note.decision && (
            <a href={note.decision.href} className={`rounded-sm border border-ink px-1.5 py-0.5 ${mono} text-ink hover:bg-sunken`}>
              {note.promoted ? `Became ${note.decision.label}` : `Evidence for ${note.decision.label}`}
            </a>
          )}
        </div>
      )}

      {canEdit && !editing && confirming && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-ink">Delete this note?</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => onDelete(note)}>
            Delete
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      )}

      {canEdit && !editing && !confirming && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft({ body: note.body, mood: note.mood, energy: note.energy })
              setEditing(true)
            }}
          >
            Edit
          </Button>
          {note.decision ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onPatch(note, { decisionId: null }, { ...note, decision: null, promoted: false })}
            >
              Unlink
            </Button>
          ) : (
            <>
              {decisionOptions.length > 0 && !linking && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setLinking(true)}>
                  Link
                </Button>
              )}
              <Button type="button" size="sm" variant="ghost" disabled={promoting} onClick={() => onPromote(note)}>
                Turn into a decision
              </Button>
            </>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        </div>
      )}

      {canEdit && linking && !note.decision && (
        // Choosing only selects; the link is made on confirm, so arrow keys on a closed select (which fire
        // a change in some browsers) never link the first decision by accident.
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const option = decisionOptions.find((candidate) => candidate.id === choice)
            if (!option) return
            setLinking(false)
            setChoice('')
            const [label, ...title] = option.label.split(' · ')
            onPatch(note, { decisionId: option.id }, {
              ...note,
              decision: { id: option.id, label, title: title.join(' · '), href: note.decision?.href ?? '' },
            })
          }}
        >
          <label htmlFor={`${id}-link`} className="text-sm font-medium text-ink-2">
            Link to a decision
          </label>
          <select id={`${id}-link`} value={choice} onChange={(event) => setChoice(event.target.value)} className={fieldClasses()}>
            <option value="">Choose a decision</option>
            {decisionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!choice}>
              Link note
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setLinking(false)
                setChoice('')
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </li>
  )
}

/**
 * The journal feed, newest first, with quick capture on top for the owner.
 * Every action shows at once and is put back if the save fails.
 */
export function NotesFeed({
  initialNotes,
  canEdit,
  decisionOptions,
  decisionHrefPrefix,
  olderHref,
}: {
  initialNotes: FieldNoteView[]
  canEdit: boolean
  decisionOptions: Array<{ id: string; label: string }>
  decisionHrefPrefix: string
  olderHref: string | null
}) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // One promote at a time: the ref stops a second click before React re-renders the disabled button.
  const promoting = useRef(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const fail = (noteId: string, message = FAILED) => setErrors((current) => ({ ...current, [noteId]: message }))
  const clear = (noteId: string) =>
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== noteId)))
  const replace = (next: FieldNoteView) => setNotes((current) => current.map((note) => (note.id === next.id ? next : note)))

  async function patch(previous: FieldNoteView, body: Record<string, unknown>, optimistic: FieldNoteView) {
    clear(previous.id)
    replace(optimistic)
    try {
      const response = await fetch(`/api/notes/${previous.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      replace(noteFromResponse(await response.json(), decisionHrefPrefix))
    } catch {
      replace(previous)
      fail(previous.id)
    }
  }

  async function remove(note: FieldNoteView) {
    const snapshot = notes
    clear(note.id)
    setNotes((current) => current.filter((candidate) => candidate.id !== note.id))
    try {
      const response = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    } catch {
      setNotes(snapshot)
      fail(note.id)
    }
  }

  async function promote(note: FieldNoteView) {
    if (promoting.current) return
    promoting.current = true
    setPromotingId(note.id)
    clear(note.id)
    const release = () => {
      promoting.current = false
      setPromotingId(null)
    }
    try {
      const response = await fetch(`/api/notes/${note.id}/promote`, { method: 'POST' })
      const body = (await response.json().catch(() => null)) as { draftId?: string; error?: unknown } | null
      if (!response.ok || !body?.draftId) {
        // Already linked (409) and the free tier limit (403) say what to do; anything else is a retry.
        const known = (response.status === 409 || response.status === 403) && typeof body?.error === 'string'
        fail(note.id, known ? String(body.error) : FAILED)
        release()
        return
      }
      // Stay disabled while the draft editor loads.
      router.push(draftHref(body.draftId))
    } catch {
      fail(note.id)
      release()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <NoteCapture
          decisionOptions={decisionOptions}
          decisionHrefPrefix={decisionHrefPrefix}
          onSaved={(note) => setNotes((current) => [note, ...current])}
        />
      )}
      {notes.length === 0 ? (
        <p className="text-sm text-muted">Nothing noted yet. Jot what you&apos;re noticing; it can become a decision later.</p>
      ) : (
        <ul className="flex flex-col rounded-sm border border-rule bg-surface px-4">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              canEdit={canEdit}
              decisionOptions={decisionOptions}
              error={errors[note.id]}
              promoting={promotingId !== null}
              onPatch={(previous, body, optimistic) => void patch(previous, body, optimistic)}
              onDelete={(target) => void remove(target)}
              onPromote={(target) => void promote(target)}
            />
          ))}
        </ul>
      )}
      {olderHref && (
        <a href={olderHref} className={`self-start ${mono} text-ink-2 hover:text-ink`}>
          Show older
        </a>
      )}
    </div>
  )
}
