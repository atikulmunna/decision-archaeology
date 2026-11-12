// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  userId: 'user_1' as string | null,
  decisionFindFirst: vi.fn(),
  forecastFindFirst: vi.fn(),
  forecastUpdate: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: mocks.userId }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    decisionRecord: { findFirst: mocks.decisionFindFirst },
    forecast: { findFirst: mocks.forecastFindFirst, update: mocks.forecastUpdate },
  },
}))

import { PUT } from '@/app/api/decisions/[id]/forecasts/[forecastId]/route'

const { decisionFindFirst, forecastFindFirst, forecastUpdate } = mocks

const sealed = {
  id: 'd1',
  userId: 'db_1',
  isDraft: false,
  isImported: false,
  isLocked: true,
  lockedAt: new Date('2026-01-01T00:05:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}
const forecast = {
  id: 'f1',
  decisionId: 'd1',
  position: 0,
  statement: 'I ship the new pipeline',
  probability: 70,
  resolveBy: new Date('2027-06-30T00:00:00.000Z'),
  resolution: null,
  resolvedAt: null,
}

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/decisions/d1/forecasts/f1', {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  })
const params = (id = 'd1', forecastId = 'f1') => ({ params: Promise.resolve({ id, forecastId }) })
const at = (iso: string) => vi.setSystemTime(new Date(iso))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  at('2026-11-12T10:00:00.000Z')
  mocks.userId = 'user_1'
  for (const fn of [decisionFindFirst, forecastFindFirst, forecastUpdate]) fn.mockReset()
  decisionFindFirst.mockResolvedValue(sealed)
  forecastFindFirst.mockResolvedValue(forecast)
  forecastUpdate.mockImplementation(async ({ data }) => ({ ...forecast, ...data }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PUT /api/decisions/[id]/forecasts/[forecastId]', () => {
  it('requires a signed-in user and a valid body', async () => {
    mocks.userId = null
    expect((await PUT(req({ resolution: 'HAPPENED' }), params())).status).toBe(401)
    mocks.userId = 'user_1'
    expect((await PUT(req({ resolution: 'MAYBE' }), params())).status).toBe(400)
    expect((await PUT(req(undefined), params())).status).toBe(400)
    expect(forecastUpdate).not.toHaveBeenCalled()
  })

  it("hides other users' decisions and forecasts on other decisions", async () => {
    decisionFindFirst.mockResolvedValueOnce(null)
    expect((await PUT(req({ resolution: 'HAPPENED' }), params('d2'))).status).toBe(404)
    expect(decisionFindFirst.mock.calls[0][0].where).toEqual({ id: 'd2', userId: 'db_1' })
    forecastFindFirst.mockResolvedValueOnce(null)
    expect((await PUT(req({ resolution: 'HAPPENED' }), params('d1', 'f9'))).status).toBe(404)
    expect(forecastFindFirst.mock.calls[0][0].where).toEqual({ id: 'f9', decisionId: 'd1' })
    expect(forecastUpdate).not.toHaveBeenCalled()
  })

  it('waits for the seal, except on imported records', async () => {
    const inWindow = { ...sealed, isLocked: false, lockedAt: null, createdAt: new Date('2026-11-12T09:58:00.000Z') }
    for (const record of [{ ...sealed, isDraft: true }, inWindow]) {
      decisionFindFirst.mockResolvedValueOnce(record)
      const res = await PUT(req({ resolution: 'HAPPENED' }), params())
      expect([res.status, await res.json()]).toEqual([409, { error: 'Resolve forecasts once the decision is sealed.' }])
    }
    decisionFindFirst.mockResolvedValueOnce({ ...inWindow, isImported: true })
    expect((await PUT(req({ resolution: 'HAPPENED' }), params())).status).toBe(200)
  })

  it('marks Happened any time after sealing', async () => {
    const res = await PUT(req({ resolution: 'HAPPENED' }), params())
    expect(res.status).toBe(200)
    expect(forecastUpdate).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { resolution: 'HAPPENED', resolvedAt: new Date('2026-11-12T10:00:00.000Z') },
    })
    expect((await res.json()).resolution).toBe('HAPPENED')
  })

  it("opens Didn't happen only after the resolve-by day ends in UTC", async () => {
    at('2027-06-30T23:59:59.999Z')
    const early = await PUT(req({ resolution: 'DIDNT' }), params())
    expect([early.status, await early.json()]).toEqual([409, { error: 'You can mark this after Jun 30, 2027.' }])
    at('2027-07-01T00:00:00.000Z')
    expect((await PUT(req({ resolution: 'DIDNT' }), params())).status).toBe(200)
    expect((await PUT(req({ resolution: 'VOID' }), params())).status).toBe(200)
  })

  it('reopens a resolved forecast, clearing when it was resolved', async () => {
    forecastFindFirst.mockResolvedValue({ ...forecast, resolution: 'HAPPENED', resolvedAt: new Date('2026-11-01T00:00:00.000Z') })
    const res = await PUT(req({ resolution: null }), params())
    expect(res.status).toBe(200)
    expect(forecastUpdate).toHaveBeenCalledWith({ where: { id: 'f1' }, data: { resolution: null, resolvedAt: null } })
  })
})
