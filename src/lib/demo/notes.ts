import type { FieldNote } from '@prisma/client'
import { DEMO_NOW, daysBefore } from './clock'
import { DEMO_USER_ID, buildDemoArchive, demoDecisionIdForKey } from './archive'
import { NOTES_PAGE_SIZE, toFieldNoteView, type FieldNoteView } from '@/lib/field-notes'

/**
 * Rowan's journal: 8 free-standing notes, 6 written before a decision was sealed
 * (2 of them the notes it was promoted from) and 6 written after, as evidence.
 * `daysAgo` counts back from DEMO_NOW; a test pins the split against each seal.
 */
export type DemoNoteSeed = {
  decisionKey?: string
  daysAgo: number
  body: string
  mood?: number
  energy?: number
  promoted?: boolean
}

export const DEMO_NOTE_SEEDS: DemoNoteSeed[] = [
  // Before sealing
  { decisionKey: 'halcyon-platform-team', daysAgo: 547, body: 'The platform team keeps asking me to pair on the deploy pipeline. I like those days more than my payments days.', mood: 4, energy: 4, promoted: true },
  { decisionKey: 'half-marathon', daysAgo: 512, body: 'Ran 10k on Sunday without stopping. Maybe a half is not crazy.', mood: 4, energy: 5 },
  { decisionKey: 'move-across-city', daysAgo: 436, body: 'The commute ate two hours today. That is a quarter of my waking evening.', mood: 2, energy: 2 },
  { decisionKey: 'northwind-offer', daysAgo: 460, body: 'The Northwind recruiter called again. I keep thinking about their scheduling problem.', mood: 3, energy: 4, promoted: true },
  { decisionKey: 'start-therapy', daysAgo: 409, body: 'Third night this week awake at 3am running through work conversations.', mood: 2, energy: 1 },
  { decisionKey: 'cofound-fernhill', daysAgo: 188, body: 'Dana sent a one-pager. I read it twice and then sketched the data model on a napkin.', mood: 4, energy: 5 },
  // After sealing, as evidence
  { decisionKey: 'northwind-offer', daysAgo: 431, body: 'Three weeks in. The team argues about tradeoffs exactly like in the interviews.', mood: 4, energy: 4 },
  { decisionKey: 'move-across-city', daysAgo: 380, body: 'The short commute is great. I have not seen Priya or Tom in a month though.', mood: 3, energy: 3 },
  { decisionKey: 'half-marathon', daysAgo: 445, body: 'Knee still sore on the stairs. Pulling out was the right call.', mood: 2, energy: 2 },
  { decisionKey: 'rewrite-billing', daysAgo: 280, body: 'Found another invoice edge case nobody wrote down. The six weeks were a fantasy.', mood: 2, energy: 3 },
  { decisionKey: 'weekly-parents-call', daysAgo: 120, body: 'Dad told the story about the bakery he almost bought in 1989. I had never heard it.', mood: 5, energy: 3 },
  { decisionKey: 'cofound-fernhill', daysAgo: 60, body: 'Second clinic signed. The runway math still holds.', mood: 4, energy: 4 },
  // Free-standing
  { daysAgo: 500, body: 'Slept badly. Too much coffee after lunch again.', mood: 2, energy: 2 },
  { daysAgo: 470, body: 'Read an essay on deciding with incomplete information. I want to start writing my predictions down.', mood: 4, energy: 3 },
  { daysAgo: 350, body: 'Pottery made my hands too tired to doomscroll. Good trade.', mood: 4, energy: 2 },
  { daysAgo: 300, body: 'Money is fine. Spending is not the problem, attention is.' },
  { daysAgo: 210, body: 'Every team meeting runs ten minutes over. Nobody seems to mind except me.', mood: 2, energy: 3 },
  { daysAgo: 95, body: 'Thinking about a podcast. Probably a bad idea. Writing it down anyway.', mood: 3, energy: 4 },
  { daysAgo: 30, body: 'Customers ask the same three questions. That is a product, not a support burden.' },
  { daysAgo: 5, body: 'The afternoon slump is gone since cutting coffee. Too early to say why.', mood: 4, energy: 3 },
]

/** Rowan's notes as stored rows, in seed order. */
export function buildDemoNotes(now: Date = DEMO_NOW): FieldNote[] {
  return DEMO_NOTE_SEEDS.map((seed, index) => {
    const createdAt = daysBefore(now, seed.daysAgo)
    return {
      id: `demo-note-${String(index + 1).padStart(2, '0')}`,
      userId: DEMO_USER_ID,
      decisionId: seed.decisionKey ? demoDecisionIdForKey(seed.decisionKey) : null,
      body: seed.body,
      mood: seed.mood ?? null,
      energy: seed.energy ?? null,
      promoted: seed.promoted ?? false,
      createdAt,
      updatedAt: createdAt,
    }
  })
}

/** One page of Rowan's journal, newest first, shaped like the owner's. */
export function listDemoNotes(
  options: { before: Date | null; decisionHref: (id: string) => string },
  now: Date = DEMO_NOW
): { notes: FieldNoteView[]; olderCursor: string | null } {
  const decisions = new Map(buildDemoArchive(now).map((decision) => [decision.id, decision]))
  const rows = buildDemoNotes(now)
    .filter((note) => !options.before || note.createdAt.getTime() < options.before.getTime())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, NOTES_PAGE_SIZE)
  const last = rows[rows.length - 1]
  return {
    notes: rows.map((note) => {
      const decision = note.decisionId ? decisions.get(note.decisionId) : undefined
      return toFieldNoteView(
        { ...note, decision: decision ? { id: decision.id, catalogNumber: decision.catalogNumber, title: decision.title } : null },
        options.decisionHref
      )
    }),
    olderCursor: rows.length === NOTES_PAGE_SIZE && last ? last.createdAt.toISOString() : null,
  }
}
