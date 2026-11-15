import { expect, test } from '@playwright/test'
import { expectNoOverflow, VIEWPORTS, watchConsole } from './helpers'

const PAGES = [
  '/',
  '/demo',
  '/demo?view=strata',
  '/demo/decisions/demo-0007?view=then',
  '/demo/decisions/demo-0007?view=now',
  '/demo/notes',
  '/demo/calibration',
  '/demo/reports',
  '/how-it-works',
]

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width} wide, ${viewport.colorScheme})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, colorScheme: viewport.colorScheme })

    for (const path of PAGES) {
      test(`${path} loads cleanly`, async ({ page }) => {
        const errors = watchConsole(page)
        const response = await page.goto(path)
        expect(response?.status()).toBe(200)
        await page.waitForLoadState('networkidle')
        await expectNoOverflow(page)
        expect(errors()).toEqual([])
      })
    }
  })
}

test('the landing page offers the tour first', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Take the 60-second tour' })).toHaveAttribute('href', '/demo?tour=1')
})

test('a shared case study link previews with its own title', async ({ page }) => {
  await page.goto('/how-it-works')
  for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
    await expect(page.locator(selector)).toHaveAttribute('content', 'How it works | Decision Archaeology')
  }
})

test('link preview images load signed out', async ({ request }) => {
  for (const path of ['/opengraph-image', '/how-it-works/opengraph-image']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    expect(response.headers()['content-type'], path).toContain('image/png')
  }
})
