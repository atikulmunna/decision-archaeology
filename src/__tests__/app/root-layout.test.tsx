import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/google', () => ({
  Instrument_Serif: () => ({ variable: 'font-var-display' }),
  Inter_Tight: () => ({ variable: 'font-var-sans' }),
  IBM_Plex_Mono: () => ({ variable: 'font-var-mono' }),
}))
// A saved dark choice: the layout must still leave data-theme to the init script.
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => (name === 'da-theme' ? { value: 'dark' } : undefined) }) }))
const provider = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }))
vi.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children, ...props }: { children: ReactNode }) => {
    provider.props = props
    return children
  },
}))

import RootLayout from '@/app/layout'
import { clerkLocalization } from '@/lib/design/clerk-localization'

describe('RootLayout', () => {
  it('puts the next/font variables on <html> so :root tokens such as --font-sans resolve', async () => {
    const markup = renderToStaticMarkup(await RootLayout({ children: <p>child</p> }))
    const htmlTag = markup.match(/<html[^>]*>/)?.[0] ?? ''
    expect(htmlTag).toContain('font-var-display')
    expect(htmlTag).toContain('font-var-sans')
    expect(htmlTag).toContain('font-var-mono')
  })

  it('leaves data-theme to the init script, so a refresh after switching to System never strips it', async () => {
    // If React rendered data-theme, a router.refresh() after the reader moved from Dark to System would
    // remove the attribute the toggle set, and a dark OS would get the light theme until a reload.
    const markup = renderToStaticMarkup(await RootLayout({ children: <p>child</p> }))
    const htmlTag = markup.match(/<html[^>]*>/)?.[0] ?? ''
    expect(htmlTag).not.toContain('data-theme')
  })

  it("gives Clerk the site's copy for the sign-in and sign-up cards", async () => {
    renderToStaticMarkup(await RootLayout({ children: <p>child</p> }))
    expect(provider.props?.localization).toBe(clerkLocalization)
  })
})
