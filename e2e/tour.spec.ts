import { expect, test } from '@playwright/test'
import { TOUR_STOPS } from '../src/lib/tour'
import { watchConsole } from './helpers'

test('walks all five stops and finishes on the case study', async ({ page }) => {
  const errors = watchConsole(page)
  await page.goto('/')
  await page.getByRole('link', { name: 'Take the 60-second tour' }).click()
  for (const stop of TOUR_STOPS) {
    const bar = page.getByRole('region', { name: 'Guided tour' })
    await expect(bar).toContainText(`Tour · ${stop.n} of 5`)
    await expect(bar).toContainText(stop.caption)
    if (stop.n === 2) await expect(page.getByRole('tab', { name: 'Then' })).toHaveAttribute('aria-selected', 'true')
    if (stop.n === 3) await expect(page.getByRole('tab', { name: 'Now' })).toHaveAttribute('aria-selected', 'true')
    await bar.getByRole('link', { name: stop.n === 5 ? 'Finish' : 'Next' }).click()
  }
  await expect(page).toHaveURL(/\/how-it-works$/)
  await expect(page.getByRole('heading', { level: 1, name: 'How it works' })).toBeVisible()
  expect(errors()).toEqual([])
})

test('End tour removes the bar and the parameter', async ({ page }) => {
  await page.goto(TOUR_STOPS[1].href)
  await page.getByRole('region', { name: 'Guided tour' }).getByRole('link', { name: 'End tour' }).click()
  await expect(page.getByRole('region', { name: 'Guided tour' })).toHaveCount(0)
  expect(new URL(page.url()).searchParams.has('tour')).toBe(false)
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('tour bar never covers the end of the page', async ({ page }) => {
    for (const stop of TOUR_STOPS) {
      await page.goto(stop.href)
      await expect(page.getByRole('region', { name: 'Guided tour' })).toBeVisible()
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      const { mainBottom, barTop } = await page.evaluate(() => ({
        mainBottom: document.querySelector('main')!.getBoundingClientRect().bottom,
        barTop: document.querySelector('section[aria-label="Guided tour"]')!.getBoundingClientRect().top,
      }))
      expect(mainBottom, stop.href).toBeLessThanOrEqual(barTop + 1)
    }
  })
})
