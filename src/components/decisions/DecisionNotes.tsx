'use client'

import { useState } from 'react'
import type { FieldNote } from '@prisma/client'
import { NoteCapture } from '@/components/notes/NoteCapture'
import { formatNoteStamp, moodEnergyLabel } from '@/lib/field-notes'

type NoteRow = Pick<FieldNote, 'id' | 'body' | 'mood' | 'energy' | 'promoted' | 'createdAt'>

const sectionLabel = 'mb-3 font-mono text-[11px] uppercase tracking-[0.09em] text-muted'
const mono = 'font-mono text-[11px] uppercase tracking-[0.09em]'

function NoteList({ notes, archival }: { notes: NoteRow[]; archival: boolean }) {
  return (
    <ul className="flex flex-col gap-3 rounded-sm border border-rule bg-surface p-4">
      {notes.map((note) => {
        const chips = moodEnergyLabel(note.mood, note.energy)
        return (
          <li key={note.id} className="flex flex-col gap-1">
            <p className={`${mono} text-muted`}>
              {formatNoteStamp(note.createdAt)}
              {note.promoted && <span className="ml-2 text-ink">Where this started</span>}
            </p>
            <p
              className={`whitespace-pre-wrap break-words leading-relaxed text-ink ${archival ? 'font-display text-[17px]' : 'text-sm'}`}
            >
              {note.body}
            </p>
            {chips && <p className={`${mono} text-ink-2`}>{chips}</p>}
          </li>
        )
      })}
    </ul>
  )
}

/** Then: the linked notes written up to the seal, read-only. Nothing when there are none. */
export function NotesBefore({ notes }: { notes: NoteRow[] }) {
  if (notes.length === 0) return null
  return (
    <section>
      <h2 className={sectionLabel}>Field notes before sealing</h2>
      <NoteList notes={notes} archival />
    </section>
  )
}

/** Now: the linked notes written since sealing, oldest first; the owner can add one about this decision. */
export function NotesSince({ decisionId, notes, canEdit }: { decisionId: string; notes: NoteRow[]; canEdit: boolean }) {
  const [rows, setRows] = useState(notes)
  if (!canEdit && rows.length === 0) return null
  return (
    <section className="flex flex-col gap-3">
      <h2 className={sectionLabel.replace('mb-3 ', '')}>Field notes since</h2>
      {rows.length > 0 && <NoteList notes={rows} archival={false} />}
      {canEdit && (
        <NoteCapture
          label="Add a note about this decision"
          decisionOptions={[]}
          fixedDecisionId={decisionId}
          decisionHrefPrefix="/decisions/"
          onSaved={(note) =>
            setRows((current) => [
              ...current,
              { id: note.id, body: note.body, mood: note.mood, energy: note.energy, promoted: note.promoted, createdAt: note.createdAt },
            ])
          }
        />
      )}
    </section>
  )
}
