import { test, expect } from '../support/fixtures'

test('guest can reach the public authentication entry', async ({ page, appBaseUrl }) => {
  await page.goto(appBaseUrl)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in or create an account' })).toHaveAttribute(
    'href',
    '/auth',
  )
})
