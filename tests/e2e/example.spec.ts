import { test, expect } from '../support/fixtures'

test('guest can reach the public authentication entry', async ({ page, appBaseUrl }) => {
  await page.goto(appBaseUrl)
  await expect(page.getByTestId('home-hero')).toBeVisible()
  await expect(page.getByTestId('home-open-auth-link')).toHaveAttribute('href', '/auth')
})
