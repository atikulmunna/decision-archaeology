import { expect, type Page } from '@playwright/test'

export const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, colorScheme: 'dark' as const },
  { name: 'desktop', width: 1280, height: 800, colorScheme: 'light' as const },
]

/** Collects console errors and uncaught page errors from now on. */
export function watchConsole(page: Page): () => string[] {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return () => errors
}

export async function expectNoOverflow(page: Page): Promise<void> {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }))
  expect(scroll, 'the page scrolls sideways').toBeLessThanOrEqual(client)
}
