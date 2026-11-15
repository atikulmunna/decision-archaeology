import { describe, expect, it, vi } from 'vitest'
import { isValidElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'

const captured = vi.hoisted(() => ({} as Record<string, Record<string, unknown>>))

// Clerk's components need a live Clerk; capture their props and show the failure branch.
vi.mock('@clerk/nextjs', () => ({
  SignIn: (props: Record<string, unknown>) => {
    captured.signIn = props
    return null
  },
  SignUp: (props: Record<string, unknown>) => {
    captured.signUp = props
    return null
  },
  ClerkFailed: ({ children }: { children: ReactNode }) => children,
}))

import SignInPage from '@/app/sign-in/[[...sign-in]]/page'
import SignUpPage from '@/app/sign-up/[[...sign-up]]/page'
import { AuthCardPlaceholder } from '@/components/shell/AuthCardPlaceholder'

function expectPlaceholder(fallback: unknown, mode: string) {
  expect(isValidElement(fallback)).toBe(true)
  const element = fallback as { type: unknown; props: { mode: string } }
  expect(element.type).toBe(AuthCardPlaceholder)
  expect(element.props.mode).toBe(mode)
}

describe('the sign-in and sign-up pages', () => {
  it('show a placeholder card while Clerk loads', () => {
    render(<SignInPage />)
    render(<SignUpPage />)
    expectPlaceholder(captured.signIn.fallback, 'sign-in')
    expectPlaceholder(captured.signUp.fallback, 'sign-up')
  })

  it('shows a reload message when Clerk fails', () => {
    const { container } = render(<SignInPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Sign-in could not load.')
    expect(alert).toHaveAttribute('data-auth-failed')
    // The column is the group the placeholder watches, so the notice can hide it.
    expect(container.querySelector('.group')).toContainElement(alert)
    expect(screen.getByText(/Sign-in could not load\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reload the page' })).toHaveAttribute('href', '/sign-in')
  })

  it('shows the sign-up reload message on the sign-up page', () => {
    render(<SignUpPage />)
    expect(screen.getByText(/Sign-up could not load\./)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reload the page' })).toHaveAttribute('href', '/sign-up')
  })
})
