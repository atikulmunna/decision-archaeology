import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({ shareFindFirst: vi.fn(), userFindUnique: vi.fn(), userFindMany: vi.fn() }))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_collab' }) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, findMany: mocks.userFindMany },
    collaboratorShare: { findFirst: mocks.shareFindFirst },
  },
}))

import SharedDecisionPage from '@/app/(dashboard)/shared/[shareId]/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'

describe('shared decision page', () => {
  it('shows the seal, derives the lock, and offers no tamper test', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    // isLocked was never persisted, but the edit window closed long ago.
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: { ...decision, isLocked: false, lockedAt: null },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(markup).toContain('aria-label="Sealed, fingerprint')
    expect(markup).toContain('Verify seal')
    expect(markup).not.toContain('Provisional')
    expect(markup).not.toContain('Try changing a word')
  })

  it('shows every sealed field openly, so nothing is reachable only through the seal data', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: {
        ...decision,
        values: 'Growth over comfort, and keeping options open.',
        customTags: ['northwind', 'growth'],
        predictedTimeframe: new Date('2026-08-15T12:00:00.000Z'),
      },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(markup).toContain('Growth over comfort, and keeping options open.')
    expect(markup).toContain('northwind, growth')
    expect(markup).toContain('By Aug 15, 2026')
    // The time lock is a lock; "sealed" belongs to the fingerprint, which a record may not have.
    expect(markup).toContain('Locked record')
    expect(markup).not.toContain('Sealed record')
  })

  it('calls a record still inside its edit window a record, without the lock icon', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: { ...decision, isLocked: false, lockedAt: null, createdAt: new Date() },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(markup).toContain('>Record<')
    expect(markup).not.toContain('Locked record')
    expect(markup).toContain('Provisional')
  })

  it('dates the record in UTC, whatever zone the server runs in', async () => {
    const originalTz = process.env.TZ
    // Noon UTC is already midnight of the next day in New Zealand.
    process.env.TZ = 'Pacific/Auckland'
    try {
      const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
      mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
      mocks.shareFindFirst.mockResolvedValue({ id: 'share_1', decision, owner: { displayName: 'Rowan' }, comments: [] })
      const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
      expect(markup).toContain('August 15, 2025')
      expect(markup).not.toContain('August 16, 2025')
    } finally {
      process.env.TZ = originalTz
    }
  })
})
