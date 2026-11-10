import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DecisionPageBar } from '@/components/decisions/DecisionPageBar'

describe('DecisionPageBar', () => {
  it('shows export links for an owner record', () => {
    render(<DecisionPageBar backHref="/decisions" exportId="d1" />)
    expect(screen.getByRole('link', { name: /json/i })).toHaveAttribute('href', '/api/decisions/d1/export?format=json')
    expect(screen.getByRole('link', { name: /markdown/i })).toHaveAttribute('href', '/api/decisions/d1/export?format=markdown')
    expect(screen.getByRole('link', { name: /archive/i })).toHaveAttribute('href', '/decisions')
  })

  it('shows only the back link without an export id', () => {
    render(<DecisionPageBar backHref="/demo" />)
    expect(screen.queryByRole('link', { name: /json/i })).toBeNull()
    expect(screen.getByRole('link', { name: /archive/i })).toHaveAttribute('href', '/demo')
  })
})
