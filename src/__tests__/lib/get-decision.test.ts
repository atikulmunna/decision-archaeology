import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ findFirst: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: { decisionRecord: { findFirst: mocks.findFirst } } }))

import { getDecision } from '@/lib/decisions'

describe('getDecision', () => {
  it('loads forecasts in position order, so the seal panel can hash them', async () => {
    mocks.findFirst.mockResolvedValue(null)
    await getDecision('db_1', 'd1')
    expect(mocks.findFirst.mock.calls[0][0].include.forecasts).toEqual({ orderBy: { position: 'asc' } })
    expect(mocks.findFirst.mock.calls[0][0].include.fieldNotes).toEqual({ orderBy: { createdAt: 'asc' } })
    expect(mocks.findFirst.mock.calls[0][0].include.challengeQuestions).toEqual({ orderBy: { position: 'asc' } })
  })
})
