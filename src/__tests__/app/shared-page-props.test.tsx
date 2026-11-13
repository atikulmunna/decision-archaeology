import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// SealPanel is a client component: in a real Next render its props are serialized into the page
// a collaborator downloads. Capture exactly what the shared page hands it.
const captured = vi.hoisted(() => ({ props: null as null | { record: Record<string, unknown> } }))
const mocks = vi.hoisted(() => ({ shareFindFirst: vi.fn(), userFindUnique: vi.fn(), userFindMany: vi.fn() }))

vi.mock('@/components/seal/SealPanel', () => ({
  SealPanel: (props: { record: Record<string, unknown> }) => {
    captured.props = props
    return null
  },
}))
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

describe('shared decision page seal props', () => {
  it('sends a collaborator only what verifying the seal needs', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.userFindUnique.mockResolvedValue({ id: 'db_collab' })
    mocks.shareFindFirst.mockResolvedValue({
      id: 'share_1',
      decision: {
        ...decision,
        userId: 'owner-user-id-123',
        attachments: ['decisions/demo-0007/1731300000000-salary-negotiation-notes.pdf'],
        draftStartedAt: new Date('2025-08-15T08:00:00.000Z'),
      },
      owner: { displayName: 'Rowan' },
      comments: [],
    })
    renderToStaticMarkup(await SharedDecisionPage({ params: Promise.resolve({ shareId: 'share_1' }) }))
    expect(Object.keys(captured.props!.record).sort()).toEqual(
      [
        'alternatives',
        'catalogNumber',
        'challengeModel',
        'challengeOutcome',
        'chosenOption',
        'confidenceLevel',
        'context',
        'createdAt',
        'customTags',
        'domainTag',
        'forecasts',
        'isImported',
        'isLocked',
        'predictedOutcome',
        'predictedTimeframe',
        'reasoning',
        'sealHash',
        'sealedAt',
        'summary',
        'title',
        'uncertainties',
        'values',
      ].sort()
    )
    // Forecasts are sealed, so they travel for verification, but never with their resolutions.
    const forecasts = captured.props!.record.forecasts as Array<Record<string, unknown>>
    expect(forecasts).toHaveLength(3)
    for (const forecast of forecasts) {
      expect(Object.keys(forecast).sort()).toEqual(['position', 'probability', 'resolveBy', 'statement'])
    }
  })
})
