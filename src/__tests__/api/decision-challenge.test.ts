// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
  count: vi.fn(),
  getMaxCatalogNumber: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1', tier: 'PRO' }) }))
vi.mock('@/lib/catalog-db', () => ({ getMaxCatalogNumber: mocks.getMaxCatalogNumber }))
vi.mock('@/lib/decisions', () => ({ getDecisions: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { decisionRecord: { create: mocks.create, update: mocks.update, findFirst: mocks.findFirst, count: mocks.count } },
}))

import { POST } from '@/app/api/decisions/route'
import { GET, PATCH } from '@/app/api/decisions/[id]/route'
import { buildSealPayload, computeSealHash } from '@/lib/seal'

const { create, update, findFirst, getMaxCatalogNumber } = mocks
type Data = Record<string, unknown>

const validCreateBody = {
  title: 'Take the platform team role',
  summary: 'Move from payments to the platform team at Halcyon.',
  context: 'The platform team is rebuilding the deploy pipeline and asked me to join.',
  alternatives: 'Stay on payments, join platform, or look outside the company.',
  chosenOption: 'Join the platform team for at least a year.',
  reasoning: 'Infrastructure is the gap in my experience and moving back stays easy.',
  predictedOutcome: 'I will be glad I moved within six months.',
  confidenceLevel: 6,
  domainTag: 'CAREER',
  customTags: ['halcyon', 'learning'],
}
const baseRecord = {
  id: 'd1',
  userId: 'db_1',
  ...validCreateBody,
  domainTag: 'CAREER' as const,
  values: null,
  uncertainties: null,
  predictedTimeframe: null,
  attachments: [],
  supplementaryNotes: null,
  isImported: false,
  isLocked: false,
  lockedAt: null,
  draftStartedAt: null,
  updatedAt: new Date(),
  forecasts: [],
  challengeOutcome: null,
  challengeModel: null,
  challengeQuestions: [],
}
const draftRecord = { ...baseRecord, isDraft: true, catalogNumber: null, createdAt: new Date(Date.now() - 60_000), sealHash: null, sealedAt: null }
const questions = [
  { id: 'q1', decisionId: 'd1', position: 0, question: 'Why not stay on payments?', answer: null, createdAt: new Date() },
  { id: 'q2', decisionId: 'd1', position: 1, question: 'What if the new manager leaves?', answer: null, createdAt: new Date() },
]
const askedDraft = { ...draftRecord, challengeOutcome: 'ASKED' as const, challengeModel: 'openai/gpt-5-mini', challengeQuestions: questions }

const patch = (body: unknown) =>
  PATCH(new NextRequest('http://localhost/api/decisions/d1', { method: 'PATCH', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: 'd1' }),
  })
const merge = async ({ data }: { data: Data }) => ({ ...draftRecord, ...data })
const answerWrites = (answers: Array<string | null>) => ({
  updateMany: answers.map((answer, position) => ({ where: { position }, data: { answer } })),
})

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
  update.mockImplementation(merge)
  getMaxCatalogNumber.mockResolvedValue(2)
})

