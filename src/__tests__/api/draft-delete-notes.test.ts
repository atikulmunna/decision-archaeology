// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), remove: vi.fn(), updateMany: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1', tier: 'FREE' }) }))
vi.mock('@/lib/catalog-db', () => ({ getMaxCatalogNumber: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    decisionRecord: { findFirst: mocks.findFirst, delete: mocks.remove },
    fieldNote: { updateMany: mocks.updateMany },
    $transaction: async (writes: Promise<unknown>[]) => Promise.all(writes),
  },
}))

import { DELETE } from '@/app/api/decisions/[id]/route'

describe('DELETE /api/decisions/[id] for a promoted draft', () => {
  it('leaves the note it came from free-standing and no longer marked as where a decision started', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'dr1', userId: 'db_1', isDraft: true, isLocked: false, isImported: false, lockedAt: null, createdAt: new Date() })
    mocks.updateMany.mockResolvedValue({ count: 1 })
    mocks.remove.mockResolvedValue({ id: 'dr1' })
    const res = await DELETE(new NextRequest('http://localhost/api/decisions/dr1', { method: 'DELETE' }), { params: Promise.resolve({ id: 'dr1' }) })
    expect(res.status).toBe(200)
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { decisionId: 'dr1' }, data: { promoted: false } })
    expect(mocks.remove).toHaveBeenCalledWith({ where: { id: 'dr1' } })
  })
})
