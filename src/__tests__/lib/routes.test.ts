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

  it('makes the demo public without dropping existing public routes', () => {
    expect(PUBLIC_ROUTES).toEqual(
      expect.arrayContaining(['/', '/sign-in(.*)', '/sign-up(.*)', '/demo(.*)', '/api/webhooks/(.*)'])
    )
  })
})
