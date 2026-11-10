import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let userId: string | null = null

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId }) }))
// renderToStaticMarkup cannot render the async Masthead; Masthead.test.tsx covers it.
vi.mock('@/components/shell/Masthead', () => ({
  Masthead: ({ cta, showUserButton, homeHref }: { cta: { href: string; label: string }; showUserButton: boolean; homeHref: string }) => (
    <header data-cta={cta.href} data-user={String(showUserButton)} data-home={homeHref}>
      {cta.label}
    </header>
  ),
}))
vi.mock('@/lib/prisma', () => {
  throw new Error('demo pages must not import prisma')
})

import DemoLayout from '@/app/(demo)/layout'
import DemoArchivePage from '@/app/(demo)/demo/page'
import DemoDecisionPage, { generateMetadata as demoDecisionMetadata } from '@/app/(demo)/demo/decisions/[id]/page'
import DemoCalibrationPage from '@/app/(demo)/demo/calibration/page'
import DemoReportsPage from '@/app/(demo)/demo/reports/page'
import DemoReportPage from '@/app/(demo)/demo/reports/[id]/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_ARCHIVE_LINE } from '@/lib/demo/persona'
import { DEMO_REPORT_ID } from '@/lib/demo/report'

const html = async (node: Promise<ReactNode> | ReactNode) => renderToStaticMarkup(<>{await node}</>)

beforeEach(() => {
  userId = null
})

describe('demo archive page', () => {
  it('renders the demo archive from fixtures', async () => {
    const markup = await html(DemoArchivePage({ searchParams: Promise.resolve({}) }))
    expect(markup).toContain(DEMO_ARCHIVE_LINE)
    expect(markup).toContain('DA-0024')
    expect(markup).toContain('href="/demo/decisions/demo-0024"')
  })

  it('filters the demo archive from search params', async () => {
    const markup = await html(DemoArchivePage({ searchParams: Promise.resolve({ domain: 'HEALTH' }) }))
    expect(markup).toContain('Cut caffeine to one cup a day?')
    expect(markup).not.toContain('Accept the senior role at Northwind?')
  })

  it('survives hostile search params', async () => {
    const markup = await html(
      DemoArchivePage({
        searchParams: Promise.resolve({ page: 'abc', minConfidence: 'x', domain: 'NOPE', outcome: 'bogus', q: 'c++ (' }),
      })
    )
    expect(markup).toContain('Archive')
  })
})

describe('demo archive page with repeated keys', () => {
  it('renders when a search key repeats instead of crashing', async () => {
    const markup = await html(DemoArchivePage({ searchParams: Promise.resolve({ q: ['Northwind', 'senior'], tag: ['job-offer', 'x'] }) }))
    // The title is split by search highlighting, so match the record link instead.
    expect(markup).toContain('href="/demo/decisions/demo-0007"')
    expect(markup).not.toContain('Cut caffeine to one cup a day?')
  })
})

describe('demo decision page', () => {
  it('renders a demo decision read-only', async () => {
    const markup = await html(DemoDecisionPage({ params: Promise.resolve({ id: demoDecisionIdForKey('northwind-offer') }) }))
    expect(markup).toContain('Accept the senior role at Northwind?')
    expect(markup).toContain('href="/demo"')
    expect(markup).not.toMatch(/<button|<form|<textarea/)
    expect(markup).not.toContain('/api/decisions/')
  })

  it('titles the page after the decision', async () => {
    const metadata = await demoDecisionMetadata({ params: Promise.resolve({ id: demoDecisionIdForKey('northwind-offer') }) })
    expect(metadata.title).toBe('Accept the senior role at Northwind? | Demo archive')
  })

  it('calls notFound for unknown or real-looking ids', async () => {
    await expect(DemoDecisionPage({ params: Promise.resolve({ id: 'clx0abc123def456' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(DemoReportPage({ params: Promise.resolve({ id: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('demo calibration and reports', () => {
  it('renders demo calibration from the fixtures', async () => {
    expect(await html(DemoCalibrationPage())).toContain('Based on 14 closed decisions')
  })

  it('lists the demo report', async () => {
    const markup = await html(DemoReportsPage())
    expect(markup).toContain(`href="/demo/reports/${DEMO_REPORT_ID}"`)
    expect(markup).not.toMatch(/<button/)
  })

  it('renders the demo report with provenance and no flag controls', async () => {
    const markup = await html(DemoReportPage({ params: Promise.resolve({ id: DEMO_REPORT_ID }) }))
    expect(markup).toContain('Generated from this demo archive by the live pipeline')
    expect(markup).toContain('via OpenRouter Auto Router')
    expect(markup).toContain('href="/demo/reports"')
    expect(markup).not.toMatch(/<button/)
  })
})

describe('demo layout', () => {
  it('offers sign-up to visitors, with no user button', async () => {
    const markup = await html(DemoLayout({ children: <p>child</p> }))
    expect(markup).toContain('Demo archive · Fictional data · Read-only')
    expect(markup).toContain('data-cta="/sign-up"')
    expect(markup).toContain('data-user="false"')
    expect(markup).toContain('data-home="/demo"')
    expect(markup).toContain('Start your own')
    expect(markup).toContain('<p>child</p>')
  })

  it('points signed-in users back to their own archive', async () => {
    userId = 'user_123'
    const markup = await html(DemoLayout({ children: <p>child</p> }))
    expect(markup).toContain('data-cta="/decisions"')
    expect(markup).toContain('Open your archive')
    expect(markup).not.toContain('Start your own')
  })
})
