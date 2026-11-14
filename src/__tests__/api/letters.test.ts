// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  findFirst: vi.fn(),
  count: vi.fn(),
  letterFindUnique: vi.fn(),
  letterFindFirst: vi.fn(),
  letterDeleteMany: vi.fn(),
  letterUpdateMany: vi.fn(),
  getMaxCatalogNumber: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1', tier: 'PRO' }) }))
vi.mock('@/lib/catalog-db', () => ({ getMaxCatalogNumber: mocks.getMaxCatalogNumber }))
vi.mock('@/lib/decisions', () => ({ getDecisions: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    decisionRecord: { create: mocks.create, update: mocks.update, findFirst: mocks.findFirst, count: mocks.count },
    letter: { findUnique: mocks.letterFindUnique, findFirst: mocks.letterFindFirst, deleteMany: mocks.letterDeleteMany, updateMany: mocks.letterUpdateMany },
  },
}))

import { POST } from '@/app/api/decisions/route'
import { GET, PATCH } from '@/app/api/decisions/[id]/route'
import { GET as getLetter } from '@/app/api/decisions/[id]/letter/route'
import { buildSealPayload, computeSealHash } from '@/lib/seal'
import { letterFingerprint } from '@/lib/letter-rules'

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
  customTags: ['halcyon'],
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
  letter: null,
}
const draftRecord = { ...baseRecord, isDraft: true, catalogNumber: null, createdAt: new Date(Date.now() - 60_000), sealHash: null, sealedAt: null }
const inDays = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10)

const patch = (body: unknown) =>
  PATCH(new NextRequest('http://localhost/api/decisions/d1', { method: 'PATCH', body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: 'd1' }),
  })

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
  update.mockImplementation(async ({ data }: { data: Data }) => ({ ...draftRecord, ...data }))
  getMaxCatalogNumber.mockResolvedValue(2)
  mocks.letterFindUnique.mockResolvedValue(null)
  mocks.letterDeleteMany.mockResolvedValue({ count: 0 })
})

