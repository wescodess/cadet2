import { test, expect } from '../support/fixtures'
import { getBaseUrl, getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-workspace-${seed}@example.com`
}

const authTestUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: uniqueAuthEmail(),
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
      await expect(page.getByText('Workspace user')).toBeVisible()
    })
  })

  test.describe('admin route guard', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
    })

    test('standard authenticated users are redirected away from admin routes', async ({ page, appBaseUrl }) => {
      await page.goto(`${appBaseUrl}/admin/rag-phase0`)

      await expect(page).not.toHaveURL(/\/admin\/rag-phase0$/)
      await expect(page.getByRole('heading', { name: 'Phase 0 Readiness Check' })).toHaveCount(0)

      if (/\/workspace$/.test(page.url())) {
        await expect(page.getByTestId('workspace-shell')).toBeVisible()
      }
      else {
        await expect(page).toHaveURL(/\/auth/)
        await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
      }
    })
  })
})
