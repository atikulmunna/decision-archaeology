import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthLayout } from '@/components/shell/AuthLayout'

describe('AuthLayout', () => {
  it('renders the heading and the form slot', () => {
    render(
      <AuthLayout heading="Start your archive.">
        <form aria-label="sign up" />
      </AuthLayout>
    )
    expect(screen.getByRole('heading', { name: 'Start your archive.' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'sign up' })).toBeInTheDocument()
    expect(screen.getByText('DA-0042')).toBeInTheDocument()
  })
})
