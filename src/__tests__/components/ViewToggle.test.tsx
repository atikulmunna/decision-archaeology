import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ViewToggle } from '@/components/decisions/ViewToggle'

describe('ViewToggle', () => {
  it('switches with the arrow keys and keeps one tab focusable', async () => {
    const onChange = vi.fn()
    render(<ViewToggle view="then" onChange={onChange} />)
    expect(screen.getByRole('tablist', { name: 'Decision view' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Then' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'Now' })).toHaveAttribute('tabindex', '-1')
    screen.getByRole('tab', { name: 'Then' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('now')
    expect(screen.getByRole('tab', { name: 'Then' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-controls', 'decision-view-now')
  })

  it('switches on click', async () => {
    const onChange = vi.fn()
    render(<ViewToggle view="now" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Then' }))
    expect(onChange).toHaveBeenCalledWith('then')
  })
})
