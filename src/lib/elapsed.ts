/** Plain-language durations for the decision header. The caller passes `now`, so server and browser agree. */

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`
}

export function formatDeliberation(draftStartedAt: Date, createdAt: Date): string {
  const minutes = Math.floor((createdAt.getTime() - draftStartedAt.getTime()) / MINUTE_MS)
  if (minutes < 1) return 'under a minute'
  if (minutes < 60) return plural(minutes, 'minute')
  if (minutes < 48 * 60) return plural(Math.max(1, Math.round(minutes / 60)), 'hour')
  return plural(Math.floor(minutes / (24 * 60)), 'day')
}

function wholeMonthsBetween(from: Date, now: Date): number {
  const months = (now.getUTCFullYear() - from.getUTCFullYear()) * 12 + (now.getUTCMonth() - from.getUTCMonth())
  return now.getUTCDate() < from.getUTCDate() ? months - 1 : months
}

export function formatElapsed(from: Date, now: Date): string {
  const days = Math.floor((now.getTime() - from.getTime()) / DAY_MS)
  if (days < 1) return 'today'
  if (days < 60) return plural(days, 'day')
  const months = Math.max(1, wholeMonthsBetween(from, now))
  if (months < 24) return plural(months, 'month')
  return plural(Math.floor(months / 12), 'year')
}
