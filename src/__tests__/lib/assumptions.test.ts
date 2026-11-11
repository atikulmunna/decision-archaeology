import { describe, expect, it } from 'vitest'
import { matchReviews, normalizeAssumption, splitAssumptions, VERDICT_LABELS } from '@/lib/assumptions'

const LF = String.fromCharCode(10)
const CR = String.fromCharCode(13)

describe('splitAssumptions', () => {
  it('splits sentences', () => {
    expect(
      splitAssumptions('Whether the team is as good on a bad week as in interviews. Whether the hours stay reasonable.')
    ).toEqual(['Whether the team is as good on a bad week as in interviews.', 'Whether the hours stay reasonable.'])
    expect(splitAssumptions('Cost. Whether talking actually changes anything.')).toEqual([
      'Cost.',
      'Whether talking actually changes anything.',
    ])
  })

  it('keeps abbreviations and decimals inside one assumption', () => {
    expect(splitAssumptions('Churn, e.g. small clinics, stays under 3.5 percent. Pricing holds?')).toEqual([
      'Churn, e.g. small clinics, stays under 3.5 percent.',
      'Pricing holds?',
    ])
    expect(splitAssumptions('Cost vs. value, i.e. the trade, etc. Matters!')).toEqual([
      'Cost vs. value, i.e. the trade, etc. Matters!',
    ])
  })

  it('keeps bracketed abbreviations, titles and initials inside one assumption', () => {
    expect(splitAssumptions('Whether small clinics (e.g. dental) will pay. Whether we can reach them.')).toEqual([
      'Whether small clinics (e.g. dental) will pay.',
      'Whether we can reach them.',
    ])
    expect(splitAssumptions('Whether Dr. Patel will mentor me. Whether the U.S. launch slips.')).toEqual([
      'Whether Dr. Patel will mentor me.',
      'Whether the U.S. launch slips.',
    ])
    // Initials that end a sentence still end it.
    expect(splitAssumptions('Whether we launch in the U.S. Whether it scales.')).toEqual([
      'Whether we launch in the U.S.',
      'Whether it scales.',
    ])
  })

  it('treats lines as items and strips bullets and numbers', () => {
    expect(splitAssumptions(['- Will they pay?', '* Can we hire', '2) Runway lasts. Really.'].join(CR + LF))).toEqual([
      'Will they pay?',
      'Can we hire',
      'Runway lasts. Really.',
    ])
    expect(splitAssumptions(['• First', '', '3. Third'].join(LF))).toEqual(['First', 'Third'])
  })

  it('returns nothing for blank input', () => {
    expect(splitAssumptions(null)).toEqual([])
    expect(splitAssumptions('   ')).toEqual([])
  })
})

describe('assumption helpers', () => {
  it('normalizes like the seal and trims', () => {
    const decomposed = 'Caf' + 'e' + String.fromCharCode(0x301)
    expect(normalizeAssumption(`  ${decomposed}${CR}${LF}x  `)).toBe(`Caf${String.fromCharCode(0xe9)}${LF}x`)
  })

  it('labels verdicts', () => {
    expect(VERDICT_LABELS).toEqual({ HELD: 'Held up', PARTLY: 'Partly', DIDNT: "Didn't hold up" })
  })

  it('matches reviews to items and keeps orphans', () => {
    const items = ['A one.', 'B two.']
    const reviews = [{ itemText: 'B two.' }, { itemText: 'Gone.' }]
    expect(matchReviews(items, reviews)).toEqual({
      matched: [
        { item: 'A one.', review: null },
        { item: 'B two.', review: reviews[0] },
      ],
      orphans: [reviews[1]],
    })
  })
})
