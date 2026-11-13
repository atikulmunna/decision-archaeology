import { describe, expect, it, vi } from 'vitest'
import { generateDemoChallengeFile } from '@/lib/demo/challenge-file'
import { DEMO_ASKED_KEYS, DEMO_CHALLENGE_ANSWERS, DEMO_SKIPPED_KEY } from '@/lib/demo/challenges'
import { buildDemoArchive, demoDecisionIdForKey } from '@/lib/demo/archive'
import { buildSealPayload, sealVersion } from '@/lib/seal'
import { computeSealHashSync } from '@/lib/seal-node'
import { ChallengeSchema } from '@/lib/devils-advocate'

describe('demo challenge generator', () => {
  it('asks once per asked key with the real prompt, and stores cleaned questions and the model', async () => {
    const em = String.fromCharCode(0x2014)
    type Opts = { messages: Array<{ content: string }> }
    const generate = vi.fn<(opts: Opts) => Promise<{ data: { questions: Array<{ question: string }> }; model: string }>>(async () => ({
      data: { questions: [{ question: `Why this ${em} really?` }, { question: '  What if it fails?  ' }] },
      model: 'openai/gpt-5-mini',
    }))
    const file = await generateDemoChallengeFile(generate as never, new Date('2026-11-14T00:00:00.000Z'))
    expect(Object.keys(file.challenges).sort()).toEqual([...DEMO_ASKED_KEYS].sort())
    expect(file.challenges['northwind-offer']).toEqual({ model: 'openai/gpt-5-mini', questions: ['Why this, really?', 'What if it fails?'] })
    expect(generate).toHaveBeenCalledTimes(DEMO_ASKED_KEYS.length)
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ costTier: 'medium', timeoutMs: expect.any(Number), schema: ChallengeSchema }))
    expect(generate.mock.calls.some(([opts]) => opts.messages[1].content.includes('Northwind'))).toBe(true)
    expect(file.generatedAt).toBe('2026-11-14T00:00:00.000Z')
  })
})

describe('demo challenges in the archive', () => {
  const archive = buildDemoArchive()
  const challenged = archive.filter((record) => record.challengeOutcome !== null)

  it('gives eight decisions an outcome: seven asked and one skipped', () => {
    expect(challenged).toHaveLength(8)
    expect(challenged.filter((record) => record.challengeOutcome === 'ASKED')).toHaveLength(7)
    expect(challenged.filter((record) => record.challengeOutcome === 'SKIPPED').map((record) => record.id)).toEqual([demoDecisionIdForKey(DEMO_SKIPPED_KEY)])
  })

  it('answers every asked question but one, and covers four domains including DA-0007', () => {
    const asked = challenged.filter((record) => record.challengeOutcome === 'ASKED')
    for (const record of asked) {
      expect(record.challengeQuestions.length).toBeGreaterThanOrEqual(2)
      expect(record.challengeModel).toBeTruthy()
    }
    expect(asked.flatMap((record) => record.challengeQuestions).filter((item) => item.answer === null)).toHaveLength(1)
    expect(new Set(challenged.map((record) => record.domainTag)).size).toBeGreaterThanOrEqual(4)
    expect(challenged.some((record) => record.catalogNumber === 7)).toBe(true)
    for (const key of DEMO_ASKED_KEYS) {
      const record = archive.find((item) => item.id === demoDecisionIdForKey(key))!
      expect(record.challengeQuestions).toHaveLength(DEMO_CHALLENGE_ANSWERS[key].length)
    }
  })

  it('keeps questions and answers free of em and en dashes', () => {
    const text = challenged.flatMap((record) => record.challengeQuestions.flatMap((item) => [item.question, item.answer ?? ''])).join(' ')
    expect(text).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`))
  })

  it('seals the eight as v3 and every demo seal still verifies', () => {
    for (const record of archive) {
      expect(computeSealHashSync(buildSealPayload(record))).toBe(record.sealHash)
    }
    for (const record of challenged) expect(sealVersion(record)).toBe('da-seal-v3')
  })
})
