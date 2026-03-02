import { test, expect } from '../support/fixtures'
import { getBaseUrl, getTestEnvironment } from '../support/helpers/env'

const authTestUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: `playwright-${getTestEnvironment()}-tasks@example.com`,
  userPassword: 'PlaywrightPass123!',
}

test.describe('Tasks route authentication', () => {
  test('guest is redirected to auth when opening the protected tasks route', async ({ page, appBaseUrl }) => {
    await test.step('When a guest opens the protected route directly', async () => {
      await page.goto(`${appBaseUrl}/tasks`)
    })

    await test.step('Then the app redirects to the auth page', async () => {
      await expect(page).toHaveURL(/\/auth$/)
      await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
    })
  })

  test.describe('authenticated session', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
    })

    test('authenticated user can open the protected tasks route and sign out', async ({ page, appBaseUrl }) => {
      await test.step('When the authenticated user opens the protected route', async () => {
        await page.goto(`${appBaseUrl}/tasks`)
      })

      await test.step('Then the protected content renders with the session details', async () => {
        await expect(page).toHaveURL(/\/tasks$/)
        await expect(page.getByTestId('tasks-page')).toBeVisible()
        await expect(page.getByTestId('tasks-heading')).toBeVisible()
        await expect(page.getByTestId('tasks-session-summary')).toBeVisible()
        await expect(page.getByTestId('tasks-list-panel')).toBeVisible()
        await expect(page.getByTestId('tasks-sign-out')).toBeVisible()
      })

      await test.step('And signing out returns the user to auth', async () => {
        await page.getByTestId('tasks-sign-out').click()
        await expect(page).toHaveURL(/\/auth$/)
        await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
      })
    })
  })
})
