// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  prisma: {
    decisionRecord: { create: mocks.create, update: mocks.update, findFirst: mocks.findFirst, count: mocks.count },
  },
}))

import { POST } from '@/app/api/decisions/route'
import { GET, PATCH } from '@/app/api/decisions/[id]/route'
import { afterUpdate, asCreated, buildSealPayload, computeSealHash, type SealableDecision } from '@/lib/seal'

const { create, update, findFirst, getMaxCatalogNumber } = mocks

const validBody = {
  title: 'Take the platform team role',
  summary: 'Move from payments to the platform team at Halcyon.',
  context: 'The platform team is rebuilding the deploy pipeline and asked me to join.',
  alternatives: 'Stay on payments, join platform, or look outside the company.',
  chosenOption: 'Join the platform team for at least a year.',
  reasoning: 'Infrastructure is the gap in my experience and moving back stays easy.',
  domainTag: 'CAREER',
  customTags: ['halcyon'],
}
const forecast = { statement: 'I ship the new pipeline', probability: 70, resolveBy: '2027-06-30' }
const row = (position: number, input: typeof forecast) => ({
  position,
  statement: input.statement,
  probability: input.probability,
  resolveBy: new Date(`${input.resolveBy}T00:00:00.000Z`),
})

type Data = Record<string, unknown>
const postRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/decisions', { method: 'POST', body: JSON.stringify(body) })
const patchRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/decisions/d1', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const echo = async ({ data }: { data: Data }) => ({ id: 'd1', ...data })
// Mocked call data is untyped; the payload builder only reads the sealed fields.
const hashOf = async (record: unknown) => computeSealHash(buildSealPayload(record as SealableDecision))

const NOW = new Date('2026-11-12T10:00:00.000Z')

