import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo/decisions/demo-0007',
}))
vi.mock('@/lib/prisma', () => {
  throw new Error('demo pages must not import prisma')
})

import DemoDecisionPage from '@/app/(demo)/demo/decisions/[id]/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'

const selectedTab = (markup: string) =>
  markup.match(/<button[^>]*id="decision-tab-(then|now)"[^>]*aria-selected="true"/)?.[1] ??
  markup.match(/<button[^>]*aria-selected="true"[^>]*id="decision-tab-(then|now)"/)?.[1]

const page = async (key: string) =>
  renderToStaticMarkup(
    await DemoDecisionPage({ params: Promise.resolve({ id: demoDecisionIdForKey(key) }), searchParams: Promise.resolve({}) })
  )

describe('demo decision field notes', () => {
  it("shows Rowan's notes on both sides of the Northwind seal", async () => {
    const markup = await page('northwind-offer')
    expect(markup).toContain('Field notes before sealing')
    expect(markup).toContain('The Northwind recruiter called again. I keep thinking about their scheduling problem.')
    expect(markup).toContain('Where this started')
    expect(markup).toContain('Field notes since')
    expect(markup).toContain('Three weeks in. The team argues about tradeoffs exactly like in the interviews.')
    expect(markup).not.toContain('Add a note about this decision')
  })

  it('keeps the newest decision opening in Then', async () => {
    expect(selectedTab(await page('one-coffee-a-day'))).toBe('then')
  })
})
