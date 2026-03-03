import { test, expect } from '../support/fixtures'
import {
  createIntakeDraftPayload,
  createIntakeRouteProbe,
} from '../support/fixtures/factories/intake-draft-factory'
import {
  INTAKE_ATDD_REQUIRED_RESPONSE_KEYS,
  INTAKE_ATDD_REQUIRED_STORAGE_KEYS,
} from '../support/fixtures/test-data'
import { getBaseUrl, getTestEnvironment } from '../support/helpers/env'

const authTestUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: `playwright-${getTestEnvironment()}-intake-atdd@example.com`,
  userPassword: 'PlaywrightPass123!',
}

test.describe('Story 1.2 Guided Intake Draft API ATDD (RED)', () => {
  test.skip('[P0][AC2] unauthenticated intake draft read is denied', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    // Given no authenticated session
    // When draft retrieval is requested
    const response = await request.get(probe.draftApiPath)

    // Then access is denied at the server boundary
    expect(response.status()).toBe(401)
  })

  test.skip('[P0][AC2] unauthenticated intake draft save is denied', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createIntakeDraftPayload()

    // Given no authenticated session
    // When draft save is requested
    const response = await request.post(probe.draftApiPath, {
      data: payload,
    })

    // Then access is denied at the server boundary
    expect(response.status()).toBe(401)
  })

  test.describe('authenticated standard user', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
    })

    test.skip('[P0][AC2][AC3] draft save returns minimal response shape', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const payload = createIntakeDraftPayload()

      // Given an authenticated user with valid draft payload
      // When draft save is requested
      const response = await request.post(probe.draftApiPath, {
        data: payload,
      })
      const body = await response.json() as Record<string, unknown>

      // Then response shape is stable and minimal
      expect(response.status()).toBe(200)
      expect(Object.keys(body).sort()).toEqual([...INTAKE_ATDD_REQUIRED_RESPONSE_KEYS].sort())
      expect(body.currentSection).toBe(payload.currentSection)
    })

    test.skip('[P0][AC3] save payload is limited to required draft storage keys', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const payload = {
        ...createIntakeDraftPayload(),
        recommendationRunId: 'run-should-not-be-accepted',
        auditTrail: [{ action: 'tamper' }],
      }

      // Given an authenticated user sends unrelated persistence fields
      // When the draft save endpoint validates payload boundaries
      const response = await request.post(probe.draftApiPath, {
        data: payload,
      })

      // Then unrelated recommendation/audit persistence is rejected
      expect(response.status()).toBe(400)
    })

    test.skip('[P0][AC4] saved draft is restored with current section and values', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const payload = createIntakeDraftPayload({ currentSection: 'work' })

      // Given an authenticated user previously saved draft state
      await request.post(probe.draftApiPath, {
        data: payload,
      })

      // When the draft is loaded later
      const response = await request.get(probe.draftApiPath)
      const body = await response.json() as {
        currentSection: string
        values: Record<string, Record<string, unknown>>
      }

      // Then resume section and values are restored
      expect(response.status()).toBe(200)
      expect(body.currentSection).toBe(payload.currentSection)
      expect(body.values.personal?.firstName).toBe(payload.fieldValues.personal?.firstName)
    })

    test.skip('[P1][AC3] draft read payload excludes recommendation and audit entities', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)

      // Given a draft retrieval call
      // When payload is returned from the server
      const response = await request.get(probe.draftApiPath)
      const body = await response.json() as Record<string, unknown>

      // Then payload remains constrained to minimum draft boundary
      expect(response.status()).toBe(200)
      for (const field of ['recommendationRunId', 'pathwayDefinitionId', 'auditTrail']) {
        expect(Object.prototype.hasOwnProperty.call(body, field)).toBe(false)
      }
      expect(INTAKE_ATDD_REQUIRED_STORAGE_KEYS.length).toBe(3)
    })

    test.skip('[P1][AC5] invalid section identifiers are rejected with validation details', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const payload = {
        ...createIntakeDraftPayload(),
        currentSection: 'invalid-section',
      }

      // Given an authenticated user sends an invalid section identifier
      // When draft save validation runs
      const response = await request.post(probe.draftApiPath, {
        data: payload,
      })
      const responseBody = await response.text()

      // Then the API returns a validation-oriented client error
      expect(response.status()).toBe(400)
      expect(responseBody.toLowerCase()).toContain('currentsection')
    })
  })
})
