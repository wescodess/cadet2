import { test, expect } from '../support/fixtures'
import { getBaseUrl, getTestEnvironment } from '../support/helpers/env'

const authTestUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: `playwright-${getTestEnvironment()}-workspace@example.com`,
  userPassword: 'PlaywrightPass123!',
}

const standardUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: `playwright-${getTestEnvironment()}-standard@example.com`,
  userPassword: 'PlaywrightPass123!',
}

test.describe('Workspace route authentication', () => {
  test('guest is redirected to auth when opening the protected workspace route', async ({ page, appBaseUrl }) => {
    await page.goto(`${appBaseUrl}/workspace`)

    await expect(page).toHaveURL(/\/auth$/)
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
  })

  test.describe('authenticated session', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
    })

    test('authenticated user can open the workspace shell', async ({ page, appBaseUrl }) => {
      await page.goto(`${appBaseUrl}/workspace`)

      await expect(page).toHaveURL(/\/workspace$/)
      await expect(page.getByTestId('workspace-shell')).toBeVisible()
      await expect(page.getByTestId('workspace-dashboard')).toBeVisible()
      await expect(page.getByTestId('workspace-nav')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Start Guided Intake' })).toBeVisible()
      await expect(page.getByTestId('workspace-sign-out')).toBeVisible()
    })
  })

  test.describe('admin route guard', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: standardUser,
    })

    test('standard authenticated users are redirected away from admin routes', async ({ page, appBaseUrl }) => {
      await page.goto(`${appBaseUrl}/admin/rag-phase0`)

      await expect(page).toHaveURL(/\/workspace$/)
      await expect(page.getByTestId('workspace-shell')).toBeVisible()
    })
  })
})
