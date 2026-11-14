import { expect, test } from '@playwright/test'
import { watchConsole } from './helpers'

test('the seal verifies, then breaks when a word changes', async ({ page }) => {
  const errors = watchConsole(page)
  await page.goto('/demo/decisions/demo-0007?view=then')
  const seal = page.getByRole('region', { name: 'Seal' })
  await seal.getByRole('button', { name: 'Verify seal' }).click()
  await expect(seal.getByRole('status')).toContainText('Seal verified')
  await seal.getByRole('checkbox', { name: 'Try changing a word (demo)' }).check()
  await seal.getByRole('button', { name: 'Verify seal' }).click()
  await expect(seal.getByRole('status')).toContainText('Does not match')
  expect(errors()).toEqual([])
})
