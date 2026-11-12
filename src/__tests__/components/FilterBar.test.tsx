import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const nav = vi.hoisted(() => ({ replace: vi.fn(), query: '' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo',
  useSearchParams: () => new URLSearchParams(nav.query),
}))

import { FilterBar } from '@/components/decisions/FilterBar'

afterEach(() => {
  nav.replace.mockReset()
})

describe('FilterBar', () => {
  it('clears the filters but stays in the strata view and its year', async () => {
    nav.query = 'view=strata&year=2025&domain=HEALTH&page=2'
    render(<FilterBar />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(nav.replace).toHaveBeenCalledWith('/demo?view=strata&year=2025')
  })

  it('clears back to the plain archive from the list', async () => {
    nav.query = 'domain=HEALTH'
    render(<FilterBar />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(nav.replace).toHaveBeenCalledWith('/demo')
  })
})
