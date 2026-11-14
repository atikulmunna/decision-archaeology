import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

let userId: string | null = null
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId }) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => '/' }))

import Home from '@/app/page'
import { GITHUB_URL } from '@/lib/site'

describe('landing page', () => {
  it('leads with the tour, then the demo, for visitors', async () => {
    userId = null
    render(await Home())
    expect(screen.getByRole('link', { name: 'Take the 60-second tour' })).toHaveAttribute('href', '/demo?tour=1')
    expect(screen.getByRole('link', { name: 'Explore the demo' })).toHaveAttribute('href', '/demo')
    expect(screen.getAllByRole('link', { name: 'Start your archive' })[0]).toHaveAttribute('href', '/sign-up')
    expect(screen.queryByRole('link', { name: 'See the strata' })).toBeNull()
    expect(screen.getByRole('link', { name: /Accept the senior role at Northwind\?/ })).toHaveAttribute(
      'href',
      '/demo/decisions/demo-0007'
    )
  })

  it('shows the three moments, each opening the demo', async () => {
    userId = null
    render(await Home())
    expect(screen.getByRole('heading', { name: 'Three moments' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Verify a seal' })).toHaveAttribute('href', '/demo/decisions/demo-0007?view=then')
    expect(screen.getByRole('link', { name: 'Compare Then and Now' })).toHaveAttribute(
      'href',
      '/demo/decisions/demo-0007?view=now'
    )
    expect(screen.getByRole('link', { name: 'Dig through the strata' })).toHaveAttribute('href', '/demo?view=strata')
    expect(screen.queryByText('What is in the archive')).toBeNull()
  })

  it('names the other features in one line that leads to the case study', async () => {
    userId = null
    render(await Home())
    const link = screen.getByRole('link', { name: 'See how it works' })
    expect(link).toHaveAttribute('href', '/how-it-works')
    const line = link.closest('p')
    expect(line).toHaveTextContent(/forecasts/i)
    expect(line).toHaveTextContent(/field notes/i)
    expect(line).toHaveTextContent(/Devil's Advocate/)
    expect(line).toHaveTextContent(/letters/i)
  })

  it('links the case study and the source from the footer', async () => {
    userId = null
    render(await Home())
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'How it works' })).toHaveAttribute('href', '/how-it-works')
    expect(within(footer).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', GITHUB_URL)
  })

  it('keeps the archive one click away for signed-in users', async () => {
    userId = 'user_123'
    render(await Home())
    expect(screen.getByRole('link', { name: 'Take the 60-second tour' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open archive' })).toHaveAttribute('href', '/decisions')
  })
})
