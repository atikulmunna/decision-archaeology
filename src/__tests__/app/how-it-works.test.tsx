import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: null }) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/how-it-works',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/prisma', () => {
  throw new Error('the case study must not import prisma')
})

import HowItWorks, { metadata } from '@/app/how-it-works/page'
import { summarizeCalibration } from '@/lib/calibration'
import { DEMO_NOW } from '@/lib/demo/clock'
import { getDemoCalibrationRecords, getDemoDecision } from '@/lib/demo/queries'
import { buildSealPayload } from '@/lib/seal'
import { docHref, DOCS, GITHUB_URL } from '@/lib/site'
import { TEST_STATS } from '@/lib/test-stats'

const section = (name: string) => screen.getByRole('heading', { name }).closest('section') as HTMLElement

describe('the How it works case study', () => {
  it('has its own title', () => {
    expect(metadata.title).toBe('How it works | Decision Archaeology')
  })

  it('walks the problem, the moments, the internals and the numbers', async () => {
    render(await HowItWorks())
    for (const name of ['The problem', 'Three moments', 'Under the hood', 'By the numbers']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })

  it('embeds the real seal panel and the Then and Now pair', async () => {
    render(await HowItWorks())
    expect(screen.getAllByRole('region', { name: 'Seal' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-selected', 'true')
  })

  it("shows DA-0007's actual canonical payload, the seal versions and Rowan's Brier score", async () => {
    const { container } = render(await HowItWorks())
    expect(container.querySelector('pre code')?.textContent).toBe(buildSealPayload(getDemoDecision('demo-0007')!))
    const hood = section('Under the hood')
    expect(hood).toHaveTextContent('da-seal-v1')
    expect(hood).toHaveTextContent('da-seal-v4')
    const brier = summarizeCalibration(getDemoCalibrationRecords(), DEMO_NOW).forecasts.brier!
    expect(hood).toHaveTextContent(brier.toFixed(2))
  })

  it('says exactly what the seal covers and when it is taken', async () => {
    render(await HowItWorks())
    const hood = section('Under the hood')
    expect(hood).toHaveTextContent('the questions and your answers')
    expect(hood).toHaveTextContent('Every save inside the five-minute edit window')
  })

  it('counts the tests from the build, plus phases and seal versions', async () => {
    render(await HowItWorks())
    const numbers = within(section('By the numbers'))
    expect(numbers.getByText(String(TEST_STATS.files))).toBeInTheDocument()
    expect(numbers.getByText(String(TEST_STATS.cases))).toBeInTheDocument()
    expect(numbers.getByText('12')).toBeInTheDocument()
    expect(numbers.getByText('4')).toBeInTheDocument()
  })

  it('links the tour, the demo, the source and every doc', async () => {
    render(await HowItWorks())
    expect(screen.getByRole('link', { name: 'Take the tour' })).toHaveAttribute('href', '/demo?tour=1')
    expect(screen.getByRole('link', { name: 'Explore the demo' })).toHaveAttribute('href', '/demo')
    expect(screen.getByRole('link', { name: 'Source on GitHub' })).toHaveAttribute('href', GITHUB_URL)
    for (const doc of DOCS) {
      const links = screen.getAllByRole('link', { name: doc.title })
      expect(links.some((link) => link.getAttribute('href') === docHref(doc.file))).toBe(true)
    }
    expect(screen.getAllByRole('link', { name: 'Open in the demo' }).map((link) => link.getAttribute('href'))).toEqual([
      '/demo/decisions/demo-0007?view=then',
      '/demo/decisions/demo-0007?view=now',
      '/demo?view=strata',
    ])
  })

  it('every link on the case study is absolute', async () => {
    const { container } = render(await HowItWorks())
    const hrefs = Array.from(container.querySelectorAll('a[href]')).map((link) => link.getAttribute('href') ?? '')
    expect(hrefs.length).toBeGreaterThan(10)
    expect(hrefs.filter((href) => !/^(\/|https:\/\/|#)/.test(href))).toEqual([])
  })
})
