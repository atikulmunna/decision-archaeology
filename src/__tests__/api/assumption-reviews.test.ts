// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  userId: 'user_1' as string | null,
  findFirst: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: mocks.userId }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    decisionRecord: { findFirst: mocks.findFirst },
    assumptionReview: { upsert: mocks.upsert, deleteMany: mocks.deleteMany },
  },
}))

import { DELETE, PUT } from '@/app/api/decisions/[id]/assumptions/route'
import { computeSealHash } from '@/lib/seal'

const { findFirst, upsert, deleteMany } = mocks

const lockedRecord = {
  id: 'd1',
  userId: 'db_1',
  isDraft: false,
  isImported: false,
  isLocked: true,
  lockedAt: new Date('2025-08-15T12:05:00Z'),
  createdAt: new Date('2025-08-15T12:00:00Z'),
  uncertainties: 'Whether the hours stay reasonable. Whether the team holds.',
}
const valid = { itemText: 'Whether the hours stay reasonable.', verdict: 'PARTLY' }

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/decisions/d1/assumptions', { method: 'PUT', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  mocks.userId = 'user_1'
  for (const fn of [findFirst, upsert, deleteMany]) fn.mockReset()
})

describe('PUT /api/decisions/[id]/assumptions', () => {
  it('saves a verdict keyed by the hash of the normalized item', async () => {
    findFirst.mockResolvedValue(lockedRecord)
    upsert.mockImplementation(async (args: { create: Record<string, unknown> }) => ({ id: 'r1', ...args.create }))
    const res = await PUT(
      req({ itemText: '  Whether the hours stay reasonable.  ', verdict: 'PARTLY', note: '  Long weeks.  ' }),
      params('d1')
    )
    expect(res.status).toBe(200)
    const args = upsert.mock.calls[0][0]
    expect(args.where).toEqual({
      decisionId_itemHash: { decisionId: 'd1', itemHash: await computeSealHash('Whether the hours stay reasonable.') },
    })
    expect(args.create).toMatchObject({
      decisionId: 'd1',
      itemText: 'Whether the hours stay reasonable.',
      verdict: 'PARTLY',
      note: 'Long weeks.',
    })
    expect(args.update).toEqual({ itemText: 'Whether the hours stay reasonable.', verdict: 'PARTLY', note: 'Long weeks.' })
  })

  it('stores an empty note as null', async () => {
    findFirst.mockResolvedValue(lockedRecord)
    upsert.mockResolvedValue({ id: 'r1' })
    await PUT(req({ ...valid, note: '   ' }), params('d1'))
    expect(upsert.mock.calls[0][0].update.note).toBeNull()
  })

  it('rejects reviews before sealing, and for drafts', async () => {
    findFirst.mockResolvedValue({ ...lockedRecord, isLocked: false, lockedAt: null, createdAt: new Date() })
    const early = await PUT(req(valid), params('d1'))
    expect(early.status).toBe(409)
    expect(await early.json()).toEqual({ error: 'Review assumptions once the decision is sealed.' })
    findFirst.mockResolvedValue({ ...lockedRecord, isDraft: true })
    expect((await PUT(req(valid), params('d1'))).status).toBe(409)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('allows imported records, which never lock', async () => {
    findFirst.mockResolvedValue({ ...lockedRecord, isLocked: false, lockedAt: null, isImported: true, createdAt: new Date() })
    upsert.mockResolvedValue({ id: 'r1' })
    expect((await PUT(req(valid), params('d1'))).status).toBe(200)
  })

  it('refuses text that is not one of the assumptions', async () => {
    findFirst.mockResolvedValue(lockedRecord)
    const res = await PUT(req({ ...valid, itemText: 'Something I never wrote.' }), params('d1'))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: "That is not one of this decision's assumptions." })
  })

  it('validates the verdict and the note length', async () => {
    findFirst.mockResolvedValue(lockedRecord)
    expect((await PUT(req({ ...valid, verdict: 'MAYBE' }), params('d1'))).status).toBe(400)
    expect((await PUT(req({ ...valid, note: 'x'.repeat(281) }), params('d1'))).status).toBe(400)
    upsert.mockResolvedValue({ id: 'r1' })
    expect((await PUT(req({ ...valid, note: `  ${'x'.repeat(280)}  ` }), params('d1'))).status).toBe(200)
  })

  it('requires a signed-in user', async () => {
    mocks.userId = null
    expect((await PUT(req(valid), params('d1'))).status).toBe(401)
  })

  it("hides other users' records", async () => {
    findFirst.mockResolvedValue(null)
    expect((await PUT(req(valid), params('d1'))).status).toBe(404)
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'd1', userId: 'db_1' } })
  })
})

describe('DELETE /api/decisions/[id]/assumptions', () => {
  it('clears a verdict, and clearing again still succeeds', async () => {
    findFirst.mockResolvedValue(lockedRecord)
    deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
    for (let i = 0; i < 2; i += 1) {
      const res = await DELETE(req({ itemText: 'Whether the hours stay reasonable.' }), params('d1'))
      expect([res.status, await res.json()]).toEqual([200, { cleared: true }])
    }
    expect(deleteMany).toHaveBeenCalledWith({
      where: { decisionId: 'd1', itemHash: await computeSealHash('Whether the hours stay reasonable.') },
    })
  })
})
