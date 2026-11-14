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
import DemoRevisitPage from '@/app/(demo)/demo/decisions/[id]/revisit/page'
import { demoDecisionIdForKey } from '@/lib/demo/archive'
import { DEMO_LETTERS } from '@/lib/demo/letters'

const decisionPage = async (key: string) =>
  renderToStaticMarkup(await DemoDecisionPage({ params: Promise.resolve({ id: demoDecisionIdForKey(key) }), searchParams: Promise.resolve({ view: 'then' }) }))
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;')

describe('demo letters and revisit', () => {
  it('the demo Then shows an open letter and a sealed one', async () => {
    const northwind = await decisionPage('northwind-offer')
    expect(northwind).toContain('A letter to future you')
    expect(northwind).toContain(escape(DEMO_LETTERS['northwind-offer'].body.split('\n')[0]))
    expect(northwind).toContain(`href="/demo/decisions/${demoDecisionIdForKey('northwind-offer')}/revisit"`)
    const podcast = await decisionPage('fernhill-podcast')
    expect(podcast).toMatch(/Sealed until [A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4}/)
    expect(podcast).not.toContain(escape(DEMO_LETTERS['fernhill-podcast'].body.split('\n')[0]))
  })

  it('the demo revisit page is read-only and opens with the letter', async () => {
    const markup = renderToStaticMarkup(await DemoRevisitPage({ params: Promise.resolve({ id: demoDecisionIdForKey('northwind-offer') }) }))
    expect(markup).toContain('Step 1 of 6')
    expect(markup).toContain(escape(DEMO_LETTERS['northwind-offer'].body.split('\n')[0]))
    expect(markup).not.toContain('<textarea')
    await expect(DemoRevisitPage({ params: Promise.resolve({ id: 'demo-9999' }) })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
