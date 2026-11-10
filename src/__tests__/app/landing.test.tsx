import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

let userId: string | null = null
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId }) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }), usePathname: () => '/' }))

import Home from '@/app/page'

describe('landing page', () => {
  it('leads with the demo for visitors', async () => {
    userId = null
    render(await Home())
    expect(screen.getByRole('link', { name: 'Explore the demo' })).toHaveAttribute('href', '/demo')
    expect(screen.getAllByRole('link', { name: 'Start your archive' })[0]).toHaveAttribute('href', '/sign-up')
    expect(screen.getByRole('link', { name: /Accept the senior role at Northwind\?/ })).toHaveAttribute(
      'href',
      '/demo/decisions/demo-0007'
    )
  })

  it('keeps the archive one click away for signed-in users', async () => {
    userId = 'user_123'
    render(await Home())
    expect(screen.getByRole('link', { name: 'Explore the demo' })).toHaveAttribute('href', '/demo')
    expect(screen.getByRole('link', { name: 'Open archive' })).toHaveAttribute('href', '/decisions')
  })
})
