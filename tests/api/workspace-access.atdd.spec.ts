import { test, expect } from '../support/fixtures'
import {
  createTamperedWorkspaceProbe,
  createWorkspaceRouteProbe,
} from '../support/fixtures/factories/workspace-access-factory'
import { WORKSPACE_ATDD_REQUIRED_PAYLOAD_KEYS } from '../support/fixtures/test-data'
import { getBaseUrl, getTestEnvironment } from '../support/helpers/env'

const authTestUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: `playwright-${getTestEnvironment()}-workspace-atdd@example.com`,
  userPassword: 'PlaywrightPass123!',
}

test.describe('Story 1.1 Workspace Access API ATDD (RED)', () => {
  test.skip('[P0][AC1] unauthenticated request to workspace metadata endpoint is denied', async ({ request, appBaseUrl }) => {
    const probe = createWorkspaceRouteProbe(appBaseUrl)

    // Given a caller without an authenticated session
    // When the caller requests workspace metadata
    const response = await request.get(probe.workspaceApiPath)

    // Then the server rejects access
    expect(response.status()).toBe(401)
  })

  test.describe('authenticated standard user', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
    })

    test.skip('[P0][AC2] query tampering does not change workspace ownership at server boundary', async ({ request, appBaseUrl }) => {
      const probe = createTamperedWorkspaceProbe(appBaseUrl)

      // Given an authenticated user attempting userId tampering
      // When the workspace metadata endpoint is called with an attacker userId
      const response = await request.get(probe.tamperedWorkspaceApiPath)
      const body = await response.json() as { userId: string }

      // Then ownership is enforced by server-side session identity
      expect(body.userId).not.toBe(probe.attackerUserId)
    })

    test.skip('[P1][AC2] workspace metadata payload remains scoped to allowed fields only', async ({ request, appBaseUrl }) => {
      const routeProbe = createWorkspaceRouteProbe(appBaseUrl)

      // Given an authenticated user
      // When the workspace metadata endpoint responds
      const response = await request.get(routeProbe.workspaceApiPath)
      const body = await response.json() as Record<string, unknown>

      // Then payload remains constrained to allowed workspace metadata fields
      expect(Object.keys(body).sort()).toEqual([...WORKSPACE_ATDD_REQUIRED_PAYLOAD_KEYS].sort())
    })

    test.skip('[P0][AC5] standard authenticated user is denied admin API access probe', async ({ request, appBaseUrl }) => {
      // Given a standard authenticated user
      // When the admin access probe endpoint is requested
      const response = await request.get(`${appBaseUrl}/api/admin/access`)

      // Then the server denies privileged access
      expect(response.status()).toBe(403)
    })
  })
})
