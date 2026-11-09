import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StepIndicator } from '@/components/ui/StepIndicator'

describe('Button', () => {
  it('renders a link when given href', () => {
    render(<Button href="/decisions/new">Log decision</Button>)
    expect(screen.getByRole('link', { name: 'Log decision' })).toHaveAttribute('href', '/decisions/new')
  })

  it('disables the button while loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled()
  })

  it('uses the primary tokens', () => {
    render(<Button>Go</Button>)
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button.className).toMatch(/bg-primary/)
    expect(button.className).toMatch(/text-on-primary/)
  })
})

describe('Input', () => {
  it('links an input to its error message', () => {
    render(<Input id="title" label="Title" error="Title is required" />)
    const input = screen.getByLabelText('Title')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'title-error')
    expect(document.getElementById('title-error')).toHaveTextContent('Title is required')
  })
})

describe('StepIndicator', () => {
  it('numbers steps and marks the current one', () => {
    render(<StepIndicator steps={['Basics', 'Reasoning', 'Context']} currentStep={2} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    const current = screen.getByText('Reasoning').closest('li')
    expect(current).toHaveAttribute('aria-current', 'step')
  })
})
