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
vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(
      public element: unknown,
      public init: unknown
    ) {}
  },
}))

import { metadata } from '@/app/layout'
import * as rootImage from '@/app/opengraph-image'
import * as caseStudyImage from '@/app/how-it-works/opengraph-image'
import { OG_ALT, OG_SIZE, ogImageElement } from '@/lib/og-image'

describe('site metadata', () => {
  it('gives every page an absolute base and large link previews', () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL)
    expect(metadata.openGraph).toMatchObject({ siteName: 'Decision Archaeology', type: 'website' })
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' })
    expect(String(metadata.description)).not.toMatch(/bias detection/)
  })

  it("lets each page's own title and description reach its link preview", () => {
    // A root og or twitter title would win over every page's title (Next fills them only when empty).
    for (const card of [metadata.openGraph, metadata.twitter]) {
      expect(card).not.toHaveProperty('title')
      expect(card).not.toHaveProperty('description')
    }
  })
})

describe('link preview images', () => {
  it('draws the name and tagline, plus a title when given', () => {
    const plain = renderToStaticMarkup(ogImageElement())
    expect(plain).toContain('Decision Archaeology')
    expect(plain).toContain('Keep the reasoning')
    expect(renderToStaticMarkup(ogImageElement('How it works'))).toContain('How it works')
  })

  it('declares a 1200 by 630 PNG for the site and the case study', () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 })
    for (const image of [rootImage, caseStudyImage]) {
      expect(image.size).toEqual(OG_SIZE)
      expect(image.contentType).toBe('image/png')
      expect(image.alt).toBe(OG_ALT)
    }
  })
})
