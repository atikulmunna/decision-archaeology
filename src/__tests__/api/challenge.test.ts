// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const db = {
    decisionRecord: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    challengeQuestion: { createMany: vi.fn(), findMany: vi.fn() },
    challengeAttempt: { count: vi.fn(), create: vi.fn() },
  }
  return { userId: 'user_1' as string | null, generate: vi.fn(), order: [] as string[], db }
})

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: mocks.userId }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1', tier: 'PRO' }) }))
vi.mock('@/lib/ai', () => ({ generateStructured: mocks.generate }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    ...mocks.db,
    $transaction: async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: typeof mocks.db) => unknown)(mocks.db) : Promise.all(arg as Promise<unknown>[]),
  },
}))

import { POST as challenge } from '@/app/api/decisions/[id]/challenge/route'
import { ChallengeSchema, cleanQuestion } from '@/lib/devils-advocate'

const { db } = mocks
const em = String.fromCharCode(0x2014)
const ask = (id = 'd1') =>
  challenge(new NextRequest(`http://localhost/api/decisions/${id}/challenge`, { method: 'POST' }), { params: Promise.resolve({ id }) })
const draft = {
  id: 'd1',
  userId: 'db_1',
  isDraft: true,
  title: 'Take the platform role',
  summary: 'Move from payments to platform.',
  context: 'The platform team asked me to join.',
  alternatives: 'Stay on payments.',
  chosenOption: 'Join platform for a year.',
  reasoning: 'Infrastructure is my gap.',
  values: null,
  uncertainties: null,
  predictedOutcome: null,
  confidenceLevel: 7,
  forecasts: [],
  challengeOutcome: null,
  challengeModel: null,
  challengeQuestions: [],
}
const reply = {
  data: { questions: [{ question: `You dismissed payments in a line ${em} why?` }, { question: '  What would make you move back?  ' }] },
  model: 'openai/gpt-5-mini',
}

beforeEach(() => {
  mocks.userId = 'user_1'
  mocks.order.length = 0
  for (const group of Object.values(db)) for (const fn of Object.values(group)) fn.mockReset()
  mocks.generate.mockReset()
  db.decisionRecord.findFirst.mockResolvedValue(draft)
  db.challengeAttempt.count.mockResolvedValue(0)
  db.challengeAttempt.create.mockImplementation(async () => {
    mocks.order.push('attempt')
    return { id: 'a1' }
  })
  mocks.generate.mockImplementation(async () => {
    mocks.order.push('ai')
    return reply
  })
  db.challengeQuestion.createMany.mockResolvedValue({ count: 2 })
  db.decisionRecord.update.mockResolvedValue({})
  db.decisionRecord.updateMany.mockResolvedValue({ count: 1 })
})