function baseRecord(overrides: Data = {}) {
  return {
    id: 'd1',
    userId: 'db_1',
    ...validBody,
    domainTag: 'CAREER' as const,
    values: null,
    uncertainties: null,
    predictedOutcome: null,
    predictedTimeframe: null,
    confidenceLevel: null,
    attachments: [],
    supplementaryNotes: null,
    isImported: false,
    isLocked: false,
    lockedAt: null,
    draftStartedAt: null,
    isDraft: false,
    catalogNumber: 3,
    createdAt: new Date(NOW.getTime() - 60_000),
    updatedAt: NOW,
    sealHash: 'stale',
    sealedAt: new Date(NOW.getTime() - 60_000),
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  for (const fn of [create, update, findFirst, getMaxCatalogNumber]) fn.mockReset()
  create.mockImplementation(echo)
  update.mockImplementation(echo)
  getMaxCatalogNumber.mockResolvedValue(2)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('forecasts on decision writes', () => {
  it('creates a finalized decision with its forecasts and a v2 seal', async () => {
    const second = { statement: 'Second', probability: 30, resolveBy: '2027-01-15' }
    const res = await POST(postRequest({ ...validBody, forecasts: [forecast, second] }))
    expect(res.status).toBe(201)
    const { forecasts, sealHash, sealedAt, ...decision } = create.mock.calls[0][0].data
    expect(forecasts).toEqual({ create: [row(0, forecast), row(1, second)] })
    expect(sealedAt).toEqual(NOW)
    expect(sealHash).toBe(await hashOf({ ...asCreated(decision), forecasts: forecasts.create }))
    expect(sealHash).not.toBe(await hashOf(asCreated(decision)))
  })

  it('rejects bad forecasts', async () => {
    const bad = [
      [{ ...forecast, probability: 72 }],
      [{ ...forecast, probability: 100 }],
      [{ ...forecast, statement: '   ' }],
      [{ ...forecast, statement: 'x'.repeat(201) }],
      [forecast, forecast, forecast, forecast],
      [{ ...forecast, resolveBy: '2026-11-12' }],
    ]
    for (const forecasts of bad) {
      const res = await POST(postRequest({ ...validBody, forecasts }))
      expect(res.status).toBe(400)
    }
    expect(create).not.toHaveBeenCalled()
  })

  it('lets a draft keep a past date but refuses it at finalize', async () => {
    findFirst.mockResolvedValue(baseRecord({ isDraft: true, catalogNumber: null, sealHash: null, sealedAt: null }))
    const past = { ...forecast, resolveBy: '2026-01-01' }

    const draft = await PATCH(patchRequest({ forecasts: [past] }), params('d1'))
    expect(draft.status).toBe(200)
    expect(update.mock.calls[0][0].data.forecasts).toEqual({ deleteMany: {}, create: [row(0, past)] })

    const refused = await PATCH(patchRequest({ ...validBody, finalize: true, forecasts: [past] }), params('d1'))
    expect(refused.status).toBe(400)
    const body = await refused.json()
    expect(body.issues.map((issue: { message: string }) => issue.message)).toContain('Pick a date after today.')

    const sealed = await PATCH(patchRequest({ ...validBody, finalize: true, forecasts: [forecast] }), params('d1'))
    expect(sealed.status).toBe(200)
    const { forecasts, sealHash, sealedAt, ...written } = update.mock.calls[1][0].data
    expect(forecasts).toEqual({ deleteMany: {}, create: [row(0, forecast)] })
    expect(sealedAt).toEqual(NOW)
    expect(sealHash).toBe(await hashOf({ ...afterUpdate(baseRecord(), written), forecasts: forecasts.create }))
  })

  it('re-seals with the stored forecasts when an in-window edit omits them, and replaces the set when it carries them', async () => {
    const stored = [{ ...row(0, forecast), id: 'f1', decisionId: 'd1', resolution: null, resolvedAt: null, createdAt: NOW, updatedAt: NOW }]
    const record = baseRecord({ forecasts: stored })
    findFirst.mockResolvedValue(record)

    const edit = await PATCH(patchRequest({ reasoning: 'New reasoning that is long enough to pass the check.' }), params('d1'))
    expect(edit.status).toBe(200)
    // The stored forecasts only reach the seal if the route asks for them.
    expect(findFirst.mock.calls[0][0].include).toMatchObject({ forecasts: { orderBy: { position: 'asc' } } })
    const first = update.mock.calls[0][0].data
    expect(first).not.toHaveProperty('forecasts')
    const { sealHash, sealedAt, ...written } = first
    expect(sealedAt).toEqual(NOW)
    expect(sealHash).toBe(await hashOf({ ...afterUpdate(record, written), forecasts: stored }))
    expect(sealHash).not.toBe(await hashOf({ ...afterUpdate(record, written), forecasts: [] }))

    const replacement = { statement: 'Replacement', probability: 40, resolveBy: '2027-03-01' }
    const swap = await PATCH(patchRequest({ forecasts: [replacement] }), params('d1'))
    expect(swap.status).toBe(200)
    const second = update.mock.calls[1][0].data
    expect(second.forecasts).toEqual({ deleteMany: {}, create: [row(0, replacement)] })
    const { forecasts, sealHash: secondHash, sealedAt: secondAt, ...secondWritten } = second
    expect(secondAt).toEqual(NOW)
    expect(secondHash).toBe(await hashOf({ ...afterUpdate(record, secondWritten), forecasts: forecasts.create }))
  })

  it('refuses forecasts after the window', async () => {
    findFirst.mockResolvedValue(
      baseRecord({ createdAt: new Date(NOW.getTime() - 10 * 60_000), isLocked: true, lockedAt: new Date(NOW.getTime() - 5 * 60_000) })
    )
    const res = await PATCH(patchRequest({ forecasts: [forecast] }), params('d1'))
    expect(res.status).toBe(403)
    expect(update).not.toHaveBeenCalled()
  })

  it('returns forecasts with the decision', async () => {
    findFirst.mockResolvedValue(baseRecord({ forecasts: [] }))
    const res = await GET(new NextRequest('http://localhost/api/decisions/d1'), params('d1'))
    expect(res.status).toBe(200)
    expect(findFirst.mock.calls[0][0].include).toMatchObject({ forecasts: { orderBy: { position: 'asc' } } })
  })
})
