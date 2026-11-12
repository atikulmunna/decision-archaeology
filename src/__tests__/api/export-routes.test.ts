// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), findMany: vi.fn() }))

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: async () => ({ id: 'db_1' }) },
    decisionRecord: { findFirst: mocks.findFirst, findMany: mocks.findMany },
  },
}))

import { GET as exportOne } from '@/app/api/decisions/[id]/export/route'
import { GET as exportAll } from '@/app/api/export/route'

describe('export routes', () => {
  it('load forecasts in position order, so exported v2 seals carry them', async () => {
    mocks.findFirst.mockResolvedValue(null)
    mocks.findMany.mockResolvedValue([])
    await exportOne(new NextRequest('http://localhost/api/decisions/d1/export?format=json'), { params: Promise.resolve({ id: 'd1' }) })
    await exportAll(new NextRequest('http://localhost/api/export?format=json'))
    expect(mocks.findFirst.mock.calls[0][0].include.forecasts).toEqual({ orderBy: { position: 'asc' } })
    expect(mocks.findMany.mock.calls[0][0].include.forecasts).toEqual({ orderBy: { position: 'asc' } })
  })
})
