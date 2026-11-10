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

})
