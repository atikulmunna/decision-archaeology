import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo/decisions/demo-0007',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: null }) }))
vi.mock('@/lib/prisma', () => {
  throw new Error('demo pages must not import prisma')
})

import DemoDecisionPage from '@/app/(demo)/demo/decisions/[id]/page'

function page(view: string) {
  return DemoDecisionPage({
    params: Promise.resolve({ id: 'demo-0007' }),
    searchParams: Promise.resolve({ view, tour: '2' }),
  })
}

describe('demo decision page across tour stops', () => {
  it('follows a new ?view= on the same route, in both directions', async () => {
    const { rerender } = render(await page('then'))
    expect(screen.getByRole('tab', { name: 'Then' })).toHaveAttribute('aria-selected', 'true')
    rerender(await page('now'))
    expect(screen.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-selected', 'true')
    rerender(await page('then'))
    expect(screen.getByRole('tab', { name: 'Then' })).toHaveAttribute('aria-selected', 'true')
  })
})
