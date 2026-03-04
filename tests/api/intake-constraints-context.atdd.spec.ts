import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createGoalsDraftPayload,
  createGoalsUpdateFixture,
  createIntakeRouteProbe,
} from '../support/fixtures/factories/intake-draft-factory'
import { INTAKE_ATDD_REQUIRED_RESPONSE_KEYS } from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-constraints-${seed}@example.com`
}

async function describeAuthFailure(response: Awaited<ReturnType<APIRequestContext['post']>>) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureAuthenticatedRequest(request: APIRequestContext, appBaseUrl: string) {
  const email = uniqueAuthEmail()
  const password = 'PlaywrightPass123!'

  const signInResponse = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
    data: {
      email,
      password,
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (signInResponse.ok()) {
    return
  }

  const signUpResponse = await request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    data: {
      email,
      password,
      name: 'Intake Constraints API Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const [signInFailure, signUpFailure] = await Promise.all([
      describeAuthFailure(signInResponse),
      describeAuthFailure(signUpResponse),
    ])

    throw new Error(
      `Could not establish authenticated API session for constraints/context tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

test.describe('Story 1.3 Constraints and Context API ATDD', () => {
  test('[P0][AC3] unauthenticated user cannot save planning constraints or free-form context', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createGoalsDraftPayload()

    // Given no authenticated workspace session
    // When the draft save endpoint receives goals constraints and context
    const response = await request.post(probe.draftApiPath, {
      data: payload,
    })

    // Then the request is denied by the workspace owner boundary
    expect(response.status()).toBe(401)
  })

  test.describe('authenticated standard user', () => {
    test('[P0][AC1][AC2] goals constraints and free-form context save with stable response shape', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const payload = createGoalsDraftPayload()
      await ensureAuthenticatedRequest(request, appBaseUrl)

      // Given an authenticated user in the goals section
      // When goals constraints and narrative context are saved
      const response = await request.post(probe.draftApiPath, {
        data: payload,
      })
      const body = await response.json() as {
        currentSection: string
        values: Record<string, Record<string, unknown>>
      } & Record<string, unknown>

      // Then the response remains minimal and echoes normalized goals values
      expect(response.status()).toBe(200)
      expect(Object.keys(body).sort()).toEqual([...INTAKE_ATDD_REQUIRED_RESPONSE_KEYS].sort())
      expect(body.currentSection).toBe('goals')
      expect(body.values.goals?.targetTimelineMonths).toBe(payload.fieldValues.goals?.targetTimelineMonths)
      expect(body.values.goals?.budgetCad).toBe(payload.fieldValues.goals?.budgetCad)
      expect(body.values.goals?.locationPreference).toBe(payload.fieldValues.goals?.locationPreference)
      expect(body.values.goals?.additionalContext).toBe(payload.fieldValues.goals?.additionalContext)
    })

    test('[P0][AC2] editing saved goals constraints updates the same draft in place', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const goalsUpdates = createGoalsUpdateFixture()
      await ensureAuthenticatedRequest(request, appBaseUrl)

      const initialPayload = createGoalsDraftPayload({
        fieldValues: {
          goals: goalsUpdates.initial,
        },
      })
      const updatedPayload = createGoalsDraftPayload({
        fieldValues: {
          goals: goalsUpdates.updated,
        },
      })

      // Given a previously saved goals section draft
      await request.post(probe.draftApiPath, {
        data: initialPayload,
      })

      // When the same user edits constraints and free-form context
      const saveUpdateResponse = await request.post(probe.draftApiPath, {
        data: updatedPayload,
      })
      expect(saveUpdateResponse.status()).toBe(200)

      // Then a follow-up read returns the updated values instead of restarting flow state
      const readResponse = await request.get(probe.draftApiPath)
      const readBody = await readResponse.json() as {
        currentSection: string
        values: Record<string, Record<string, unknown>>
      }
      expect(readResponse.status()).toBe(200)
      expect(readBody.currentSection).toBe('goals')
      expect(readBody.values.goals?.targetTimelineMonths).toBe(goalsUpdates.updated.targetTimelineMonths)
      expect(readBody.values.goals?.budgetCad).toBe(goalsUpdates.updated.budgetCad)
      expect(readBody.values.goals?.locationPreference).toBe(goalsUpdates.updated.locationPreference)
      expect(readBody.values.goals?.additionalContext).toBe(goalsUpdates.updated.additionalContext)
    })

    test('[P0][AC3] draft payload rejects recommendation or audit leakage fields', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)

      const payload = {
        ...createGoalsDraftPayload(),
        recommendationRunId: 'run-should-not-be-accepted',
        pathwayDefinitionId: 'pathway-should-not-be-accepted',
        auditTrail: [{ action: 'tamper-context' }],
      }

      // Given an authenticated user tries to include out-of-scope entities
      // When the goals-context draft payload is validated
      const response = await request.post(probe.draftApiPath, {
        data: payload,
      })

      // Then validation blocks data outside intake_draft boundaries
      expect(response.status()).toBe(400)
    })

    test('[P0][AC1] draft payload rejects invalid structured constraint option values', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)

      const payload = createGoalsDraftPayload()
      payload.fieldValues.goals = {
        ...(payload.fieldValues.goals || {}),
        primaryGoal: 'invalid-goal',
        priorityPreference: 'invalid-priority',
        locationPreference: 'invalid-location',
      }

      const response = await request.post(probe.draftApiPath, {
        data: payload,
      })

      expect(response.status()).toBe(400)
    })

    test('[P1][AC3] draft retrieval excludes owner identifiers and unrelated entities', async ({ request, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)

      // Given an authenticated user reads their saved goals draft
      const response = await request.get(probe.draftApiPath)
      const body = await response.json() as Record<string, unknown>

      // Then the response remains scoped to draft values only
      expect(response.status()).toBe(200)
      for (const field of ['userId', 'email', 'recommendationRunId', 'pathwayDefinitionId', 'auditTrail']) {
        expect(Object.prototype.hasOwnProperty.call(body, field)).toBe(false)
      }
    })
  })
})
