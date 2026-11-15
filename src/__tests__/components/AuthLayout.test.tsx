import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const hints = vi.hoisted(() => ({ preconnect: vi.fn() }))
vi.mock('react-dom', async (importOriginal) => ({ ...(await importOriginal<typeof import('react-dom')>()), preconnect: hints.preconnect }))

import { AuthLayout } from '@/components/shell/AuthLayout'

const KEY = `pk_test_${Buffer.from('faithful-lynx-85.clerk.accounts.dev$').toString('base64')}`

afterEach(() => {
  vi.unstubAllEnvs()
  hints.preconnect.mockClear()
})

describe('AuthLayout', () => {
  it('renders the heading and the form slot', () => {
    render(
      <AuthLayout heading="Start your archive.">
        <form aria-label="sign up" />
      </AuthLayout>
    )
    expect(screen.getByRole('heading', { name: 'Start your archive.' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'sign up' })).toBeInTheDocument()
    expect(screen.getByText('DA-0007')).toBeInTheDocument()
  })

  it("connects to Clerk's servers early so the card's code arrives sooner", () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', KEY)
    render(<AuthLayout heading="Sign in.">{null}</AuthLayout>)
    expect(hints.preconnect).toHaveBeenCalledWith('https://faithful-lynx-85.clerk.accounts.dev', { crossOrigin: 'anonymous' })
    expect(hints.preconnect).toHaveBeenCalledWith('https://img.clerk.com')
  })

  it('skips the Clerk hint when the key is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', '')
    render(<AuthLayout heading="Sign in.">{null}</AuthLayout>)
    expect(hints.preconnect).not.toHaveBeenCalledWith(expect.stringContaining('clerk.accounts.dev'), expect.anything())
  })
})
