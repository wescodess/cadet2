import { test, expect } from '../support/fixtures'
import { createWorkspaceRouteProbe } from '../support/fixtures/factories/workspace-access-factory'
import {
  WORKSPACE_ATDD_DISABLED_NAV_LABELS,
  WORKSPACE_ATDD_TEST_IDS,
} from '../support/fixtures/test-data'
import { getBaseUrl, getTestEnvironment } from '../support/helpers/env'

const authTestUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: `playwright-${getTestEnvironment()}-workspace-atdd@example.com`,
  userPassword: 'PlaywrightPass123!',
}

test.describe('Story 1.1 Workspace Access ATDD (RED)', () => {
  test.skip('[P0][AC1] guest is redirected to auth for protected workspace route', async ({ page, appBaseUrl }) => {
    const probe = createWorkspaceRouteProbe(appBaseUrl)

    // Given a guest user without an authenticated session
    // When the guest navigates directly to a protected workspace route
    await page.goto(probe.workspacePath)

    // Then the user is redirected to authentication
    await expect(page).toHaveURL(/\/auth$/)
  })

  test.describe('authenticated standard user', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
    })

    test.skip('[P0][AC3] authenticated user lands in workspace shell', async ({ page, appBaseUrl }) => {
      const probe = createWorkspaceRouteProbe(appBaseUrl)

      // Given an authenticated standard user
      // When the user enters the workspace route
      await page.goto(probe.workspacePath)

      // Then the stable workspace shell renders
      await expect(page.getByTestId(WORKSPACE_ATDD_TEST_IDS.shell)).toBeVisible()
    })

    test.skip('[P1][AC3] workspace desktop navigation landmark is visible and keyboard-reachable', async ({ page, appBaseUrl }) => {
      const probe = createWorkspaceRouteProbe(appBaseUrl)

      // Given an authenticated user in workspace shell
      // When the user opens the workspace route on desktop
      await page.goto(probe.workspacePath)

      // Then a semantic navigation landmark is rendered for keyboard users
      await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).first()).toBeVisible()
    })

    test.skip('[P0][AC5] standard user is blocked from internal admin route', async ({ page, appBaseUrl }) => {
      const probe = createWorkspaceRouteProbe(appBaseUrl)

      // Given a standard authenticated user
      // When the user attempts to access an admin-only route
      await page.goto(probe.adminPath)

      // Then the user is prevented from remaining on the admin page
      await expect(page).not.toHaveURL(/\/admin\/rag-phase0$/)
    })
  })

  test.describe('authenticated standard user on mobile viewport', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
      viewport: {
        width: 390,
        height: 844,
      },
    })

    test.skip('[P1][AC3] mobile workspace navigation container is rendered', async ({ page, appBaseUrl }) => {
      const probe = createWorkspaceRouteProbe(appBaseUrl)

      // Given an authenticated user on mobile viewport
      // When the workspace route renders
      await page.goto(probe.workspacePath)

      // Then a dedicated mobile navigation container is visible
      await expect(page.getByTestId(WORKSPACE_ATDD_TEST_IDS.navMobile)).toBeVisible()
    })

    test.skip('[P1][AC4] recommendation area remains disabled in mobile navigation', async ({ page, appBaseUrl }) => {
      const probe = createWorkspaceRouteProbe(appBaseUrl)

      // Given recommendation work areas are not delivered
      // When mobile workspace navigation renders
      await page.goto(probe.workspacePath)

      // Then the recommendation navigation affordance is disabled
      await expect(
        page
          .getByTestId(WORKSPACE_ATDD_TEST_IDS.navMobile)
          .locator('button[aria-disabled="true"]')
          .filter({ hasText: WORKSPACE_ATDD_DISABLED_NAV_LABELS[0] }),
      ).toBeVisible()
    })
  })
})
