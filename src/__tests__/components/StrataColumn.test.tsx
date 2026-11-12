import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrataColumn } from '@/components/decisions/StrataColumn'
import { DEMO_NOW } from '@/lib/demo/clock'
import { DEMO_ROUTES } from '@/lib/routes'
import { layoutStrata, type StrataRecord } from '@/lib/strata'

const records: StrataRecord[] = [
  {
    id: 'd7',
    catalogNumber: 7,
    title: 'Accept the senior role at Northwind?',
    domainTag: 'CAREER',
    createdAt: new Date('2025-08-15T12:00:00.000Z'),
    outcomes: [{ createdAt: new Date('2026-04-24T12:00:00.000Z'), outcomeRating: 'AS_EXPECTED' }],
  },
  { id: 'd9', catalogNumber: 9, title: 'Start seeing a therapist?', domainTag: 'HEALTH', createdAt: new Date('2025-10-01T12:00:00.000Z'), outcomes: [] },
  { id: 'd14', catalogNumber: 14, title: 'Move savings into index funds?', domainTag: 'FINANCE', createdAt: new Date('2026-03-01T12:00:00.000Z'), outcomes: [] },
]
const allTime = layoutStrata(records, { year: null, now: DEMO_NOW })

const specimens = () => screen.getAllByRole('link', { name: /^DA-/ })

describe('StrataColumn', () => {
  it('draws every decision as a named link, oldest first', () => {
    render(<StrataColumn layout={allTime} routes={DEMO_ROUTES} pageParams="q=move" cappedTotal={null} />)
    const links = specimens()
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/demo/decisions/d7', '/demo/decisions/d9', '/demo/decisions/d14'])
    expect(links[0]).toHaveAccessibleName('DA-0007, Career, Accept the senior role at Northwind?, sealed Aug 15, 2025, latest outcome As expected')
    expect(links[1]).toHaveAccessibleName('DA-0009, Health, Start seeing a therapist?, sealed Oct 1, 2025, no outcome yet')
    expect(screen.getByRole('group', { name: allTime.summary })).toBeInTheDocument()
    expect(links[0].querySelector('[data-specimen]')?.getAttribute('class')).toContain('motion-safe:animate-')
  })

  it('shows a card on hover and on focus, and hides it on Escape', async () => {
    render(<StrataColumn layout={allTime} routes={DEMO_ROUTES} pageParams="" cappedTotal={null} />)
    const [northwind, therapy] = specimens()
    await userEvent.hover(northwind)
    expect(screen.getByText('Accept the senior role at Northwind?')).toBeInTheDocument()
    expect(screen.getByText('Sealed Aug 15, 2025')).toBeInTheDocument()
    expect(screen.getByText('Latest outcome: As expected')).toBeInTheDocument()
    fireEvent.focus(therapy)
    expect(screen.getByText('Start seeing a therapist?')).toBeInTheDocument()
    expect(screen.getByText('No outcome yet')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('Start seeing a therapist?')).toBeNull()
  })

  it('offers year chips that keep the filters and mark the selected year', () => {
    const { unmount } = render(<StrataColumn layout={allTime} routes={DEMO_ROUTES} pageParams="q=move" cappedTotal={null} />)
    const all = screen.getByRole('link', { name: 'All time' })
    expect(all).toHaveAttribute('href', '?q=move&view=strata')
    expect(all).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: '2025' })).toHaveAttribute('href', '?q=move&view=strata&year=2025')
    expect(screen.getByRole('link', { name: '2026' })).not.toHaveAttribute('aria-current')
    unmount()
    render(<StrataColumn layout={layoutStrata(records, { year: 2025, now: DEMO_NOW })} routes={DEMO_ROUTES} pageParams="q=move" cappedTotal={null} />)
    expect(screen.getByRole('link', { name: '2025' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'All time' })).not.toHaveAttribute('aria-current')
  })

  it('says when a year has nothing and when the strata are capped', () => {
    const { unmount } = render(
      <StrataColumn layout={layoutStrata(records, { year: 2024, now: DEMO_NOW })} routes={DEMO_ROUTES} pageParams="" cappedTotal={null} />
    )
    expect(screen.getByText('Nothing sealed in 2024 matches these filters.')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-stratum-band]')).toHaveLength(12)
    unmount()
    render(<StrataColumn layout={allTime} routes={DEMO_ROUTES} pageParams="" cappedTotal={731} />)
    expect(screen.getByText('Showing the newest 500 of 731 decisions.')).toBeInTheDocument()
    expect(screen.getByText(allTime.summary)).toBeInTheDocument()
  })

  it('keeps the settle animation within a fixed budget however many decisions there are', () => {
    const domains = ['CAREER', 'FINANCE', 'HEALTH', 'RELATIONSHIPS', 'CREATIVE', 'OTHER'] as const
    const many: StrataRecord[] = Array.from({ length: 120 }, (_, i) => ({
      id: 'm' + String(i),
      catalogNumber: i + 1,
      title: 'Decision ' + String(i),
      domainTag: domains[i % 6],
      createdAt: new Date(Date.parse('2025-01-05T00:00:00.000Z') + i * 5 * 24 * 3600 * 1000),
      outcomes: [],
    }))
    const { container } = render(
      <StrataColumn layout={layoutStrata(many, { year: null, now: DEMO_NOW })} routes={DEMO_ROUTES} pageParams="" cappedTotal={null} />
    )
    const delays = [...container.querySelectorAll('[data-stratum-band], [data-specimen]')].map((element) =>
      Number.parseFloat((element as SVGElement).style.animationDelay)
    )
    expect(delays.length).toBeGreaterThan(120)
    expect(Math.max(...delays)).toBeLessThanOrEqual(300)
  })
})
