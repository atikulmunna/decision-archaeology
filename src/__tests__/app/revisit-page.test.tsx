import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const captured = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }))
const mocks = vi.hoisted(() => ({ getDecision: vi.fn(), openLetter: vi.fn(), getPendingCheckIn: vi.fn() }))

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
vi.mock('@/lib/letters', () => ({ openLetter: mocks.openLetter }))
vi.mock('@/lib/revisit-db', () => ({ getPendingCheckIn: mocks.getPendingCheckIn }))
vi.mock('@/components/revisit/RevisitFlow', () => ({
  RevisitFlow: (props: Record<string, unknown>) => {
    captured.props = props
    return null
  },
}))

import RevisitPage from '@/app/(dashboard)/decisions/[id]/revisit/page'
import { getDemoDecision } from '@/lib/demo/queries'
import { demoDecisionIdForKey } from '@/lib/demo/archive'

const containsFunction = (value: unknown): boolean =>
  typeof value === 'function' || (value !== null && typeof value === 'object' && !(value instanceof Date) && Object.values(value as object).some(containsFunction))

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
  captured.props = null
})

describe('the revisit page', () => {
  it('is owner only and 404s for drafts and other users', async () => {
    mocks.getDecision.mockResolvedValue(null)
    await expect(RevisitPage({ params: Promise.resolve({ id: 'theirs' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.getDecision).toHaveBeenCalledWith('db_1', 'theirs')
    expect(mocks.openLetter).not.toHaveBeenCalled()
  })

  it('opens the letter through openLetter and passes no functions to the client', async () => {
    const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
    mocks.getDecision.mockResolvedValue({ ...decision, assumptionReviews: [] })
    mocks.openLetter.mockResolvedValue({ state: 'none' })
    mocks.getPendingCheckIn.mockResolvedValue(null)
    renderToStaticMarkup(await RevisitPage({ params: Promise.resolve({ id: decision.id }) }))
    expect(mocks.openLetter).toHaveBeenCalledWith('db_1', decision.id, expect.any(Date))
    expect(captured.props!.mode).toBe('owner')
    expect((captured.props!.data as { backHref: string }).backHref).toBe(`/decisions/${decision.id}`)
    expect(containsFunction(captured.props)).toBe(false)
  })
})
