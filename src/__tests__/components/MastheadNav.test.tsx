import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({ usePathname: () => '/calibration' }))

import { MastheadNav } from '@/components/shell/MastheadNav'

function openMenu() {
  const toggle = screen.getByRole('button', { name: 'Menu' })
  return { toggle, panel: () => document.getElementById(toggle.getAttribute('aria-controls')!)! }
}

describe('MastheadNav', () => {
  it('marks the active link', () => {
    render(<MastheadNav />)
    expect(screen.getAllByRole('link', { name: 'Calibration' })[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link', { name: 'Archive' })[0]).not.toHaveAttribute('aria-current')
  })

  it('opens and closes the mobile menu accessibly', async () => {
    render(<MastheadNav />)
    const { toggle, panel } = openMenu()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel()).toBeVisible()
    expect(within(panel()).getAllByRole('link')[0]).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('closes the mobile menu when a link is chosen', async () => {
    render(<MastheadNav />)
    const { toggle, panel } = openMenu()
    await userEvent.click(toggle)
    await userEvent.click(within(panel()).getByRole('link', { name: 'Archive' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