describe('POST /api/decisions/[id]/challenge', () => {
  it('refuses a foreign or missing decision (404) and a sealed one (409)', async () => {
    db.decisionRecord.findFirst.mockResolvedValueOnce(null)
    expect((await ask('theirs')).status).toBe(404)
    expect(db.decisionRecord.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'theirs', userId: 'db_1' } }))
    db.decisionRecord.findFirst.mockResolvedValueOnce({ ...draft, isDraft: false })
    const sealed = await ask()
    expect([sealed.status, await sealed.json()]).toEqual([409, { error: 'This decision is already sealed.' }])
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('asks for the reasoning first when a required field is empty', async () => {
    db.decisionRecord.findFirst.mockResolvedValueOnce({ ...draft, reasoning: '   ' })
    const res = await ask()
    expect([res.status, await res.json()]).toEqual([422, { error: 'Finish your reasoning first.' }])
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('returns the stored questions without calling the AI or logging an attempt when already asked', async () => {
    db.decisionRecord.findFirst.mockResolvedValueOnce({
      ...draft,
      challengeOutcome: 'ASKED',
      challengeModel: 'openai/gpt-5-mini',
      challengeQuestions: [
        { id: 'q1', decisionId: 'd1', position: 0, question: 'First?', answer: null, createdAt: new Date() },
        { id: 'q2', decisionId: 'd1', position: 1, question: 'Second?', answer: 'Yes', createdAt: new Date() },
      ],
    })
    const res = await ask()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ questions: [{ position: 0, question: 'First?' }, { position: 1, question: 'Second?' }], model: 'openai/gpt-5-mini' })
    expect(mocks.generate).not.toHaveBeenCalled()
    expect(db.challengeAttempt.create).not.toHaveBeenCalled()
  })

  it('refuses at 20 attempts in 24 hours', async () => {
    db.challengeAttempt.count.mockResolvedValue(20)
    const before = Date.now()
    const res = await ask()
    expect([res.status, await res.json()]).toEqual([
      429,
      { error: "You have used today's 20 challenges. Seal without questions, or try again tomorrow." },
    ])
    const since: Date = db.challengeAttempt.count.mock.calls[0][0].where.createdAt.gte
    expect(db.challengeAttempt.count).toHaveBeenCalledWith({ where: { userId: 'db_1', createdAt: { gte: expect.any(Date) } } })
    expect(Math.abs(before - 24 * 60 * 60 * 1000 - since.getTime())).toBeLessThan(5000)
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('logs an attempt, asks with a 20 second deadline and stores cleaned questions as ASKED', async () => {
    const res = await ask()
    expect(res.status).toBe(201)
    expect(mocks.order).toEqual(['attempt', 'ai'])
    expect(db.challengeAttempt.create).toHaveBeenCalledWith({ data: { userId: 'db_1' } })
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ schema: ChallengeSchema, costTier: 'medium', timeoutMs: 20000 }))
    const questions = reply.data.questions.map((item) => cleanQuestion(item.question))
    expect(db.challengeQuestion.createMany).toHaveBeenCalledWith({
      data: questions.map((question, position) => ({ decisionId: 'd1', position, question })),
    })
    // The draft is claimed first, so questions are only ever written onto a draft that still has none.
    expect(db.decisionRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'd1', isDraft: true, OR: [{ challengeOutcome: null }, { challengeOutcome: 'UNAVAILABLE' }] },
      data: { challengeOutcome: 'ASKED', challengeModel: 'openai/gpt-5-mini' },
    })
    expect(await res.json()).toEqual({ questions: questions.map((question, position) => ({ position, question })), model: 'openai/gpt-5-mini' })
  })

  it('marks the draft UNAVAILABLE and answers 503 when the AI fails, keeping the attempt', async () => {
    mocks.generate.mockRejectedValue(new Error('OpenRouter request timed out after 20 seconds'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await ask()
    expect([res.status, await res.json()]).toEqual([503, { error: 'The AI could not be reached. Try again, or seal without questions.' }])
    expect(db.challengeAttempt.create).toHaveBeenCalled()
    expect(db.decisionRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'd1', isDraft: true, OR: [{ challengeOutcome: null }, { challengeOutcome: 'UNAVAILABLE' }] },
      data: { challengeOutcome: 'UNAVAILABLE' },
    })
    expect(db.challengeQuestion.createMany).not.toHaveBeenCalled()
  })

  it('answers a racing second request with the stored questions', async () => {
    db.decisionRecord.updateMany.mockResolvedValue({ count: 0 })
    db.decisionRecord.findFirst.mockResolvedValueOnce(draft).mockResolvedValueOnce({
      ...draft,
      challengeOutcome: 'ASKED',
      challengeModel: 'openai/gpt-5-mini',
      challengeQuestions: [
        { id: 'q1', decisionId: 'd1', position: 0, question: 'Stored first?', answer: null, createdAt: new Date() },
        { id: 'q2', decisionId: 'd1', position: 1, question: 'Stored second?', answer: null, createdAt: new Date() },
      ],
    })
    const res = await ask()
    expect(res.status).toBe(200)
    expect((await res.json()).questions).toEqual([
      { position: 0, question: 'Stored first?' },
      { position: 1, question: 'Stored second?' },
    ])
    expect(db.challengeQuestion.createMany).not.toHaveBeenCalled()
  })

  it('never writes questions onto a decision that was sealed while the AI was asked', async () => {
    db.decisionRecord.updateMany.mockResolvedValue({ count: 0 })
    db.decisionRecord.findFirst.mockResolvedValueOnce(draft).mockResolvedValueOnce({ ...draft, isDraft: false, challengeOutcome: 'SKIPPED' })
    const res = await ask()
    expect([res.status, await res.json()]).toEqual([409, { error: 'This decision is already sealed.' }])
    expect(db.challengeQuestion.createMany).not.toHaveBeenCalled()
  })

  it('requires a signed-in user', async () => {
    mocks.userId = null
    expect((await ask()).status).toBe(401)
  })
})
