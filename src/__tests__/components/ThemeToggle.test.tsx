import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/shell/ThemeToggle'

afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.theme
})

describe('ThemeToggle', () => {
  it('cycles the theme, updating the label, data-theme and cookie', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    )
    render(<ThemeToggle initialPreference="system" />)
    const button = screen.getByRole('button', { name: 'Theme: System' })

    await userEvent.click(button)
    expect(screen.getByRole('button', { name: 'Theme: Light' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.cookie).toContain('da-theme=light')

    await userEvent.click(button)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.cookie).toContain('da-theme=dark')

    await userEvent.click(button)
    expect(screen.getByRole('button', { name: 'Theme: System' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
