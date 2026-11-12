import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { SealRecord } from '@/lib/seal'

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
// Print what the seal panel would hash, so the test can read the payload's version and forecasts.
vi.mock('@/components/seal/SealPanel', async () => {
  const { buildSealPayload } = await import('@/lib/seal')
  return {
    SealPanel: ({ record }: { record: SealRecord }) => {
      const payload = JSON.parse(buildSealPayload(record))
      return (
        <p>
          {`payload ${payload.seal} with ${payload.forecasts?.length ?? 0} forecasts`}
        </p>
      )
    },
  }
})

import SharedDecisionPage from '@/app/(dashboard)/shared/[shareId]/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'

describe('shared decision page forecasts', () => {
  it('shows the sealed forecasts, verifies them as v2, and never shows a resolution', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: {
        ...decision,
        forecasts: [
          {
            id: 'f1',
            decisionId: decision.id,
            position: 0,
            statement: 'I own the scheduling engine',
            probability: 60,
            resolveBy: new Date('2026-08-15T00:00:00.000Z'),
            resolution: 'HAPPENED',
            resolvedAt: new Date('2026-04-24T00:00:00.000Z'),
            createdAt: decision.createdAt,
            updatedAt: decision.createdAt,
          },
        ],
      },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(mocks.shareFindFirst.mock.calls[0][0].include.decision.include.forecasts).toEqual({ orderBy: { position: 'asc' } })
    expect(markup).toContain('60% that I own the scheduling engine by Aug 15, 2026')
    expect(markup).toContain('payload da-seal-v2 with 1 forecasts')
    expect(markup).not.toContain('Happened')
    expect(markup).not.toContain('Resolved')
  })
})
