import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  nextThemePreference,
  parseThemePreference,
  resolveTheme,
  THEME_INIT_SCRIPT,
} from '@/lib/design/theme'

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches, addEventListener: vi.fn() }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.theme
})

describe('theme preference helpers', () => {
  it('parses the cookie, treating anything unknown as system', () => {
    expect(parseThemePreference('dark')).toBe('dark')
    expect(parseThemePreference('light')).toBe('light')
    expect(parseThemePreference(undefined)).toBe('system')
    expect(parseThemePreference('purple')).toBe('system')
  })

  it('resolves system from the OS and respects explicit choices', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('cycles system, light, dark', () => {
    expect(nextThemePreference('system')).toBe('light')
    expect(nextThemePreference('light')).toBe('dark')
    expect(nextThemePreference('dark')).toBe('system')
  })
})

describe('THEME_INIT_SCRIPT', () => {
  it('applies dark before paint for a system preference on a dark OS', () => {
    document.cookie = 'da-theme=system; path=/'
    stubMatchMedia(true)
    new Function(THEME_INIT_SCRIPT)()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('keeps an explicit light choice on a dark OS', () => {
    document.cookie = 'da-theme=light; path=/'
    stubMatchMedia(true)
    new Function(THEME_INIT_SCRIPT)()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('treats a garbled cookie as system', () => {
    document.cookie = 'da-theme=purple; path=/'
    stubMatchMedia(false)
    new Function(THEME_INIT_SCRIPT)()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('follows the OS when the cookie is not valid percent-encoding', () => {
    document.cookie = 'da-theme=%E0%A4%A; path=/'
    stubMatchMedia(true)
    new Function(THEME_INIT_SCRIPT)()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
