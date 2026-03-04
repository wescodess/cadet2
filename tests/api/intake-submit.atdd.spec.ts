import type { APIRequestContext } from '@playwright/test'
import { faker } from '@faker-js/faker'

import { test, expect } from '../support/fixtures'
import {
  createCompletedIntakeDraftPayload,
  createIncompleteIntakeDraftPayload,
  createIntakeSubmitRouteProbe,
} from '../support/fixtures/factories/intake-submit-factory'
import { RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS } from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type RecommendationRunApiRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: string
  updatedAt: string
  userId?: string
} & Record<string, unknown>

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-submit-api-${seed}@example.com`
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
      name: 'Intake Submit API Test User',
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
      `Could not establish authenticated API session for intake submit tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function seedDraft(
  request: APIRequestContext,
  routeProbe: ReturnType<typeof createIntakeSubmitRouteProbe>,
  payload: ReturnType<typeof createCompletedIntakeDraftPayload>,
) {
  const response = await request.post(routeProbe.draftApiPath, {
    data: payload,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

test.describe('Story 1.4 Intake Submit and Recommendation Run Tracking API ATDD (RED)', () => {
  test('[P0][AC1] unauthenticated intake submission is denied by workspace session guard', async ({ request, appBaseUrl }) => {
    const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)

    // Given no authenticated workspace session
    // When intake submission is requested
    const response = await request.post(routeProbe.submitApiPath, {
      failOnStatusCode: false,
    })

    // Then the server rejects the operation
    expect(response.status()).toBe(401)
  })

  test.describe('authenticated standard user', () => {
    test('[P0][AC1][AC3][AC4] submitting completed intake creates a queued run linked to a profile snapshot', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await seedDraft(request, routeProbe, createCompletedIntakeDraftPayload())

      // Given an authenticated user with all required intake sections complete
      // When the intake submission endpoint is called
      const response = await request.post(routeProbe.submitApiPath, {
        failOnStatusCode: false,
      })
      const body = await response.json() as RecommendationRunApiRecord

      // Then a minimal queued recommendation run record is returned
      expect(response.status()).toBe(201)
      for (const key of RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(body, key)).toBe(true)
      }
      expect(body.status).toBe('queued')
      expect(typeof body.runId).toBe('string')
      expect(typeof body.profileSnapshotId).toBe('string')

      for (const forbiddenField of ['recommendations', 'pathwayRankings', 'citations', 'confidenceScore', 'auditTrail']) {
        expect(Object.prototype.hasOwnProperty.call(body, forbiddenField)).toBe(false)
      }
    })

    test('[P0][AC1] submission is rejected when required intake sections are incomplete', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await seedDraft(request, routeProbe, createIncompleteIntakeDraftPayload())

      // Given an authenticated user with an incomplete intake draft
      // When intake submission is requested
      const response = await request.post(routeProbe.submitApiPath, {
        failOnStatusCode: false,
      })
      const responseText = (await response.text()).toLowerCase()

      // Then validation blocks recommendation run creation
      expect(response.status()).toBe(400)
      expect(responseText).toMatch(/incomplete|required|missing/)
    })

    test('[P0][AC2] recommendation runs endpoint is user-scoped and returns newest-first order', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      const attackerUserId = `user_${faker.string.alphanumeric(10)}`
      await ensureAuthenticatedRequest(request, appBaseUrl)

      // Given an authenticated user requests their run history
      const baselineResponse = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const baselineBody = await baselineResponse.json() as RecommendationRunApiRecord[]

      // When the same user attempts query tampering with another user identifier
      const tamperedResponse = await request.get(
        `${routeProbe.recommendationRunsApiPath}?userId=${attackerUserId}`,
        { failOnStatusCode: false },
      )
      const tamperedBody = await tamperedResponse.json() as RecommendationRunApiRecord[]

      // Then response scope stays bound to the authenticated session
      expect(baselineResponse.status()).toBe(200)
      expect(tamperedResponse.status()).toBe(200)
      expect(tamperedBody).toEqual(baselineBody)

      for (let index = 0; index < baselineBody.length - 1; index += 1) {
        const currentCreatedAt = new Date(baselineBody[index]!.createdAt).getTime()
        const nextCreatedAt = new Date(baselineBody[index + 1]!.createdAt).getTime()
        expect(currentCreatedAt).toBeGreaterThanOrEqual(nextCreatedAt)
      }
    })

    test('[P1][AC4] run listing keeps metadata minimal without recommendation-detail leakage', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)

      // Given recommendation runs are listed for an authenticated user
      const response = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const runs = await response.json() as RecommendationRunApiRecord[]

      // Then each record remains within minimum metadata for this epic
      expect(response.status()).toBe(200)
      for (const run of runs) {
        expect(Object.keys(run).sort()).toEqual([...RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS].sort())
      }
    })

    test('[P0][AC2][AC5] repeated submissions create distinct run records in reverse-chronological order', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await seedDraft(request, routeProbe, createCompletedIntakeDraftPayload())

      // Given a completed intake can be submitted repeatedly over time
      // When submission is called twice
      const firstSubmitResponse = await request.post(routeProbe.submitApiPath, { failOnStatusCode: false })
      const secondSubmitResponse = await request.post(routeProbe.submitApiPath, { failOnStatusCode: false })
      expect(firstSubmitResponse.status()).toBe(201)
      expect(secondSubmitResponse.status()).toBe(201)

      // Then two distinct run records are visible with newest-first ordering
      const runsResponse = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const runs = await runsResponse.json() as RecommendationRunApiRecord[]

      expect(runsResponse.status()).toBe(200)
      expect(runs.length).toBeGreaterThanOrEqual(2)
      expect(runs[0]?.runId).not.toBe(runs[1]?.runId)

      if (runs[0]?.createdAt && runs[1]?.createdAt) {
        expect(new Date(runs[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(runs[1].createdAt).getTime())
      }
    })
  })
})
