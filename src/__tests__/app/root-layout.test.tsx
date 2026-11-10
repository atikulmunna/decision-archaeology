import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/google', () => ({
  Instrument_Serif: () => ({ variable: 'font-var-display' }),
  Inter_Tight: () => ({ variable: 'font-var-sans' }),
  IBM_Plex_Mono: () => ({ variable: 'font-var-mono' }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@clerk/nextjs', () => ({ ClerkProvider: ({ children }: { children: ReactNode }) => children }))

import RootLayout from '@/app/layout'

describe('RootLayout', () => {
  it('puts the next/font variables on <html> so :root tokens such as --font-sans resolve', async () => {
    const markup = renderToStaticMarkup(await RootLayout({ children: <p>child</p> }))
    const htmlTag = markup.match(/<html[^>]*>/)?.[0] ?? ''
    expect(htmlTag).toContain('font-var-display')
    expect(htmlTag).toContain('font-var-sans')
    expect(htmlTag).toContain('font-var-mono')
  })
})