describe('the letter in the decision routes', () => {
  it('saves a draft letter and returns it while drafting', async () => {
    findFirst.mockResolvedValue(draftRecord)
    const opensOn = inDays(60)
    await patch({ letter: { body: 'Dear me', opensOn } })
    expect(update.mock.calls[0][0].data.letter).toEqual({
      upsert: {
        create: { body: 'Dear me', opensAt: new Date(`${opensOn}T00:00:00.000Z`), sha256: '' },
        update: { body: 'Dear me', opensAt: new Date(`${opensOn}T00:00:00.000Z`), sha256: '' },
      },
    })
    mocks.letterFindUnique.mockResolvedValue({ body: 'Dear me', opensAt: new Date(`${opensOn}T00:00:00.000Z`) })
    const res = await GET(new NextRequest('http://localhost/api/decisions/d1'), { params: Promise.resolve({ id: 'd1' }) })
    expect((await res.json()).letter).toEqual({ body: 'Dear me', opensOn })
  })

  it('removes the draft letter when the body is blank', async () => {
    findFirst.mockResolvedValue(draftRecord)
    await patch({ letter: { body: '   ', opensOn: inDays(60) } })
    expect(mocks.letterDeleteMany).toHaveBeenCalledWith({ where: { decisionId: 'd1' } })
    expect(update.mock.calls[0][0].data.letter).toBeUndefined()
  })

  it('seals a finalized decision with its letter', async () => {
    findFirst.mockResolvedValue(draftRecord)
    const opensOn = inDays(90)
    await patch({ ...validCreateBody, finalize: true, letter: { body: '  Dear me, keep going.  ', opensOn } })
    const data = update.mock.calls[0][0].data
    const sha256 = await letterFingerprint('Dear me, keep going.')
    const opensAt = new Date(`${opensOn}T00:00:00.000Z`)
    expect(data.letter).toEqual({ upsert: { create: { body: 'Dear me, keep going.', opensAt, sha256 }, update: { body: 'Dear me, keep going.', opensAt, sha256 } } })
    const stored = { ...draftRecord, ...data, letter: { opensAt, sha256 } }
    expect(JSON.parse(buildSealPayload(stored)).seal).toBe('da-seal-v4')
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload(stored)))
  })

  it('refuses a letter that opens too soon or runs long', async () => {
    findFirst.mockResolvedValue(draftRecord)
    const soon = await patch({ ...validCreateBody, finalize: true, letter: { body: 'Hi', opensOn: inDays(10) } })
    expect([soon.status, (await soon.json()).error]).toEqual([400, 'Pick an opening day at least a month away.'])
    const long = await patch({ ...validCreateBody, finalize: true, letter: { body: 'x'.repeat(5001), opensOn: inDays(60) } })
    expect([long.status, (await long.json()).error]).toEqual([400, 'Keep the letter under 5000 characters.'])
    expect(update).not.toHaveBeenCalled()
  })

  it('seals without a letter when the body is blank, removing any draft letter', async () => {
    findFirst.mockResolvedValue(draftRecord)
    await patch({ ...validCreateBody, finalize: true, letter: { body: '  ', opensOn: inDays(60) } })
    const data = update.mock.calls[0][0].data
    expect(data.letter).toBeUndefined()
    expect(mocks.letterDeleteMany).toHaveBeenCalledWith({ where: { decisionId: 'd1' } })
    expect(JSON.parse(buildSealPayload({ ...draftRecord, ...data })).seal).not.toBe('da-seal-v4')
  })

  it('seals a letter on the create path', async () => {
    create.mockImplementation(async ({ data }: { data: Data }) => ({ id: 'd1', ...data }))
    getMaxCatalogNumber.mockResolvedValue(6)
    const opensOn = inDays(45)
    await POST(new NextRequest('http://localhost/api/decisions', { method: 'POST', body: JSON.stringify({ ...validCreateBody, letter: { body: 'Hello later', opensOn } }) }))
    const data = create.mock.calls[0][0].data
    const sha256 = await letterFingerprint('Hello later')
    expect(data.letter).toEqual({ create: { body: 'Hello later', opensAt: new Date(`${opensOn}T00:00:00.000Z`), sha256 } })
    const stored = { ...data, letter: { opensAt: new Date(`${opensOn}T00:00:00.000Z`), sha256 } }
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload(stored)))
  })

  it('never changes the letter after finalize, and reseals with its fingerprint', async () => {
    const letter = { opensAt: new Date('2027-06-01T00:00:00.000Z'), sha256: 'b'.repeat(64) }
    const sealed = { ...draftRecord, isDraft: false, catalogNumber: 3, sealHash: 'stale', sealedAt: new Date(Date.now() - 60_000), letter }
    findFirst.mockResolvedValue(sealed)
    update.mockImplementation(async ({ data }: { data: Data }) => ({ ...sealed, ...data }))
    await patch({ reasoning: 'Infrastructure is still the gap in my experience, and moving back stays easy.', letter: { body: 'Changed', opensOn: inDays(60) } })
    const data = update.mock.calls[0][0].data
    expect(data.letter).toBeUndefined()
    expect(JSON.parse(buildSealPayload({ ...sealed, ...data })).letter.sha256).toBe('b'.repeat(64))
    expect(data.sealHash).toBe(await computeSealHash(buildSealPayload({ ...sealed, ...data })))
  })

  it('GET /letter never returns a body before the day', async () => {
    mocks.letterFindFirst.mockResolvedValueOnce({ opensAt: new Date(Date.now() + 86_400_000), openedAt: null, sha256: 'c'.repeat(64) })
    findFirst.mockResolvedValue({ ...draftRecord, isDraft: false })
    const res = await getLetter(new NextRequest('http://localhost/api/decisions/d1/letter'), { params: Promise.resolve({ id: 'd1' }) })
    const body = await res.json()
    expect(body.state).toBe('sealed')
    expect(body).not.toHaveProperty('body')
    expect(mocks.letterUpdateMany).not.toHaveBeenCalled()
  })
})
