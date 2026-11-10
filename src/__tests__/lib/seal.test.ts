import { describe, expect, it } from 'vitest'
import {
  buildSealPayload,
  computeSealHash,
  isRetroactiveSeal,
  sealFields,
  sealFileName,
  shortSealHash,
  verifySeal,
  type SealableDecision,
} from '@/lib/seal'
import { computeSealHashSync } from '@/lib/seal-node'

const fixture: SealableDecision = {
  catalogNumber: 7,
  createdAt: new Date('2025-08-15T12:00:00.000Z'),
  title: 'Accept?',
  summary: 'S',
  context: 'C',
  alternatives: 'A',
  chosenOption: 'O',
  reasoning: 'R',
  values: null,
  uncertainties: 'U',
  predictedOutcome: 'P',
  predictedTimeframe: new Date('2026-08-15T12:00:00.000Z'),
  confidenceLevel: 7,
  domainTag: 'CAREER',
  customTags: ['b', 'a'],
}

// printf '%s' "<the payload below>" | sha256sum, computed outside the code under test.
const FIXTURE_HASH = 'c70ce20f0bb1215792ab1d3b9e8c9089d42b7f5879cd81344f3d81cfed376417'
const CR = String.fromCharCode(13)
const LF = String.fromCharCode(10)

describe('buildSealPayload', () => {
  it('builds the canonical payload in the fixed key order', () => {
    expect(buildSealPayload(fixture)).toBe(
      [
        '{',
        '  "seal": "da-seal-v1",',
        '  "catalogNumber": 7,',
        '  "finalizedAt": "2025-08-15T12:00:00.000Z",',
        '  "title": "Accept?",',
        '  "summary": "S",',
        '  "context": "C",',
        '  "alternatives": "A",',
        '  "chosenOption": "O",',
        '  "reasoning": "R",',
        '  "values": null,',
        '  "uncertainties": "U",',
        '  "predictedOutcome": "P",',
        '  "predictedTimeframe": "2026-08-15T12:00:00.000Z",',
        '  "confidenceLevel": 7,',
        '  "domainTag": "CAREER",',
        '  "customTags": [',
        '    "b",',
        '    "a"',
        '  ]',
        '}',
      ].join(LF)
    )
  })

  it('treats Windows line endings and decomposed accents like their canonical forms', () => {
    const decomposed = 'Caf' + 'e' + String.fromCharCode(0x301)
    const composed = 'Caf' + String.fromCharCode(0xe9)
    expect(buildSealPayload({ ...fixture, reasoning: `one${CR}${LF}two${CR}three ${decomposed}`, customTags: [decomposed] })).toBe(
      buildSealPayload({ ...fixture, reasoning: `one${LF}two${LF}three ${composed}`, customTags: [composed] })
    )
  })

  it('ignores everything that stays open after lock', () => {
    const open = { ...fixture, supplementaryNotes: 'later', outcomes: [{ whatHappened: 'x' }], id: 'other', userId: 'u' }
    expect(buildSealPayload(open as SealableDecision)).toBe(buildSealPayload(fixture))
  })
})

describe('computeSealHash', () => {
  it('hashes with SHA-256 as lowercase hex', async () => {
    expect(await computeSealHash('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(await computeSealHash(buildSealPayload(fixture))).toBe(FIXTURE_HASH)
  })

  it('agrees with the synchronous Node implementation', async () => {
    const payload = buildSealPayload(fixture)
    expect(computeSealHashSync(payload)).toBe(await computeSealHash(payload))
    expect(computeSealHashSync(payload)).toBe(FIXTURE_HASH)
  })

  it('changes the hash when any sealed field changes', async () => {
    const base = await computeSealHash(buildSealPayload(fixture))
    const edits: Partial<SealableDecision>[] = [
      { catalogNumber: 8 },
      { createdAt: new Date('2025-08-15T12:00:01.000Z') },
      { title: 'Accept!' },
      { summary: 'S2' },
      { context: 'C2' },
      { alternatives: 'A2' },
      { chosenOption: 'O2' },
      { reasoning: 'R2' },
      { values: 'V' },
      { uncertainties: null },
      { predictedOutcome: null },
      { predictedTimeframe: null },
      { confidenceLevel: 6 },
      { domainTag: 'FINANCE' },
      { customTags: ['a', 'b'] },
    ]
    for (const edit of edits) {
      expect(await computeSealHash(buildSealPayload({ ...fixture, ...edit }))).not.toBe(base)
    }
  })
})

describe('seal helpers', () => {
  it('verifies a matching seal and rejects a different one', async () => {
    const { sealHash, sealedAt } = await sealFields(fixture, new Date('2025-08-15T12:00:00.000Z'))
    expect(sealHash).toBe(FIXTURE_HASH)
    expect(sealedAt.toISOString()).toBe('2025-08-15T12:00:00.000Z')
    expect(await verifySeal(fixture, sealHash)).toBe(true)
    expect(await verifySeal({ ...fixture, reasoning: 'changed' }, sealHash)).toBe(false)
  })

  it('calls a seal retroactive only when it was computed after the lock deadline', () => {
    const createdAt = new Date('2025-08-15T12:00:00.000Z')
    expect(isRetroactiveSeal({ createdAt, sealedAt: new Date('2025-08-15T12:05:00.000Z') })).toBe(false)
    expect(isRetroactiveSeal({ createdAt, sealedAt: new Date('2025-08-15T12:05:00.001Z') })).toBe(true)
    expect(isRetroactiveSeal({ createdAt, sealedAt: null })).toBe(false)
  })

  it('formats the short hash and file name', () => {
    expect(shortSealHash('3f9ac21e77d0b1e49c0f51aa8b04')).toBe('3f9a…8b04')
    expect(sealFileName(7)).toBe('DA-0007-seal.json')
    expect(sealFileName(null)).toBe('decision-seal.json')
  })
})
