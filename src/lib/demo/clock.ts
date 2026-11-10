/**
 * The demo archive's own "today". Every demo date is an offset from it, so the
 * archive, the stored AI report and later time-relative features always agree.
 */
export const DEMO_NOW = new Date('2026-11-10T12:00:00Z')

const DAY_MS = 24 * 60 * 60 * 1000

/** The moment `days` days before `now`, at the same UTC time of day. */
export function daysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS)
}
