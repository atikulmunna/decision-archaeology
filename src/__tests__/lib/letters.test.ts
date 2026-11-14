import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: { letter: { findFirst: mocks.findFirst, updateMany: mocks.updateMany, update: mocks.update } },
}))

import { openLetter, peekLetter } from '@/lib/letters'

const now = new Date('2027-03-10T12:00:00.000Z')
const day = (s: string) => new Date(`${s}T00:00:00.000Z`)
const selects = () => mocks.findFirst.mock.calls.map((call) => call[0].select as Record<string, boolean>)

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
  mocks.updateMany.mockResolvedValue({ count: 1 })
})

describe('peekLetter', () => {
  it('reads sealed, ready and open states without opening anything', async () => {
    mocks.findFirst.mockResolvedValueOnce(null)
    expect(await peekLetter('db_1', 'd1', now)).toEqual({ state: 'none' })

    mocks.findFirst.mockResolvedValueOnce({ opensAt: day('2027-04-01'), openedAt: null, sha256: 'a'.repeat(64) })
    expect(await peekLetter('db_1', 'd1', now)).toEqual({ state: 'sealed', opensAt: day('2027-04-01') })

    mocks.findFirst.mockResolvedValueOnce({ opensAt: day('2027-03-01'), openedAt: null, sha256: 'a'.repeat(64) })
    expect(await peekLetter('db_1', 'd1', now)).toEqual({ state: 'ready', opensAt: day('2027-03-01') })

    // Only the decision's owner, and only a sealed decision.
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ decisionId: 'd1', decision: { userId: 'db_1', isDraft: false } })
    expect(selects().every((select) => !select.body)).toBe(true)

    mocks.findFirst
      .mockResolvedValueOnce({ opensAt: day('2027-03-01'), openedAt: day('2027-03-02'), sha256: 'a'.repeat(64) })
      .mockResolvedValueOnce({ body: 'Dear me' })
    expect(await peekLetter('db_1', 'd1', now)).toEqual({
      state: 'open',
      opensAt: day('2027-03-01'),
      openedAt: day('2027-03-02'),
      sha256: 'a'.repeat(64),
      body: 'Dear me',
    })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('openLetter', () => {
  it('opens once on or after the day, and not before', async () => {
    mocks.findFirst.mockResolvedValueOnce({ opensAt: day('2027-04-01'), openedAt: null, sha256: 'a'.repeat(64) })
    expect(await openLetter('db_1', 'd1', now)).toEqual({ state: 'sealed', opensAt: day('2027-04-01') })
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(selects().every((select) => !select.body)).toBe(true)

    mocks.findFirst
      .mockResolvedValueOnce({ opensAt: day('2027-03-01'), openedAt: null, sha256: 'a'.repeat(64) })
      .mockResolvedValueOnce({ body: 'Dear me' })
    expect(await openLetter('db_1', 'd1', now)).toMatchObject({ state: 'open', body: 'Dear me', openedAt: now })
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { decisionId: 'd1', openedAt: null }, data: { openedAt: now } })

    mocks.updateMany.mockClear()
    mocks.findFirst
      .mockResolvedValueOnce({ opensAt: day('2027-03-01'), openedAt: day('2027-03-02'), sha256: 'a'.repeat(64) })
      .mockResolvedValueOnce({ body: 'Dear me' })
    expect(await openLetter('db_1', 'd1', now)).toMatchObject({ state: 'open', openedAt: day('2027-03-02') })
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
})
