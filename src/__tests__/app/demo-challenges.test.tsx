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
import { DEMO_SKIPPED_KEY } from '@/lib/demo/challenges'

const page = async (key: string) =>
  renderToStaticMarkup(
    await DemoDecisionPage({ params: Promise.resolve({ id: demoDecisionIdForKey(key) }), searchParams: Promise.resolve({ view: 'then' }) })
  )

describe('demo decision challenges', () => {
  it('shows the sealed questions, answers and credit on the Northwind decision', async () => {
    const markup = await page('northwind-offer')
    expect(markup).toContain('Questions before sealing')
    expect(markup).toMatch(/Asked by [^<]+ via OpenRouter Auto Router/)
  })

  it('says the skipped decision was sealed without questions', async () => {
    expect(await page(DEMO_SKIPPED_KEY)).toContain('Sealed without questions.')
  })
})
