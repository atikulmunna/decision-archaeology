import { expect, test } from '@playwright/test'
import { expectNoOverflow } from './helpers'

const AUTH_PAGES = [
  { path: '/sign-in', status: 'Loading sign-in' },
  { path: '/sign-up', status: 'Loading sign-up' },
]

for (const { path, status } of AUTH_PAGES) {
  test(`${path} sends a placeholder card with the page`, async ({ request }) => {
    const html = await (await request.get(path)).text()
    expect(html).toContain(status)
  })

  test(`${path} swaps the placeholder for Clerk's card without a jump`, async ({ browser }) => {
    // The placeholder as the server sends it: JavaScript off, so Clerk never replaces it.
    const still = await browser.newContext({ javaScriptEnabled: false })
    const stillPage = await still.newPage()
    await stillPage.goto(path)
    const placeholder = await stillPage.getByText(status).locator('..').boundingBox()
    await still.close()

    const page = await browser.newPage()
    await page.goto(path)
    const card = page.locator('.cl-cardBox')
    await expect(card).toBeVisible()
    await expect(page.getByText(status)).toHaveCount(0)
    const real = await card.boundingBox()

    expect(placeholder).not.toBeNull()
    expect(real).not.toBeNull()
    expect(Math.abs(real!.height - placeholder!.height) / real!.height).toBeLessThanOrEqual(0.1)
    expect(Math.abs(real!.width - placeholder!.width)).toBeLessThanOrEqual(8)
  })

  test(`${path} replaces the placeholder with a notice when Clerk cannot load`, async ({ page }) => {
    await page.route('**/npm/@clerk/**', (route) => route.abort())
    await page.goto(path)
    // Filtered by text: Next's route announcer is also an alert.
    await expect(page.getByRole('alert').filter({ hasText: 'could not load' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(status).locator('..')).toBeHidden()
  })

  test.describe('on a tablet', () => {
    test.use({ viewport: { width: 820, height: 1180 } })

    test(`${path} fits without sideways scroll and keeps the placeholder's width`, async ({ browser, page }) => {
      const still = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 820, height: 1180 } })
      const stillPage = await still.newPage()
      await stillPage.goto(path)
      const placeholder = await stillPage.getByText(status).locator('..').boundingBox()
      await still.close()

      await page.goto(path)
      const card = page.locator('.cl-cardBox')
      await expect(card).toBeVisible()
      await expectNoOverflow(page)
      expect(Math.abs((await card.boundingBox())!.width - placeholder!.width)).toBeLessThanOrEqual(8)
    })
  })
}
