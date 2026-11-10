import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo',
  useSearchParams: () => new URLSearchParams(),
}))

import { ArchiveView } from '@/components/decisions/ArchiveView'
import { listDemoDecisions } from '@/lib/demo/queries'
import { DEMO_ARCHIVE_LINE } from '@/lib/demo/persona'
import { APP_ROUTES, DEMO_ROUTES } from '@/lib/routes'

describe('ArchiveView', () => {
  it('renders the demo archive without owner controls', () => {
    const { records, total } = listDemoDecisions({ page: 1, limit: 20 })
    render(
      <ArchiveView
        mode="demo"
        routes={DEMO_ROUTES}
        records={records}
        total={total}
        allCount={24}
        page={1}
        pageParams=""
        hasFilters={false}
        intro={DEMO_ARCHIVE_LINE}
      />
    )
    expect(screen.getByText(DEMO_ARCHIVE_LINE)).toBeInTheDocument()
    expect(screen.getByText('Demo archive')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /log decision/i })).toBeNull()
    expect(screen.queryByText('Drafts')).toBeNull()
    expect(screen.queryByText(/toward your first bias report/)).toBeNull()
    expect(screen.queryByText('Export and import')).toBeNull()
    const recordLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.includes('/decisions/'))
    expect(recordLinks).toHaveLength(20)
    recordLinks.forEach((link) => expect(link.getAttribute('href')).toMatch(/^\/demo\/decisions\/demo-\d{4}$/))
  })

  it('keeps the owner archive controls', () => {
    render(
      <ArchiveView
        mode="owner"
        routes={APP_ROUTES}
        records={[]}
        total={0}
        allCount={3}
        page={1}
        pageParams=""
        hasFilters={false}
        drafts={[]}
        canImport={false}
      />
    )
    expect(screen.getAllByRole('link', { name: /log decision/i })[0]).toHaveAttribute('href', '/decisions/new')
    expect(screen.getByText('3 of 10 decisions toward your first bias report')).toBeInTheDocument()
    expect(screen.getByText('Export and import')).toBeInTheDocument()
  })

  it('builds pagination links from the active filters', () => {
    render(
      <ArchiveView mode="demo" routes={DEMO_ROUTES} records={[]} total={45} allCount={45} page={2} pageParams="q=x" hasFilters />
    )
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '?q=x&page=1')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '?q=x&page=3')
  })

  it('builds pagination links when no filters are active', () => {
    render(<ArchiveView mode="demo" routes={DEMO_ROUTES} records={[]} total={45} allCount={45} page={1} pageParams="" hasFilters={false} />)
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '?page=2')
  })
})
