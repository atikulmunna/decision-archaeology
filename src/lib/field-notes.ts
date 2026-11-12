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
