import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import { ReportsListView, type ReportListItem } from '@/components/ai/ReportsListView'
import { APP_ROUTES, DEMO_ROUTES } from '@/lib/routes'

const item: ReportListItem = {
  id: 'demo-report-1',
  createdAt: new Date('2026-11-10T12:00:00Z'),
  status: 'COMPLETE',
  summary: 'Rowan decides boldly and estimates optimistically.',
  decisionCount: 24,
}

describe('ReportsListView', () => {
  it('lists demo reports without generate controls', () => {
    render(<ReportsListView mode="demo" routes={DEMO_ROUTES} reports={[item]} decisionCount={24} />)
    expect(screen.queryByRole('button', { name: /generate/i })).toBeNull()
    expect(screen.queryByText('Not enough history yet')).toBeNull()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/demo/reports/demo-report-1')
    expect(screen.getByText('Demo archive')).toBeInTheDocument()
  })

  it('keeps the owner threshold notice', () => {
    render(<ReportsListView mode="owner" routes={APP_ROUTES} reports={[]} decisionCount={4} />)
    expect(screen.getByText('Not enough history yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /generate/i })).toBeNull()
  })

  it('offers generation to an owner with enough decisions', () => {
    render(<ReportsListView mode="owner" routes={APP_ROUTES} reports={[item]} decisionCount={12} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ai/reports/demo-report-1')
  })
})
