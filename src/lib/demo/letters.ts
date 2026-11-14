/**
 * Rowan's letters to future Rowan, written at sealing. Four have opened by the demo's fixed
 * "now" and two are still sealed. Fictional, hand-written.
 */
import { canonicalText } from '@/lib/seal'
import { computeSealHashSync } from '@/lib/seal-node'
import { addUtcDays, startOfUtcDay } from '@/lib/utc-days'

export const DEMO_LETTERS: Record<string, { body: string; opensInDays: number }> = {
  'northwind-offer': {
    opensInDays: 365,
    body:
      'Dear future Rowan,\nYou said yes because the team argued well in the interviews. If you are working past fifty hours most weeks, that was the warning you promised to take seriously. If you own the scheduling engine, I was right to go. Either way, write down which.',
  },
  'start-therapy': {
    opensInDays: 183,
    body:
      'Six months in. Be honest about whether the Sunday dread is quieter. If you stopped going, say why in a sentence, and do not dress it up as being busy.',
  },
  'cofound-fernhill': {
    opensInDays: 120,
    body:
      'Four months of runway gone. Count the clinics that actually pay, not the ones that are excited. If it is fewer than three, have the stop conversation with Dana this week, while you still like each other.',
  },
  'weekly-parents-call': {
    opensInDays: 90,
    body:
      'Three months of Sundays. How many did you miss, and why? If the answer is "travel" more than twice, the backup Monday slot is not working either.',
  },
  'fernhill-podcast': {
    opensInDays: 365,
    body:
      'A year of the podcast. Did it bring a single customer, or was it a way to feel productive while the sales calls waited? Both answers are allowed. Pretending is not.',
  },
  'generalist-first-hire': {
    opensInDays: 200,
    body:
      'You hired a generalist instead of a designer. If the product still looks like a spreadsheet, that was the price. If they shipped the billing rewrite alone, it was worth it.',
  },
}

/** The sealed part of a demo letter: its day (counted from the sealing day) and its fingerprint. */
export function demoLetterSeal(key: string, sealedAt: Date): { opensAt: Date; sha256: string } | null {
  const letter = DEMO_LETTERS[key]
  if (!letter) return null
  return {
    opensAt: addUtcDays(startOfUtcDay(sealedAt), letter.opensInDays),
    sha256: computeSealHashSync(canonicalText(letter.body)),
  }
}
