/**
 * The demo's tamper test: change one word of a sealed decision in the visitor's
 * browser so verifying it again fails. Never used on real records.
 */

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['strong', 'weak'],
  ['more', 'less'],
  ['better', 'worse'],
  ['high', 'low'],
  ['safe', 'risky'],
  ['easy', 'hard'],
]

const SWAPS = new Map<string, string>(PAIRS.flatMap(([a, b]) => [[a, b], [b, a]] as const))
const WORDS = new RegExp(String.raw`\b(${[...SWAPS.keys()].join('|')})\b`, 'i')
const FALLBACK = 'Not really.'

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase()) return replacement.toUpperCase()
  if (source[0] === source[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1)
  return replacement
}

/** Swaps the earliest listed word for its opposite, or appends a denial. `[start, end)` is the changed span. */
export function tamperReasoning(text: string): { text: string; start: number; end: number } {
  const match = WORDS.exec(text)
  if (!match) {
    const start = text.length + 1
    return { text: `${text} ${FALLBACK}`, start, end: start + FALLBACK.length }
  }
  const word = match[0]
  const replacement = matchCase(word, SWAPS.get(word.toLowerCase())!)
  const start = match.index
  return {
    text: text.slice(0, start) + replacement + text.slice(start + word.length),
    start,
    end: start + replacement.length,
  }
}
