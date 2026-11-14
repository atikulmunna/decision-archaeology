import { describe, expect, it } from 'vitest'
import { buildDemoArchive, demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_LETTERS } from '@/lib/demo/letters'
import { demoLetterPeek } from '@/lib/demo/queries'
import { DEMO_NOW } from '@/lib/demo/clock'
import { buildSealPayload, canonicalText, sealVersion } from '@/lib/seal'
import { computeSealHashSync } from '@/lib/seal-node'

const archive = buildDemoArchive()
const lettered = archive.filter((record) => record.letter !== null)

describe('demo letters', () => {
  it('six demo letters: four open, two sealed, Northwind open', () => {
    expect(Object.keys(DEMO_LETTERS)).toHaveLength(6)
    expect(lettered).toHaveLength(6)
    const open = lettered.filter((record) => record.letter!.opensAt.getTime() <= DEMO_NOW.getTime())
    expect(open).toHaveLength(4)
    expect(demoLetterPeek(demoDecisionIdForKey('northwind-offer'), DEMO_NOW).state).toBe('open')
    expect(lettered.filter((record) => demoLetterPeek(record.id, DEMO_NOW).state === 'sealed')).toHaveLength(2)
    expect(demoLetterPeek(demoDecisionIdForKey('half-marathon'), DEMO_NOW)).toEqual({ state: 'none' })
  })

  it('demo letter fingerprints match their text, and every demo seal verifies, v4 for the six', () => {
    // Demo dates count back from the demo's now, so compare each letter's text with its sealed fingerprint directly.
    for (const [key, letter] of Object.entries(DEMO_LETTERS)) {
      const record = archive.find((candidate) => candidate.id === demoDecisionIdForKey(key))!
      expect(computeSealHashSync(canonicalText(letter.body))).toBe(record.letter!.sha256)
      expect(sealVersion(record)).toBe('da-seal-v4')
    }
    for (const record of archive) expect(computeSealHashSync(buildSealPayload(record))).toBe(record.sealHash)
  })

  it('keeps the letters free of em and en dashes and opens each at least a month after sealing', () => {
    const dash = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`)
    for (const [, letter] of Object.entries(DEMO_LETTERS)) {
      expect(letter.body).not.toMatch(dash)
      expect(letter.opensInDays).toBeGreaterThanOrEqual(30)
    }
  })
})
