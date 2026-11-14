import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const captured = vi.hoisted(() => ({} as Record<string, Record<string, unknown>>))

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: null }) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/how-it-works',
  useSearchParams: () => new URLSearchParams(),
}))
// The client halves of the three live moments: capture exactly what the server page hands across.
vi.mock('@/components/case-study/CaseStudySeal', () => ({
  CaseStudySeal: (props: Record<string, unknown>) => {
    captured.seal = props
    return null
  },
}))
vi.mock('@/components/decisions/DecisionDetail', () => ({
  DecisionDetail: (props: Record<string, unknown>) => {
    captured.detail = props
    return null
  },
}))
vi.mock('@/components/decisions/StrataCanvas', () => ({
  StrataCanvas: (props: Record<string, unknown>) => {
    captured.strata = props
    return null
  },
}))

import HowItWorks from '@/app/how-it-works/page'

function findFunctions(value: unknown, path = 'props'): string[] {
  if (typeof value === 'function') return [path]
  if (value === null || typeof value !== 'object' || value instanceof Date) return []
  return Object.entries(value).flatMap(([key, inner]) => findFunctions(inner, `${path}.${key}`))
}

describe('the case study server and client boundary', () => {
  it('hands the live components plain data only, embedded so they never point back at the case study', async () => {
    renderToStaticMarkup(await HowItWorks())
    expect(Object.keys(captured).sort()).toEqual(['detail', 'seal', 'strata'])
    for (const [name, props] of Object.entries(captured)) expect(findFunctions(props, name)).toEqual([])
    expect(captured.detail.syncUrl).toBe(false)
    expect(captured.strata.yearBase).toBe('/demo')
  })
})
