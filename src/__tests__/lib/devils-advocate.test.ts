import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import {
  ChallengeSchema,
  buildChallengeMessages,
  cleanQuestion,
  normalizeAnswers,
  resolveChallengeWrite,
  type ChallengeInput,
} from '@/lib/devils-advocate'

const input: ChallengeInput = {
  title: 'Move to the platform team',
  summary: 'Leave payments for the platform team at Halcyon.',
  context: 'The platform team is rebuilding the deploy pipeline and asked me to join.',
  alternatives: 'Stay on payments, or look outside the company.',
  chosenOption: 'Join the platform team for at least a year.',
  reasoning: 'Infrastructure is the gap in my experience, and moving back stays easy.',
  values: 'Learning over comfort.',
  uncertainties: 'Whether the new manager gives me real ownership.',
  predictedOutcome: 'I will be glad I moved within six months.',
  confidenceLevel: 8,
  forecasts: [],
}

describe("Devil's Advocate helpers", () => {
  it('asks about what was written, leaving out empty optional fields', () => {
    const [system, user] = buildChallengeMessages({
      ...input,
      values: null,
      forecasts: [{ statement: 'the launch slips', probability: 70, resolveBy: new Date('2026-06-01T00:00:00Z') }],
    })
    expect(system.role).toBe('system')
    expect(system.content).toMatch(/two or three/i)
    expect(user.content).toContain(input.reasoning)
    expect(user.content).toContain('70% that the launch slips')
    expect(user.content).not.toMatch(/Values:/)
  })

  it('accepts two or three questions and rejects one or four', () => {
    const q = (n: number) => ({ questions: Array.from({ length: n }, (_, i) => ({ question: `Question number ${i + 1}?` })) })
    expect(ChallengeSchema.safeParse(q(2)).success).toBe(true)
    expect(ChallengeSchema.safeParse(q(3)).success).toBe(true)
    expect(ChallengeSchema.safeParse(q(1)).success).toBe(false)
    expect(ChallengeSchema.safeParse(q(4)).success).toBe(false)
  })

  it('cleans dashes and spacing out of AI questions', () => {
    // Built from code points so this file stays dash-free.
    const em = String.fromCharCode(0x2014)
    const en = String.fromCharCode(0x2013)
    expect(cleanQuestion(`  Why rent ${em} not buy?  `)).toBe('Why rent, not buy?')
    expect(cleanQuestion(`Is 3${en}5 years enough?`)).toBe('Is 3 to 5 years enough?')
    expect(cleanQuestion(`Why${em}really?`)).toBe('Why, really?')
  })

  it('turns blank answers into null and trims the rest', () => {
    expect(normalizeAnswers(['  yes ', '   ', null])).toEqual(['yes', null, null])
  })

  it('decides what a draft save or finalize may write', () => {
    const asked = { outcome: 'ASKED' as const, questionCount: 2 }
    const none = { outcome: null, questionCount: 0 }
    expect(resolveChallengeWrite(asked, { answers: ['a', ''], finalizing: true })).toEqual({ ok: true, outcome: 'ASKED', answers: ['a', null] })
    expect(resolveChallengeWrite(asked, { answers: ['a'], finalizing: false })).toEqual({ ok: false, error: 'Answer each question, or leave it blank.' })
    expect(resolveChallengeWrite(none, { answers: ['a'], finalizing: false })).toEqual({ ok: false, error: 'There are no questions to answer.' })
    expect(resolveChallengeWrite(none, { skipped: true, finalizing: true })).toEqual({ ok: true, outcome: 'SKIPPED', answers: null })
    expect(resolveChallengeWrite({ outcome: 'UNAVAILABLE', questionCount: 0 }, { skipped: true, finalizing: true })).toEqual({
      ok: true,
      outcome: 'UNAVAILABLE',
      answers: null,
    })
    expect(resolveChallengeWrite(asked, { skipped: true, finalizing: true })).toEqual({ ok: true, outcome: 'ASKED', answers: null })
    expect(resolveChallengeWrite(none, { skipped: true, finalizing: false })).toEqual({ ok: true, outcome: null, answers: null })
  })

  it('creates the challenge tables with cascading foreign keys', () => {
    const sql = readFileSync(path.resolve(__dirname, '../../../prisma/migrations/20261114120000_devils_advocate/migration.sql'), 'utf8')
    expect(sql).toContain('CREATE TYPE "ChallengeOutcome" AS ENUM (\'ASKED\', \'SKIPPED\', \'UNAVAILABLE\')')
    expect(sql).toContain('CREATE TABLE "challenge_questions"')
    expect(sql).toContain('CREATE TABLE "challenge_attempts"')
    expect(sql).toMatch(/FOREIGN KEY \("decisionId"\) REFERENCES "decision_records"\("id"\) ON DELETE CASCADE/)
    expect(sql).toMatch(/FOREIGN KEY \("userId"\) REFERENCES "users"\("id"\) ON DELETE CASCADE/)
  })
})
