// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  db: {
    decisionRecord: { findFirst: vi.fn() },
    checkInReminder: { findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    revisit: { create: vi.fn() },
  },
  qstash: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1', tier: 'PRO' }) }))
vi.mock('@upstash/qstash', () => ({ Client: mocks.qstash }))
vi.mock('@/lib/prisma', () => ({
  prisma: { ...mocks.db, $transaction: async (writes: Promise<unknown>[]) => Promise.all(writes) },
}))

import { GET as listCheckIns, POST as scheduleCheckIn } from '@/app/api/decisions/[id]/reminders/route'
import { POST as finishRevisit } from '@/app/api/decisions/[id]/revisits/route'

const { db } = mocks
const sealed = { id: 'd1', userId: 'db_1', isDraft: false }
const params = { params: Promise.resolve({ id: 'd1' }) }
const post = (url: string, body: unknown) => new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body) })
const inDays = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString().slice(0, 10)
const pendingCompleted = () =>
  expect(db.checkInReminder.updateMany).toHaveBeenCalledWith({ where: { decisionId: 'd1', completedAt: null }, data: { completedAt: expect.any(Date) } })

beforeEach(() => {
  for (const group of Object.values(db)) for (const fn of Object.values(group)) fn.mockReset()
  mocks.qstash.mockReset()
  db.decisionRecord.findFirst.mockResolvedValue(sealed)
  db.checkInReminder.updateMany.mockResolvedValue({ count: 1 })
  db.checkInReminder.create.mockImplementation(async ({ data }) => ({ id: 'c2', ...data }))
  db.revisit.create.mockResolvedValue({ id: 'r1' })
})

describe('check-ins', () => {
  it('schedules a check-in, replacing the pending one, and never calls QStash', async () => {
    const day = inDays(90)
    const res = await scheduleCheckIn(post('/api/decisions/d1/reminders', { day }), params)
    expect(res.status).toBe(201)
    pendingCompleted()
    expect(db.checkInReminder.create).toHaveBeenCalledWith({ data: { decisionId: 'd1', scheduledFor: new Date(`${day}T00:00:00.000Z`) } })
    expect(await res.json()).toEqual({ id: 'c2', scheduledFor: `${day}T00:00:00.000Z` })
    expect(mocks.qstash).not.toHaveBeenCalled()
  })

  it('refuses past days, days beyond two years, drafts and foreign decisions', async () => {
    for (const day of [inDays(0), inDays(-3), inDays(800)]) {
      const res = await scheduleCheckIn(post('/api/decisions/d1/reminders', { day }), params)
      expect([res.status, (await res.json()).error]).toEqual([400, 'Pick a day in the next two years.'])
    }
    db.decisionRecord.findFirst.mockResolvedValueOnce(null)
    expect((await scheduleCheckIn(post('/api/decisions/d1/reminders', { day: inDays(30) }), params)).status).toBe(404)
    expect(db.decisionRecord.findFirst).toHaveBeenLastCalledWith({ where: { id: 'd1', userId: 'db_1', isDraft: false }, select: { id: true } })
    expect(db.checkInReminder.create).not.toHaveBeenCalled()
  })

  it('lists check-ins newest first for the owner', async () => {
    db.checkInReminder.findMany.mockResolvedValue([])
    await listCheckIns(new NextRequest('http://localhost/api/decisions/d1/reminders'), params)
    expect(db.checkInReminder.findMany).toHaveBeenCalledWith({ where: { decisionId: 'd1' }, orderBy: { createdAt: 'desc' } })
  })
})

describe('finishing a revisit', () => {
  it('records it, completes every pending check-in, and schedules the next', async () => {
    const day = inDays(180)
    const res = await finishRevisit(post('/api/decisions/d1/revisits', { nextCheckIn: day }), params)
    expect(res.status).toBe(201)
    expect(db.revisit.create).toHaveBeenCalledWith({ data: { decisionId: 'd1', completedAt: expect.any(Date) } })
    pendingCompleted()
    expect(db.checkInReminder.create).toHaveBeenCalledWith({ data: { decisionId: 'd1', scheduledFor: new Date(`${day}T00:00:00.000Z`) } })
    expect(await res.json()).toEqual({ revisitId: 'r1', nextCheckIn: day })
  })

  it('with not again leaves nothing pending', async () => {
    const res = await finishRevisit(post('/api/decisions/d1/revisits', { nextCheckIn: null }), params)
    expect(res.status).toBe(201)
    pendingCompleted()
    expect(db.checkInReminder.create).not.toHaveBeenCalled()
    expect(await res.json()).toEqual({ revisitId: 'r1', nextCheckIn: null })
  })

  it('keeps at most one pending check-in: every new one follows completing the pending ones', async () => {
    const order: string[] = []
    db.checkInReminder.updateMany.mockImplementation(async () => (order.push('complete'), { count: 1 }))
    db.checkInReminder.create.mockImplementation(async ({ data }) => (order.push('create'), { id: 'c3', ...data }))
    await scheduleCheckIn(post('/api/decisions/d1/reminders', { day: inDays(30) }), params)
    await finishRevisit(post('/api/decisions/d1/revisits', { nextCheckIn: inDays(60) }), params)
    expect(order).toEqual(['complete', 'create', 'complete', 'create'])
  })

  it('refuses a bad next day and foreign or draft decisions', async () => {
    const bad = await finishRevisit(post('/api/decisions/d1/revisits', { nextCheckIn: inDays(900) }), params)
    expect([bad.status, (await bad.json()).error]).toEqual([400, 'Pick a day in the next two years.'])
    db.decisionRecord.findFirst.mockResolvedValueOnce(null)
    expect((await finishRevisit(post('/api/decisions/d1/revisits', { nextCheckIn: null }), params)).status).toBe(404)
    expect(db.revisit.create).not.toHaveBeenCalled()
  })
})
