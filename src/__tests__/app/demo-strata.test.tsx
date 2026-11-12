import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/prisma', () => {
  throw new Error('demo pages must not import prisma')
})

import DemoArchivePage from '@/app/(demo)/demo/page'

const html = async (node: Promise<ReactNode> | ReactNode) => renderToStaticMarkup(<>{await node}</>)
const count = (markup: string, pattern: RegExp) => markup.match(pattern)?.length ?? 0
const specimenLabels = (markup: string) => [...markup.matchAll(/aria-label="(DA-[^"]*)"/g)].map((match) => match[1])

describe('demo strata', () => {
  it('draws the demo archive as a geological column', async () => {
    const markup = await html(DemoArchivePage({ searchParams: Promise.resolve({ view: 'strata' }) }))
    expect(count(markup, /data-stratum-band/g)).toBe(7)
    expect(count(markup, /href="\/demo\/decisions\/demo-[0-9]{4}"/g)).toBe(24)
    expect(markup).toContain('24 decisions from Q2 2025 to Q4 2026')
    expect(markup).toContain('href="?view=strata&amp;year=2025"')
    expect(markup).toContain('href="?view=strata&amp;year=2026"')
    expect(markup).toMatch(/<a[^>]*aria-current="page"[^>]*>Strata<\/a>/)
    expect(markup).not.toContain('aria-label="Pagination"')
  })

  it('zooms into a year and keeps the filters', async () => {
    const year = await html(DemoArchivePage({ searchParams: Promise.resolve({ view: 'strata', year: '2026' }) }))
    expect(count(year, /data-stratum-band/g)).toBe(11)

    const health = await html(DemoArchivePage({ searchParams: Promise.resolve({ view: 'strata', domain: 'HEALTH' }) }))
    const labels = specimenLabels(health)
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.every((label) => label.includes(', Health, '))).toBe(true)
    expect(health).toMatch(/<a[^>]*href="\?domain=HEALTH"[^>]*>List<\/a>/)
  })

  it('stays a list by default', async () => {
    const markup = await html(DemoArchivePage({ searchParams: Promise.resolve({}) }))
    expect(count(markup, /data-stratum-band/g)).toBe(0)
    expect(markup).toMatch(/<a[^>]*aria-current="page"[^>]*>List<\/a>/)
  })
})
