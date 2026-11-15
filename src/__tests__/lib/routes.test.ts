import { describe, expect, it } from 'vitest'
import { APP_ROUTES, DEMO_ROUTES } from '@/lib/routes'
import { PUBLIC_ROUTES } from '@/lib/public-routes'

describe('route sets', () => {
  it('builds app and demo paths', () => {
    expect(DEMO_ROUTES.decision('demo-0007')).toBe('/demo/decisions/demo-0007')
    expect(DEMO_ROUTES.report('demo-report-1')).toBe('/demo/reports/demo-report-1')
    expect(APP_ROUTES.decision('d1')).toBe('/decisions/d1')
    expect(APP_ROUTES.report('r1')).toBe('/ai/reports/r1')
    expect(DEMO_ROUTES.archive).toBe('/demo')
    expect(APP_ROUTES.archive).toBe('/decisions')
  })

  it('makes the job routes public to the proxy, since each checks its own signature or secret', () => {
    expect(PUBLIC_ROUTES).toContain('/api/jobs/(.*)')
  })

  it('makes the case study and its link preview images public', () => {
    const isPublic = (path: string) => PUBLIC_ROUTES.some((pattern) => new RegExp(`^${pattern}$`).test(path))
    expect(isPublic('/how-it-works')).toBe(true)
    expect(isPublic('/how-it-works/opengraph-image')).toBe(true)
    expect(isPublic('/opengraph-image')).toBe(true)
    expect(isPublic('/decisions')).toBe(false)
  })

  it('opens the demo and the case study and nothing that merely starts with their names', () => {
    const isPublic = (path: string) => PUBLIC_ROUTES.some((pattern) => new RegExp(`^${pattern}$`).test(path))
    expect(isPublic('/demo')).toBe(true)
    expect(isPublic('/demo/decisions/demo-0007')).toBe(true)
    expect(isPublic('/demoanything')).toBe(false)
    expect(isPublic('/how-it-worksx')).toBe(false)
  })

  it('makes the demo public without dropping existing public routes', () => {
    expect(PUBLIC_ROUTES).toEqual(
      expect.arrayContaining(['/', '/sign-in(.*)', '/sign-up(.*)', '/demo', '/demo/(.*)', '/api/webhooks/(.*)'])
    )
  })
})
