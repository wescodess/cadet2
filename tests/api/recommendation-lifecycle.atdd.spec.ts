import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import { createCompletedIntakeDraftPayload } from '../support/fixtures/factories/intake-submit-factory'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import {
  RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES,
  RECOMMENDATION_LIFECYCLE_FORBIDDEN_PROVIDER_FIELDS,
  RECOMMENDATION_LIFECYCLE_IN_PROGRESS_STATUSES,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-lifecycle-api-${seed}@example.com`
}

function uniqueLifecycleRunId(prefix: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${seed}`
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
      name: 'Recommendation Lifecycle API Test User',
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
      `Could not establish authenticated API session for recommendation lifecycle tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function seedQueuedRun(request: APIRequestContext, appBaseUrl: string): Promise<RecommendationLifecycleRecord> {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
  const draftPayload = createCompletedIntakeDraftPayload()

  const draftResponse = await request.post(routeProbe.draftApiPath, {
    data: draftPayload,
    failOnStatusCode: false,
  })
  expect(draftResponse.status()).toBe(200)

  const submitResponse = await request.post(routeProbe.submitApiPath, {
    failOnStatusCode: false,
  })
  expect(submitResponse.status()).toBe(201)

  const run = await submitResponse.json() as RecommendationLifecycleRecord

  expect(run.status).toBe('queued')
  expect(typeof run.runId).toBe('string')
  expect(typeof run.profileSnapshotId).toBe('string')

  return run
}

async function resetRecommendationRuns(request: APIRequestContext, appBaseUrl: string) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/reset`, {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function seedRecommendationRun(
  request: APIRequestContext,
  appBaseUrl: string,
  input: (Partial<RecommendationLifecycleRecord> & {
    status: RecommendationLifecycleRecord['status']
  }) & {
    resetExisting?: boolean
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: input,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as RecommendationLifecycleRecord
}

test.describe('Story 2.1 Recommendation Lifecycle API ATDD', () => {
  test('[P0][AC1][AC2] unauthenticated user cannot start recommendation processing', async ({ request, appBaseUrl }) => {
    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const response = await request.post(routeProbe.recommendationRunStartPath('run_not_authenticated'), {
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(401)
  })

  test.describe('authenticated standard user', () => {
    test('[P0][AC1][AC2] start endpoint advances queued run lifecycle while preserving linkage fields', async ({
      request,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await resetRecommendationRuns(request, appBaseUrl)
      const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
      const seededRun = await seedQueuedRun(request, appBaseUrl)

      const response = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
        failOnStatusCode: false,
      })
      const body = await response.json() as RecommendationLifecycleRecord
      const persistedStatusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
        failOnStatusCode: false,
      })
      const persistedBody = await persistedStatusResponse.json() as RecommendationLifecycleRecord

      expect(response.status()).toBe(200)
      expect(persistedStatusResponse.status()).toBe(200)
      expect(body.runId).toBe(seededRun.runId)
      expect(body.profileSnapshotId).toBe(seededRun.profileSnapshotId)
      expect(RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES).toContain(body.status)
      expect(body.status).not.toBe('queued')
      expect(persistedBody.status).toBe(body.status)
      expect(RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES).toContain(body.status)
    })

    test('[P0][AC2] status endpoint returns canonical lifecycle states only and provider-agnostic payload', async ({
      request,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await resetRecommendationRuns(request, appBaseUrl)
      const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
      const seededRun = await seedQueuedRun(request, appBaseUrl)

      const response = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
        failOnStatusCode: false,
      })
      const body = await response.json() as RecommendationLifecycleRecord & Record<string, unknown>

      expect(response.status()).toBe(200)
      expect(RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES).toContain(body.status)

      for (const forbiddenField of RECOMMENDATION_LIFECYCLE_FORBIDDEN_PROVIDER_FIELDS) {
        expect(Object.prototype.hasOwnProperty.call(body, forbiddenField)).toBe(false)
      }
    })

    test('[P0][AC1][AC2] start and status operations deny unknown or non-owned run identifiers', async ({
      request,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await resetRecommendationRuns(request, appBaseUrl)
      const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
      const unknownRunId = 'run_unknown_or_not_owned_2_1'

      const startResponse = await request.post(routeProbe.recommendationRunStartPath(unknownRunId), {
        failOnStatusCode: false,
      })
      const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(unknownRunId), {
        failOnStatusCode: false,
      })

      expect([403, 404]).toContain(startResponse.status())
      expect([403, 404]).toContain(statusResponse.status())
    })

    test('[P0][AC4] recoverable delay contract keeps run resumable and in-progress', async ({ request, appBaseUrl }) => {
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await resetRecommendationRuns(request, appBaseUrl)
      const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
      const seededRun = await seedQueuedRun(request, appBaseUrl)

      const response = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
        data: { mode: 'recoverable-delay' },
        failOnStatusCode: false,
      })
      const body = await response.json() as RecommendationLifecycleRecord

      expect(response.status()).toBe(200)
      expect(RECOMMENDATION_LIFECYCLE_IN_PROGRESS_STATUSES).toContain(body.status)
      expect(body.resumable).toBe(true)
    })

    test('[P1][AC4] repeated start requests are idempotent for the same run', async ({ request, appBaseUrl }) => {
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await resetRecommendationRuns(request, appBaseUrl)
      const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
      const seededRun = await seedQueuedRun(request, appBaseUrl)

      const firstStart = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
        failOnStatusCode: false,
      })
      const secondStart = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
        failOnStatusCode: false,
      })

      const firstBody = await firstStart.json() as RecommendationLifecycleRecord
      const secondBody = await secondStart.json() as RecommendationLifecycleRecord

      expect(firstStart.status()).toBe(200)
      expect(secondStart.status()).toBe(200)
      expect(firstBody.runId).toBe(seededRun.runId)
      expect(secondBody.runId).toBe(seededRun.runId)
      expect(RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES).toContain(firstBody.status)
      expect(firstBody.status).not.toBe('queued')
      expect(RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES).toContain(secondBody.status)
      expect(secondBody.status).not.toBe('queued')
    })

    test('[P1][AC4][AC5] deterministic provider-mock modes force degraded and failed terminal lifecycle states', async ({
      request,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await resetRecommendationRuns(request, appBaseUrl)
      const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
      const degradedRunId = uniqueLifecycleRunId('run_story21_mock_degraded')
      const degradedSnapshotId = uniqueLifecycleRunId('snapshot_story21_mock_degraded')

      const degradedSeed = await seedRecommendationRun(request, appBaseUrl, {
        runId: degradedRunId,
        profileSnapshotId: degradedSnapshotId,
        status: 'evaluating',
        resetExisting: true,
      })

      const degradedResponse = await request.post(routeProbe.recommendationRunStartPath(degradedSeed.runId), {
        data: { mode: 'mock-degraded' },
        failOnStatusCode: false,
      })
      const degradedBody = await degradedResponse.json() as RecommendationLifecycleRecord
      expect(degradedResponse.status()).toBe(200)
      expect(degradedBody.status).toBe('degraded')
      expect(degradedBody.resumable).toBe(false)

      const failedRunId = uniqueLifecycleRunId('run_story21_mock_failed')
      const failedSnapshotId = uniqueLifecycleRunId('snapshot_story21_mock_failed')

      const failedSeed = await seedRecommendationRun(request, appBaseUrl, {
        runId: failedRunId,
        profileSnapshotId: failedSnapshotId,
        status: 'evaluating',
      })

      const failedResponse = await request.post(routeProbe.recommendationRunStartPath(failedSeed.runId), {
        data: { mode: 'mock-failed' },
        failOnStatusCode: false,
      })
      const failedBody = await failedResponse.json() as RecommendationLifecycleRecord
      expect(failedResponse.status()).toBe(200)
      expect(failedBody.status).toBe('failed')
      expect(failedBody.resumable).toBe(false)
    })
  })
})
