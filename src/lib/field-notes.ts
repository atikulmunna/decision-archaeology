/**
 * Field Notes: quick, never-locked journal entries that can link to one
 * decision as evidence or become a decision draft. Pure helpers, safe on the client.
 */

export const MOOD_WORDS = ['Low', 'Uneasy', 'Steady', 'Good', 'Great'] as const
export const ENERGY_WORDS = ['Drained', 'Tired', 'Steady', 'Lively', 'Wired'] as const

export const NOTE_MAX = 1000
export const NOTES_PAGE_SIZE = 30
const TITLE_MAX = 120

/** A note as the Notes page and the decision page draw it: plain data, links already resolved. */
export type FieldNoteView = {
  id: string
  body: string
  mood: number | null
  energy: number | null
  promoted: boolean
  createdAt: Date
  decision: { id: string; label: string; title: string; href: string } | null
}

const word = (words: readonly string[], value: number | null) =>
  value !== null && value >= 1 && value <= words.length ? words[value - 1] : null

/** "Uneasy · Tired", or whichever of the two is set, or null. */
export function moodEnergyLabel(mood: number | null, energy: number | null): string | null {
  const parts = [word(MOOD_WORDS, mood), word(ENERGY_WORDS, energy)].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(' · ') : null
}

/** The title a promoted note gives its draft: its first non-blank line, cut to 120 characters. */
export function promotedTitle(body: string): string {
  const line = body.split('\n').map((part) => part.trim()).find((part) => part.length > 0) ?? ''
  return line.slice(0, TITLE_MAX)
}

/** Notes written at or before the seal instant belong to Then, later ones to Now; both oldest first. */
export function splitAroundSeal<T extends { createdAt: Date }>(notes: T[], sealedAt: Date): { before: T[]; after: T[] } {
  const seal = new Date(sealedAt).getTime()
  const ordered = [...notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return {
    before: ordered.filter((note) => new Date(note.createdAt).getTime() <= seal),
    after: ordered.filter((note) => new Date(note.createdAt).getTime() > seal),
  }
}

type NoteRow = {
  id: string
  body: string
  mood: number | null
  energy: number | null
  promoted: boolean
  createdAt: Date
  decision?: { id: string; catalogNumber: number | null; title: string } | null
}

/** A stored note as plain view data. `decisionHref` runs where the note is mapped, never in the client. */
export function toFieldNoteView(note: NoteRow, decisionHref: (id: string) => string): FieldNoteView {
  const decision = note.decision ?? null
  return {
    id: note.id,
    body: note.body,
    mood: note.mood,
    energy: note.energy,
    promoted: note.promoted,
    createdAt: new Date(note.createdAt),
    decision: decision
      ? {
          id: decision.id,
          label: decision.catalogNumber === null ? 'Uncatalogued' : `DA-${String(decision.catalogNumber).padStart(4, '0')}`,
          title: decision.title,
          href: decisionHref(decision.id),
        }
      : null,
  }
}

/** The Notes page's `?before=` cursor: a valid date, or null for the newest page. */
export function parseBefore(value: string | string[] | undefined): Date | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

const stampFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

/** When a note was written, in UTC: "Sep 5, 2025, 08:30". */
export function formatNoteStamp(date: Date): string {
  return stampFormat.format(new Date(date))
}
