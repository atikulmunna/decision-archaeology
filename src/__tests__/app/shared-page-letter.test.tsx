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
vi.mock('@/components/seal/SealPanel', async () => {
  const { buildSealPayload } = await import('@/lib/seal')
  return { SealPanel: ({ record }: { record: SealRecord }) => <p>{`payload ${JSON.parse(buildSealPayload(record)).seal}`}</p> }
})

import SharedDecisionPage from '@/app/(dashboard)/shared/[shareId]/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoDecision } from '@/lib/demo/queries'

describe('shared decision page letter', () => {
  it('says a letter exists and its day, never its text, and its seal verifies as v4', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: { ...decision, letter: { opensAt: new Date('2027-03-01T00:00:00.000Z'), sha256: 'e'.repeat(64) } },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    const markup = renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(mocks.shareFindFirst.mock.calls[0][0].include.decision.include.letter).toEqual({ select: { opensAt: true, sha256: true } })
    expect(markup).toContain('Its author wrote a letter, sealed until Mar 1, 2027.')
    expect(markup).toContain('payload da-seal-v4')
  })
})
