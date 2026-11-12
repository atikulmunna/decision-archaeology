import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const captured = vi.hoisted(() => ({ props: null as null | Record<string, unknown> }))

// The client half of the column: capture exactly what the server half hands across the boundary.
vi.mock('@/components/decisions/StrataCanvas', () => ({
  StrataCanvas: (props: Record<string, unknown>) => {
    captured.props = props
    return null
  },
}))

import { StrataColumn } from '@/components/decisions/StrataColumn'
import { DEMO_NOW } from '@/lib/demo/clock'
import { listDemoStrataRecords } from '@/lib/demo/queries'
import { DEMO_ROUTES } from '@/lib/routes'
import { layoutStrata } from '@/lib/strata'

function findFunctions(value: unknown, path = 'props'): string[] {
  if (typeof value === 'function') return [path]
  if (value === null || typeof value !== 'object' || value instanceof Date) return []
  return Object.entries(value).flatMap(([key, inner]) => findFunctions(inner, `${path}.${key}`))
}

describe('StrataColumn server and client boundary', () => {
  it('hands the client canvas only serializable props, with each decision link resolved', () => {
    const layout = layoutStrata(listDemoStrataRecords({}).records, { year: null, now: DEMO_NOW })
    renderToStaticMarkup(<StrataColumn layout={layout} routes={DEMO_ROUTES} pageParams="" cappedTotal={null} />)
    expect(captured.props).not.toBeNull()
    expect(findFunctions(captured.props)).toEqual([])
    const hrefs = captured.props!.hrefs as Record<string, string>
    expect(Object.keys(hrefs)).toHaveLength(24)
    expect(hrefs['demo-0007']).toBe('/demo/decisions/demo-0007')
  })
})
