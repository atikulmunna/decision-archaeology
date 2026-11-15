import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/shell/ThemeToggle'

afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.theme
})

describe('ThemeToggle', () => {
  it('still cycles through every choice when the browser refuses the cookie', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    )
    // Cookies blocked: writes are dropped and reads come back empty.
    Object.defineProperty(document, 'cookie', { configurable: true, get: () => '', set: () => {} })
    try {
      render(<ThemeToggle initialPreference="system" />)
      await userEvent.click(screen.getByRole('button', { name: 'Theme: System' }))
      expect(screen.getByRole('button', { name: 'Theme: Light' })).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Theme: Light' }))
      expect(screen.getByRole('button', { name: 'Theme: Dark' })).toBeInTheDocument()
      expect(document.documentElement.dataset.theme).toBe('dark')
      await userEvent.click(screen.getByRole('button', { name: 'Theme: Dark' }))
      expect(screen.getByRole('button', { name: 'Theme: System' })).toBeInTheDocument()
    } finally {
      delete (document as unknown as Record<string, unknown>).cookie
    }
  })

  it('shows the saved choice even when the page was rendered with an older one', () => {
    // A page prefetched before the reader toggled carries the old preference from the server.
    document.cookie = 'da-theme=dark; path=/'
    render(<ThemeToggle initialPreference="system" />)
    expect(screen.getByRole('button', { name: 'Theme: Dark' })).toBeInTheDocument()
    document.cookie = 'da-theme=system; path=/'
  })

  it('keeps every toggle on the page in step', async () => {
    document.cookie = 'da-theme=system; path=/'
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    )
    render(
      <>
        <ThemeToggle initialPreference="system" />
        <ThemeToggle initialPreference="system" />
      </>
    )
    await userEvent.click(screen.getAllByRole('button', { name: 'Theme: System' })[0])
    expect(screen.getAllByRole('button', { name: 'Theme: Light' })).toHaveLength(2)
    document.cookie = 'da-theme=system; path=/'
  })

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
