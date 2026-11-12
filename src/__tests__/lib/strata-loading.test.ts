import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), outcomeFindMany: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    decisionRecord: { findMany: mocks.findMany, count: mocks.count },
    outcomeUpdate: { findMany: mocks.outcomeFindMany },
  },
}))

import { getStrataDecisions, STRATA_MAX } from '@/lib/decisions'

const decision = (id: string, createdAt: string) => ({
  id,
  userId: 'db_1',
  catalogNumber: Number(id.slice(1)),
  title: `Decision ${id}`,
  domainTag: 'CAREER' as const,
  createdAt: new Date(createdAt),
  isLocked: true,
  lockedAt: new Date(createdAt),
  isImported: false,
  isDraft: false,
  outcomes: [],
})

describe('getStrataDecisions', () => {
  it('loads every matching decision up to the cap, with all its outcomes, oldest first', async () => {
    mocks.findMany.mockResolvedValue([decision('d2', '2026-03-01T00:00:00.000Z'), decision('d1', '2025-06-01T00:00:00.000Z')])
    mocks.count.mockResolvedValue(2)
    mocks.outcomeFindMany.mockResolvedValue([
      { decisionId: 'd1', createdAt: new Date('2025-09-01T00:00:00.000Z'), outcomeRating: 'AS_EXPECTED' },
      { decisionId: 'd1', createdAt: new Date('2026-01-01T00:00:00.000Z'), outcomeRating: 'MUCH_BETTER' },
    ])

    const result = await getStrataDecisions('db_1', {})

    expect(STRATA_MAX).toBe(500)
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 500 }))
    expect(mocks.outcomeFindMany).toHaveBeenCalledWith({
      where: { decisionId: { in: ['d2', 'd1'] } },
      orderBy: { createdAt: 'asc' },
      select: { decisionId: true, createdAt: true, outcomeRating: true },
    })
    expect(result).toEqual({
      total: 2,
      records: [
        {
          id: 'd1',
          catalogNumber: 1,
          title: 'Decision d1',
          domainTag: 'CAREER',
          createdAt: new Date('2025-06-01T00:00:00.000Z'),
          outcomes: [
            { createdAt: new Date('2025-09-01T00:00:00.000Z'), outcomeRating: 'AS_EXPECTED' },
            { createdAt: new Date('2026-01-01T00:00:00.000Z'), outcomeRating: 'MUCH_BETTER' },
          ],
        },
        {
          id: 'd2',
          catalogNumber: 2,
          title: 'Decision d2',
          domainTag: 'CAREER',
          createdAt: new Date('2026-03-01T00:00:00.000Z'),
          outcomes: [],
        },
      ],
    })
  })
})
