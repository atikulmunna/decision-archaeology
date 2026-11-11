import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({ getDecision: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/decisions/d1',
}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1' }) }))
vi.mock('@/lib/decisions', () => ({ getDecision: mocks.getDecision }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    collaboratorShare: { findMany: async () => [] },
    user: { findMany: async () => [] },
  },
}))

import DecisionDetailPage from '@/app/(dashboard)/decisions/[id]/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { getDemoAssumptionReviews, getDemoDecision } from '@/lib/demo/queries'

const selectedTab = (markup: string) =>
  markup.match(/<button[^>]*id="decision-tab-(then|now)"[^>]*aria-selected="true"/)?.[1] ??
  markup.match(/<button[^>]*aria-selected="true"[^>]*id="decision-tab-(then|now)"/)?.[1]

function ownerRecord() {
  const id = demoDecisionIdForKey('northwind-offer')
  // One saved verdict: the team held up; the hours are not reviewed yet.
  return { ...getDemoDecision(id)!, assumptionReviews: getDemoAssumptionReviews(id).slice(0, 1) }
}

describe('owner decision page', () => {
  it('renders saved verdicts on the server so they survive a reload', async () => {
    mocks.getDecision.mockResolvedValue(ownerRecord())
    const markup = renderToStaticMarkup(
      await DecisionDetailPage({ params: Promise.resolve({ id: 'd1' }), searchParams: Promise.resolve({}) })
    )
    expect(selectedTab(markup)).toBe('now')
    expect(markup).toContain('1 of 2 assumptions held up')
    expect(markup).toContain('The team was the whole bet, and it was right.')
  })

  it('opens the view named in the URL', async () => {
    mocks.getDecision.mockResolvedValue(ownerRecord())
    const markup = renderToStaticMarkup(
      await DecisionDetailPage({ params: Promise.resolve({ id: 'd1' }), searchParams: Promise.resolve({ view: 'then' }) })
    )
    expect(selectedTab(markup)).toBe('then')
    expect(markup).toMatch(/id="decision-view-now"[^>]*hidden/)
  })

  it('falls back to the default view for an unknown value', async () => {
    mocks.getDecision.mockResolvedValue(ownerRecord())
    const markup = renderToStaticMarkup(
      await DecisionDetailPage({ params: Promise.resolve({ id: 'd1' }), searchParams: Promise.resolve({ view: 'sideways' }) })
    )
    expect(selectedTab(markup)).toBe('now')
  })
})
