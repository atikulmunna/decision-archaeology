import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('next/navigation', () => ({ usePathname: () => '/demo' }))
vi.mock('@clerk/nextjs', () => ({ UserButton: () => <span data-testid="user-button" /> }))

import { Masthead } from '@/components/shell/Masthead'
import { DEMO_NAV_LINKS } from '@/lib/routes'

describe('Masthead', () => {
  it('renders the demo masthead without a user button', async () => {
    render(
      await Masthead({
        links: DEMO_NAV_LINKS,
        homeHref: '/demo',
        cta: { href: '/sign-up', label: 'Start your archive' },
        showUserButton: false,
      })
    )
    expect(screen.queryByTestId('user-button')).toBeNull()
    expect(screen.getByRole('link', { name: 'Decision Archaeology' })).toHaveAttribute('href', '/demo')
    expect(screen.getAllByRole('link', { name: 'Start your archive' })[0]).toHaveAttribute('href', '/sign-up')
  })

  it('keeps the app masthead defaults', async () => {
    render(await Masthead({}))
    expect(screen.getByTestId('user-button')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Decision Archaeology' })).toHaveAttribute('href', '/decisions')
    expect(screen.getAllByRole('link', { name: 'Log decision' })[0]).toHaveAttribute('href', '/decisions/new')
  })
})
