import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/google', () => ({
  Instrument_Serif: () => ({ variable: 'font-var-display' }),
  Inter_Tight: () => ({ variable: 'font-var-sans' }),
  IBM_Plex_Mono: () => ({ variable: 'font-var-mono' }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
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

  it("gives Clerk the site's copy for the sign-in and sign-up cards", async () => {
    renderToStaticMarkup(await RootLayout({ children: <p>child</p> }))
    expect(provider.props?.localization).toBe(clerkLocalization)
  })
})
