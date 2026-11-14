import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/decisions/d7',
}))
vi.mock('@/components/decisions/AttachmentManager', () => ({ AttachmentManager: () => null }))

import { NowView } from '@/components/decisions/NowView'
import { CheckInControl } from '@/components/decisions/CheckInControl'
import { ArchiveView } from '@/components/decisions/ArchiveView'
import { getDemoDecision } from '@/lib/demo/queries'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_NOW } from '@/lib/demo/clock'
import { APP_ROUTES } from '@/lib/routes'
import type { RevisitSummary } from '@/lib/revisit-summary'

const day = (s: string) => new Date(`${s}T00:00:00.000Z`)
const decision = getDemoDecision(demoDecisionIdForKey('northwind-offer'))!
const summary: RevisitSummary = {
  letter: { state: 'none' },
  due: true,
  lastRevisitedAt: day('2026-10-01'),
  nextCheckIn: day('2027-01-15'),
  revisitHref: '/decisions/d7/revisit',
}
const now = (readOnly: boolean, revisit = summary) => (
  <NowView decision={decision} readOnly={readOnly} reviews={[]} onReviewsChange={vi.fn()} now={DEMO_NOW} revisit={revisit} />
)

afterEach(() => vi.restoreAllMocks())

describe('revisit status in Now', () => {
  it('shows Revisit, the due banner, last revisited and next check-in, and the check-in control only for the owner', () => {
    const { unmount } = render(now(false))
    expect(screen.getByRole('link', { name: 'Revisit' })).toHaveAttribute('href', '/decisions/d7/revisit')
    expect(screen.getByText('Time to revisit')).toBeInTheDocument()
    expect(screen.getByText('Last revisited Oct 1, 2026')).toBeInTheDocument()
    expect(screen.getByText('Next check-in Jan 15, 2027')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Schedule a check-in' })).toBeInTheDocument()
    unmount()
    render(now(true, { ...summary, due: false }))
    expect(screen.getByRole('link', { name: 'Revisit' })).toBeInTheDocument()
    expect(screen.queryByText('Time to revisit')).toBeNull()
    expect(screen.queryByRole('group', { name: 'Schedule a check-in' })).toBeNull()
  })
})

describe('CheckInControl', () => {
  it('posts the chosen day and shows the new date', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const { day: chosen } = JSON.parse(String(init!.body))
      return new Response(JSON.stringify({ id: 'c1', scheduledFor: `${chosen}T00:00:00.000Z` }), { status: 201 })
    })
    render(<CheckInControl decisionId="d7" nextCheckIn={null} />)
    await userEvent.click(screen.getByRole('button', { name: '3 months' }))
    expect(fetchSpy).toHaveBeenCalledWith('/api/decisions/d7/reminders', expect.objectContaining({ method: 'POST' }))
    const sent = JSON.parse(String(fetchSpy.mock.calls[0][1]!.body)).day as string
    const label = new Date(`${sent}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    expect(await screen.findByText(`Next check-in ${label}`)).toBeInTheDocument()
  })
})

describe('the archive', () => {
  it('lists up to five decisions due for revisit, owner only', () => {
    const due = Array.from({ length: 6 }, (_, i) => ({ id: `d${i}`, label: `DA-000${i}`, title: `Decision ${i}`, href: `/decisions/d${i}/revisit` }))
    const props = { routes: APP_ROUTES, records: [], total: 0, allCount: 0, page: 1, pageParams: '', hasFilters: false, dueForRevisit: due }
    const owner = renderToStaticMarkup(<ArchiveView mode="owner" {...props} />)
    expect(owner).toContain('Due for revisit')
    expect(owner.match(/\/revisit"/g)).toHaveLength(5)
    expect(renderToStaticMarkup(<ArchiveView mode="demo" {...props} />)).not.toContain('Due for revisit')
  })
})
