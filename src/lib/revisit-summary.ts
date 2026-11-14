/** Plain data about a decision's letter and revisits, safe to hand to client components. */

export type LetterPeek =
  | { state: 'none' }
  | { state: 'sealed'; opensAt: Date }
  | { state: 'ready'; opensAt: Date }
  | { state: 'open'; opensAt: Date; openedAt: Date; sha256: string; body: string }

export type RevisitSummary = {
  letter: LetterPeek
  due: boolean
  lastRevisitedAt: Date | null
  nextCheckIn: Date | null
  revisitHref: string
}

/** "Mar 1, 2027": letters and check-ins are whole days in UTC. */
export function formatDay(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
