import { expect, test } from '@playwright/test'

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
    expect(Math.abs(real!.height - placeholder!.height) / real!.height).toBeLessThanOrEqual(0.2)
    expect(Math.abs(real!.width - placeholder!.width)).toBeLessThanOrEqual(8)
  })
}
