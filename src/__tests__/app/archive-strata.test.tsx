import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({
  getDecisions: vi.fn(),
  getDraftDecisions: vi.fn(),
  getStrataDecisions: vi.fn(),
  count: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/decisions',
  useSearchParams: () => new URLSearchParams('view=strata&domain=CAREER'),
}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/db-user', () => ({ getOrCreateDbUser: async () => ({ id: 'db_1', tier: 'FREE' }) }))
vi.mock('@/lib/decisions', () => ({
  getDecisions: mocks.getDecisions,
  getDraftDecisions: mocks.getDraftDecisions,
  getStrataDecisions: mocks.getStrataDecisions,
  STRATA_MAX: 500,
}))
vi.mock('@/lib/prisma', () => ({ prisma: { decisionRecord: { count: mocks.count } } }))

import DecisionsPage from '@/app/(dashboard)/decisions/page'

describe('owner archive in strata view', () => {
  it('draws the filtered decisions from the strata loader, not the paged list', async () => {
    mocks.getDraftDecisions.mockResolvedValue([])
    mocks.count.mockResolvedValue(2)
    mocks.getStrataDecisions.mockResolvedValue({
      total: 2,
      records: [
        { id: 'd1', catalogNumber: 1, title: 'Join the platform team', domainTag: 'CAREER', createdAt: new Date('2025-06-01T00:00:00.000Z'), outcomes: [] },
        { id: 'd2', catalogNumber: 2, title: 'Decline the manager track', domainTag: 'CAREER', createdAt: new Date('2026-03-01T00:00:00.000Z'), outcomes: [] },
      ],
    })

    const markup = renderToStaticMarkup(
      await DecisionsPage({ searchParams: Promise.resolve({ view: 'strata', domain: 'CAREER' }) })
    )

    expect(mocks.getStrataDecisions).toHaveBeenCalledWith('db_1', expect.objectContaining({ domain: 'CAREER' }))
    expect(mocks.getDecisions).not.toHaveBeenCalled()
    expect(markup.match(/aria-label="DA-000[12], Career/g)).toHaveLength(2)
    expect(markup).toContain('href="/decisions/d1"')
    expect(markup).toContain('href="?domain=CAREER"')
  })
})
