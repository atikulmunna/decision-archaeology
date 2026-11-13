import { describe, expect, it } from 'vitest'
import {
  buildSealPayload,
  computeSealHash,
  isRetroactiveSeal,
  sealFields,
  sealFileName,
  sealVersion,
  shortSealHash,
  toSealRecord,
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

// printf '%s' "<the v2 payload>" | sha256sum, computed outside the code under test.
const V2_HASH = 'cc2f4ed3ef011a1777a03bc1f3b3d9700246abc9c4776414564f260d6ce39de2'
const withForecasts: SealableDecision = {
  ...fixture,
  forecasts: [
    { position: 1, statement: 'Second', probability: 30, resolveBy: new Date('2026-03-01T00:00:00.000Z') },
    { position: 0, statement: 'First', probability: 70, resolveBy: new Date('2026-06-30T00:00:00.000Z') },
  ],
}

describe('forecasts in the seal', () => {
  it('seals forecasts in a v2 payload, in position order', async () => {
    const payload = buildSealPayload(withForecasts)
    expect(payload.startsWith('{' + LF + '  "seal": "da-seal-v2",')).toBe(true)
    expect(
      payload.endsWith(
        [
          '  "forecasts": [',
          '    {',
          '      "statement": "First",',
          '      "probability": 70,',
          '      "resolveBy": "2026-06-30T00:00:00.000Z"',
          '    },',
          '    {',
          '      "statement": "Second",',
          '      "probability": 30,',
          '      "resolveBy": "2026-03-01T00:00:00.000Z"',
          '    }',
          '  ]',
          '}',
        ].join(LF)
      )
    ).toBe(true)
    expect(await computeSealHash(payload)).toBe(V2_HASH)
    expect(computeSealHashSync(payload)).toBe(V2_HASH)
  })

  it('keeps v1 byte for byte without forecasts and ignores resolutions', async () => {
    expect(await computeSealHash(buildSealPayload({ ...fixture, forecasts: [] }))).toBe(FIXTURE_HASH)
    const resolved = {
      ...withForecasts,
      forecasts: withForecasts.forecasts!.map((forecast) => ({ ...forecast, resolution: 'HAPPENED', resolvedAt: new Date() })),
    }
    expect(await computeSealHash(buildSealPayload(resolved))).toBe(V2_HASH)
    expect(sealVersion(fixture)).toBe('da-seal-v1')
    expect(sealVersion(withForecasts)).toBe('da-seal-v2')
  })

  it('changes the v2 hash when a sealed forecast field changes', async () => {
    const [second, first] = withForecasts.forecasts!
    const base = await computeSealHash(buildSealPayload(withForecasts))
    expect(base).toBe(V2_HASH)
    const edits = [
      { ...first, statement: 'First!' },
      { ...first, probability: 75 },
      { ...first, resolveBy: new Date('2026-07-01T00:00:00.000Z') },
    ]
    for (const edit of edits) {
      expect(await computeSealHash(buildSealPayload({ ...withForecasts, forecasts: [second, edit] }))).not.toBe(base)
    }
  })

  it('passes only the sealed forecast fields to the client', () => {
    const record = {
      ...withForecasts,
      sealHash: 'h',
      sealedAt: null,
      isImported: false,
      isLocked: true,
      forecasts: [{ ...withForecasts.forecasts![0], id: 'f1', resolution: 'DIDNT', resolvedAt: new Date() }],
    }
    expect(Object.keys(toSealRecord(record).forecasts![0]).sort()).toEqual(['position', 'probability', 'resolveBy', 'statement'])
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

// Pinned from the first green run; the payload's shape is asserted separately above it.
const V3_HASH = 'e6de7f23c411c046c30ea7aeeeb8a3c0d341d0a975b95a8f7ad2a583fe43d5d0'
const asked: SealableDecision = {
  ...withForecasts,
  challengeOutcome: 'ASKED',
  challengeModel: 'openai/gpt-5-mini',
  challengeQuestions: [
    { position: 1, question: 'Second?', answer: null },
    { position: 0, question: `First?${CR}${LF}`, answer: ' kept ' },
  ],
}

describe('seal v3', () => {
  it('seals the challenge in a v3 payload, in position order, after the forecasts', () => {
    const payload = JSON.parse(buildSealPayload(asked))
    expect(payload.seal).toBe('da-seal-v3')
    expect(Object.keys(payload).slice(-2)).toEqual(['forecasts', 'challenge'])
    expect(payload.challenge).toEqual({
      outcome: 'asked',
      model: 'openai/gpt-5-mini',
      questions: [
        { question: `First?${LF}`, answer: ' kept ' },
        { question: 'Second?', answer: null },
      ],
    })
  })

  it('uses v3 with an empty forecast list and no questions for a skip', () => {
    const payload = JSON.parse(buildSealPayload({ ...fixture, challengeOutcome: 'SKIPPED', challengeModel: null, challengeQuestions: [] }))
    expect(payload.forecasts).toEqual([])
    expect(payload.challenge).toEqual({ outcome: 'skipped', model: null, questions: [] })
  })

  it('pins the v3 hash', async () => {
    expect(await computeSealHash(buildSealPayload(asked))).toBe(V3_HASH)
  })

  it('changes the v3 hash when an answer changes', async () => {
    const edited = { ...asked, challengeQuestions: [{ ...asked.challengeQuestions![1], answer: 'other' }, asked.challengeQuestions![0]] }
    expect(await computeSealHash(buildSealPayload(edited))).not.toBe(await computeSealHash(buildSealPayload(asked)))
  })

  it('keeps v1 and v2 when no challenge outcome is set', () => {
    expect(sealVersion({ ...fixture, challengeOutcome: null })).toBe('da-seal-v1')
    expect(sealVersion({ ...withForecasts, challengeOutcome: null })).toBe('da-seal-v2')
  })

  it('passes only the sealed challenge fields to the client', () => {
    const record = toSealRecord({
      ...asked,
      sealHash: null,
      sealedAt: null,
      isImported: false,
      isLocked: false,
      challengeQuestions: [{ ...asked.challengeQuestions![1], id: 'q1', decisionId: 'd1', createdAt: new Date() } as never],
    })
    expect(record.challengeOutcome).toBe('ASKED')
    expect(record.challengeModel).toBe('openai/gpt-5-mini')
    expect(record.challengeQuestions).toEqual([{ position: 0, question: `First?${CR}${LF}`, answer: ' kept ' }])
  })
})