describe('challenge answers and skips in the decision routes', () => {
  it('saves answers on a draft once questions were asked', async () => {
    findFirst.mockResolvedValue(askedDraft)
    expect((await patch({ challengeAnswers: ['Because rent is flexible', ''] })).status).toBe(200)
    expect(update.mock.calls[0][0].data.challengeQuestions).toEqual(answerWrites(['Because rent is flexible', null]))
  })

  it('refuses answers when nothing was asked, and a wrong count', async () => {
    findFirst.mockResolvedValueOnce(draftRecord)
    const none = await patch({ challengeAnswers: ['An answer'] })
    expect([none.status, (await none.json()).error]).toEqual([400, 'There are no questions to answer.'])
    findFirst.mockResolvedValueOnce(askedDraft)
    const short = await patch({ ...validCreateBody, finalize: true, challengeAnswers: ['Only one'] })
    expect([short.status, (await short.json()).error]).toEqual([400, 'Answer each question, or leave it blank.'])
    expect(update).not.toHaveBeenCalled()
  })

  it('seals a finalized decision as v3 with the answers it stores', async () => {
    findFirst.mockResolvedValue(askedDraft)
    await patch({ ...validCreateBody, finalize: true, challengeAnswers: ['Rent is flexible', '  '] })
    const data = update.mock.calls[0][0].data
    expect(data.challengeQuestions).toEqual(answerWrites(['Rent is flexible', null]))
    const stored = { ...askedDraft, ...data, challengeQuestions: [{ ...questions[0], answer: 'Rent is flexible' }, questions[1]] }
    const payload = JSON.parse(buildSealPayload(stored))
    expect(payload.seal).toBe('da-seal-v3')
    expect(payload.challenge).toEqual({
      outcome: 'asked',
      model: 'openai/gpt-5-mini',
      questions: [
        { question: 'Why not stay on payments?', answer: 'Rent is flexible' },
        { question: 'What if the new manager leaves?', answer: null },
      ],
    })
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload(stored)))
  })

  it('seals an explicit skip as SKIPPED, and a skip after a failure as UNAVAILABLE', async () => {
    findFirst.mockResolvedValueOnce(draftRecord)
    await patch({ ...validCreateBody, finalize: true, challengeSkipped: true })
    const skipped = update.mock.calls[0][0].data
    expect(skipped.challengeOutcome).toBe('SKIPPED')
    expect(JSON.parse(buildSealPayload({ ...draftRecord, ...skipped })).challenge.outcome).toBe('skipped')
    expect(skipped.sealHash).toBe(await computeSealHash(buildSealPayload({ ...draftRecord, ...skipped })))

    const failed = { ...draftRecord, challengeOutcome: 'UNAVAILABLE' as const }
    findFirst.mockResolvedValueOnce(failed)
    await patch({ ...validCreateBody, finalize: true, challengeSkipped: true })
    const unavailable = update.mock.calls[1][0].data
    expect(unavailable.challengeOutcome ?? failed.challengeOutcome).toBe('UNAVAILABLE')
    expect(JSON.parse(buildSealPayload({ ...failed, ...unavailable })).challenge.outcome).toBe('unavailable')
    expect(unavailable.sealHash).toBe(await computeSealHash(buildSealPayload({ ...failed, ...unavailable })))
  })

  it('seals a skip on the create path', async () => {
    getMaxCatalogNumber.mockResolvedValue(6)
    create.mockImplementation(async ({ data }: { data: Data }) => ({ id: 'd1', ...data }))
    await POST(new NextRequest('http://localhost/api/decisions', { method: 'POST', body: JSON.stringify({ ...validCreateBody, challengeSkipped: true }) }))
    const data = create.mock.calls[0][0].data
    expect(data.challengeOutcome).toBe('SKIPPED')
    expect(JSON.parse(buildSealPayload(data)).seal).toBe('da-seal-v3')
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload(data)))
  })

  it('keeps answers and the outcome after finalize, and reseals with them on an in-window edit', async () => {
    const sealed = {
      ...askedDraft,
      isDraft: false,
      catalogNumber: 3,
      sealHash: 'stale',
      sealedAt: new Date(Date.now() - 60_000),
      challengeQuestions: [{ ...questions[0], answer: 'Kept' }, questions[1]],
    }
    findFirst.mockResolvedValue(sealed)
    update.mockImplementation(async ({ data }: { data: Data }) => ({ ...sealed, ...data }))
    await patch({ reasoning: 'Infrastructure is still the gap in my experience, and moving back stays easy.', challengeAnswers: ['Changed', 'Changed'] })
    const data = update.mock.calls[0][0].data
    // The stored questions are loaded, so the reseal covers them.
    expect(findFirst.mock.calls[0][0].include.challengeQuestions).toEqual({ orderBy: { position: 'asc' } })
    expect(data.challengeQuestions).toBeUndefined()
    expect(data.challengeOutcome).toBeUndefined()
    expect(JSON.parse(buildSealPayload({ ...sealed, ...data })).challenge.questions[0].answer).toBe('Kept')
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload({ ...sealed, ...data })))
  })

  it('returns the questions with a draft', async () => {
    findFirst.mockResolvedValue(askedDraft)
    await GET(new NextRequest('http://localhost/api/decisions/d1'), { params: Promise.resolve({ id: 'd1' }) })
    expect(findFirst.mock.calls[0][0].include.challengeQuestions).toEqual({ orderBy: { position: 'asc' } })
  })
})
