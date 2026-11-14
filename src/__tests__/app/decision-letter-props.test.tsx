import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// DecisionDetail is a client component: its props are serialized into the page. Capture them.
const captured = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }))
const mocks = vi.hoisted(() => ({ getDecision: vi.fn(), getRevisitSummary: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1' }) }))
vi.mock('@/lib/decisions', () => ({ getDecision: mocks.getDecision }))
vi.mock('@/lib/revisit-db', () => ({ getRevisitSummary: mocks.getRevisitSummary }))
vi.mock('@/lib/prisma', () => ({ prisma: { collaboratorShare: { findMany: async () => [] }, user: { findMany: async () => [] } } }))
vi.mock('@/components/decisions/DecisionDetail', () => ({
  DecisionDetail: (props: Record<string, unknown>) => {
    captured.props = props
    return null
  },
}))

import DecisionDetailPage from '@/app/(dashboard)/decisions/[id]/page'
import { getDemoDecision } from '@/lib/demo/queries'
import { demoDecisionIdForKey } from '@/lib/demo/archive'

const containsKey = (value: unknown, key: string): boolean =>
  value !== null && typeof value === 'object' && (key in (value as object) || Object.values(value as object).some((inner) => containsKey(inner, key)))
const containsFunction = (value: unknown): boolean =>
  typeof value === 'function' || (value !== null && typeof value === 'object' && !(value instanceof Date) && Object.values(value as object).some(containsFunction))

describe('decision page letter props', () => {
  it('passes no letter body before the owner opens it, and no functions', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.getDecision.mockResolvedValue({ ...decision, assumptionReviews: [], letter: { opensAt: new Date('2026-01-01T00:00:00.000Z'), sha256: 'a'.repeat(64) } })
    mocks.getRevisitSummary.mockResolvedValue({
      letter: { state: 'ready', opensAt: new Date('2026-01-01T00:00:00.000Z') },
      due: true,
      lastRevisitedAt: null,
      nextCheckIn: null,
      revisitHref: `/decisions/${decision.id}/revisit`,
    })
    renderToStaticMarkup(await DecisionDetailPage({ params: Promise.resolve({ id: decision.id }), searchParams: Promise.resolve({}) }))
    expect(mocks.getRevisitSummary).toHaveBeenCalledWith('db_1', decision.id, expect.any(Date), `/decisions/${decision.id}/revisit`)
    expect((captured.props!.revisit as { letter: { state: string } }).letter.state).toBe('ready')
    // Field notes have a body of their own; the letter objects must not.
    expect(Object.keys((captured.props!.revisit as { letter: object }).letter).sort()).toEqual(['opensAt', 'state'])
    expect(Object.keys((captured.props!.decision as { letter: object }).letter).sort()).toEqual(['opensAt', 'sha256'])
    expect(containsKey(captured.props!.revisit, 'body')).toBe(false)
    expect(containsFunction(captured.props)).toBe(false)
  })
})
