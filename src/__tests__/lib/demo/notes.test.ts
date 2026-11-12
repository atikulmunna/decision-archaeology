import { describe, expect, it } from 'vitest'
import { buildDemoArchive, demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_NOW } from '@/lib/demo/clock'
import { buildDemoNotes, listDemoNotes } from '@/lib/demo/notes'
import { getDemoDecision } from '@/lib/demo/queries'

const notes = buildDemoNotes()
const sealedAt = new Map(buildDemoArchive().map((decision) => [decision.id, decision.createdAt.getTime()]))

describe("Rowan's field notes", () => {
  it('has twenty notes split between free, before sealing and after', () => {
    expect(notes).toHaveLength(20)
    const linked = notes.filter((note) => note.decisionId !== null)
    const before = linked.filter((note) => note.createdAt.getTime() <= sealedAt.get(note.decisionId!)!)
    const after = linked.filter((note) => note.createdAt.getTime() > sealedAt.get(note.decisionId!)!)
    expect(notes.filter((note) => note.decisionId === null)).toHaveLength(8)
    expect(before).toHaveLength(6)
    expect(after).toHaveLength(6)
    expect(notes.filter((note) => note.promoted)).toHaveLength(2)
    expect(notes.filter((note) => note.promoted).every((note) => before.includes(note))).toBe(true)
    expect(notes.every((note) => note.createdAt.getTime() <= DEMO_NOW.getTime())).toBe(true)
    expect(notes.filter((note) => note.mood !== null || note.energy !== null).length).toBeGreaterThanOrEqual(14)
  })

  it('leaves the newest decisions without later notes, so their default view stays Then', () => {
    for (const key of ['one-coffee-a-day', 'generalist-first-hire', 'fernhill-podcast']) {
      const id = demoDecisionIdForKey(key)
      expect(notes.some((note) => note.decisionId === id && note.createdAt.getTime() > sealedAt.get(id)!)).toBe(false)
    }
  })

  it('attaches notes to their decision and pages the journal newest first', () => {
    const northwind = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    expect(northwind.fieldNotes.map((note) => note.body)).toContain(
      'Three weeks in. The team argues about tradeoffs exactly like in the interviews.'
    )
    expect(northwind.fieldNotes.map((note) => note.createdAt.getTime())).toEqual(
      [...northwind.fieldNotes.map((note) => note.createdAt.getTime())].sort((a, b) => a - b)
    )
    const { notes: page, olderCursor } = listDemoNotes({ before: null, decisionHref: (id) => `/demo/decisions/${id}` })
    expect(page).toHaveLength(20)
    expect(olderCursor).toBeNull()
    expect(page[0].createdAt.getTime()).toBeGreaterThan(page[19].createdAt.getTime())
    expect(page.find((note) => note.decision?.label === 'DA-0007')?.decision?.href).toBe('/demo/decisions/demo-0007')
  })
})
