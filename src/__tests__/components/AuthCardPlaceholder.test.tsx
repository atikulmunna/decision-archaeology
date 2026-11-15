import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthCardPlaceholder } from '@/components/shell/AuthCardPlaceholder'

describe('AuthCardPlaceholder', () => {
  it('announces that sign-in is loading and shows the real title in the card frame', () => {
    const { container } = render(<AuthCardPlaceholder mode="sign-in" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading sign-in')
    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.getByText('Open your archive.')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toContainElement(screen.getByText('Sign in'))
  })

  it('uses the sign-up copy on the sign-up page', () => {
    render(<AuthCardPlaceholder mode="sign-up" />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading sign-up')
    expect(screen.getByText('Start your archive')).toBeInTheDocument()
  })
})
