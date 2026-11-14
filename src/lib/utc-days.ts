/** Calendar days at midnight UTC, the unit letters and check-ins are scheduled in. Pure. */

const DAY_MS = 24 * 60 * 60 * 1000
const ISO_DAY = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function addUtcDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS)
}

/** Adds calendar months, keeping the day of the month where it exists (Jan 31 plus one month is Feb 28 or 29). */
export function addUtcMonths(day: Date, months: number): Date {
  const year = day.getUTCFullYear()
  const month = day.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(day.getUTCDate(), lastDay)))
}

export function addUtcYears(day: Date, years: number): Date {
  return addUtcMonths(day, years * 12)
}

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** "2027-03-01" as midnight UTC, or null when it is not a real calendar day. */
export function parseIsoDay(value: string): Date | null {
  if (!ISO_DAY.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && isoDay(date) === value ? date : null
}
