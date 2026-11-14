/**
 * A letter to future you: written at sealing, hidden even from its author until its day, and
 * sealed by fingerprint. Pure rules, safe on the client.
 */
import { z } from 'zod'
import { canonicalText, computeSealHash } from '@/lib/seal'
import { addUtcDays, addUtcMonths, addUtcYears, isoDay, parseIsoDay, startOfUtcDay } from '@/lib/utc-days'

export const LETTER_MAX = 5000
export const LETTER_MIN_DAYS = 30
export const LETTER_MAX_YEARS = 10

const TOO_LONG = 'Keep the letter under 5000 characters.'
const TOO_SOON = 'Pick an opening day at least a month away.'
const TOO_FAR = 'Pick an opening day within ten years.'

export const LetterInputSchema = z.object({ body: z.string(), opensOn: z.iso.date() })
export type LetterInput = z.infer<typeof LetterInputSchema>

/** The earliest and latest opening days for a letter sealed on `sealedOn`. */
export function letterDayRange(sealedOn: Date): { min: Date; max: Date } {
  const day = startOfUtcDay(sealedOn)
  return { min: addUtcDays(day, LETTER_MIN_DAYS), max: addUtcYears(day, LETTER_MAX_YEARS) }
}

/** The predicted day when it is far enough away (and not too far), otherwise six months after today. */
export function defaultOpensOn(predicted: Date | string | null | undefined, today: Date): string {
  const { min, max } = letterDayRange(today)
  if (predicted) {
    const day = startOfUtcDay(new Date(predicted))
    if (!Number.isNaN(day.getTime()) && day >= min && day <= max) return isoDay(day)
  }
  return isoDay(addUtcMonths(startOfUtcDay(today), 6))
}

/** Checks a letter for sealing on `sealedOn`. A blank body means no letter, never an error. */
export function checkLetter(
  input: LetterInput | null | undefined,
  sealedOn: Date
): { ok: true; letter: { body: string; opensAt: Date } | null } | { ok: false; error: string } {
  const body = input?.body.trim() ?? ''
  if (!input || !body) return { ok: true, letter: null }
  if (body.length > LETTER_MAX) return { ok: false, error: TOO_LONG }
  const opensAt = parseIsoDay(input.opensOn)
  const { min, max } = letterDayRange(sealedOn)
  if (!opensAt || opensAt < min) return { ok: false, error: TOO_SOON }
  if (opensAt > max) return { ok: false, error: TOO_FAR }
  return { ok: true, letter: { body, opensAt } }
}

/** The letter's fingerprint as sealed: SHA-256 of its canonical text, lowercase hex. */
export function letterFingerprint(body: string): Promise<string> {
  return computeSealHash(canonicalText(body))
}
