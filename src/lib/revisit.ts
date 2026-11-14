/** When a decision is due for a revisit, and the check-in days on offer. Pure rules. */
import { addUtcMonths, addUtcYears, isoDay, parseIsoDay, startOfUtcDay } from '@/lib/utc-days'

export const CHECK_IN_MAX_YEARS = 2

const BAD_DAY = 'Pick a day in the next two years.'

/** Due when a letter has opened since the last revisit, or the pending check-in has arrived. */
export function isDueForRevisit(
  input: { letterOpensAt: Date | null; lastRevisitAt: Date | null; pendingCheckIn: Date | null },
  now: Date
): boolean {
  const { letterOpensAt, lastRevisitAt, pendingCheckIn } = input
  const letterDue =
    letterOpensAt !== null &&
    letterOpensAt.getTime() <= now.getTime() &&
    (lastRevisitAt === null || lastRevisitAt.getTime() < letterOpensAt.getTime())
  const checkInDue = pendingCheckIn !== null && pendingCheckIn.getTime() <= now.getTime()
  return letterDue || checkInDue
}

/** The quick choices for the next check-in. */
export function checkInChoices(today: Date): Array<{ label: '1 month' | '3 months' | '6 months'; day: string }> {
  const day = startOfUtcDay(today)
  return [
    { label: '1 month', day: isoDay(addUtcMonths(day, 1)) },
    { label: '3 months', day: isoDay(addUtcMonths(day, 3)) },
    { label: '6 months', day: isoDay(addUtcMonths(day, 6)) },
  ]
}

/** A check-in day must be after today and at most two years away. */
export function checkCheckInDay(day: string, today: Date): { ok: true; at: Date } | { ok: false; error: string } {
  const at = parseIsoDay(day)
  const start = startOfUtcDay(today)
  if (!at || at <= start || at > addUtcYears(start, CHECK_IN_MAX_YEARS)) return { ok: false, error: BAD_DAY }
  return { ok: true, at }
}
