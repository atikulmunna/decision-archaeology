import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  ENERGY_WORDS,
  MOOD_WORDS,
  formatNoteStamp,
  moodEnergyLabel,
  promotedTitle,
  splitAroundSeal,
  toFieldNoteView,
} from '@/lib/field-notes'

describe('field note helpers', () => {
  it('names moods and energies in words', () => {
    expect(MOOD_WORDS).toEqual(['Low', 'Uneasy', 'Steady', 'Good', 'Great'])
    expect(ENERGY_WORDS).toEqual(['Drained', 'Tired', 'Steady', 'Lively', 'Wired'])
    expect(moodEnergyLabel(2, 2)).toBe('Uneasy · Tired')
    expect(moodEnergyLabel(2, null)).toBe('Uneasy')
    expect(moodEnergyLabel(null, 4)).toBe('Lively')
    expect(moodEnergyLabel(null, null)).toBeNull()
  })

  it('titles a promoted note from its first non-blank line, cut to 120 characters', () => {
    expect(promotedTitle('\n  \nFirst real line\nsecond')).toBe('First real line')
    expect(promotedTitle('  padded line  ')).toBe('padded line')
    const long = 'x'.repeat(200)
    expect(promotedTitle(long)).toBe('x'.repeat(120))
  })

  it('puts a note written at the seal instant before it, and sorts both sides oldest first', () => {
    const seal = new Date('2026-03-01T12:00:00.000Z')
    const at = (offset: number, id: string) => ({ id, createdAt: new Date(seal.getTime() + offset) })
    const { before, after } = splitAroundSeal([at(1, 'later'), at(0, 'exact'), at(-1, 'earlier'), at(5000, 'latest')], seal)
    expect(before.map((note) => note.id)).toEqual(['earlier', 'exact'])
    expect(after.map((note) => note.id)).toEqual(['later', 'latest'])
  })

  it('links a note on an unfinished draft to the draft editor, since the draft has no page yet', () => {
    const decisionHref = vi.fn((id: string) => `/decisions/${id}`)
    const view = toFieldNoteView(
      { id: 'n1', body: 'x', mood: null, energy: null, promoted: true, createdAt: new Date(), decision: { id: 'dr1', catalogNumber: null, title: 'Move?', isDraft: true } },
      decisionHref
    )
    expect(view.decision).toEqual({ id: 'dr1', label: 'a draft', title: 'Move?', href: '/decisions/new?draftId=dr1' })
    expect(decisionHref).not.toHaveBeenCalled()
  })

  it('says note times are in UTC', () => {
    expect(formatNoteStamp(new Date('2025-09-05T08:30:00.000Z'))).toBe('Sep 5, 2025, 08:30 UTC')
  })

  it('keeps notes when their user goes and unlinks them when their decision goes', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../../prisma/migrations/20261113120000_field_notes/migration.sql'), 'utf8')
    expect(sql).toContain('CREATE TABLE "field_notes"')
    expect(sql).toMatch(/FOREIGN KEY \("userId"\) REFERENCES "users"\("id"\) ON DELETE CASCADE/)
    expect(sql).toMatch(/FOREIGN KEY \("decisionId"\) REFERENCES "decision_records"\("id"\) ON DELETE SET NULL/)
  })
})
