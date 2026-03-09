import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationComparisonEvaluationPayload,
  createRecommendationComparisonFallbackEvaluationPayload,
  type RecommendationComparisonResultsResponse,
} from '../support/fixtures/factories/recommendation-comparison-factory'
import { createRecommendationLifecycleRouteProbe } from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueId(prefix: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${seed}`
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-comparison-integration-${seed}@example.com`
}

async function describeAuthFailure(response: Awaited<ReturnType<APIRequestContext['post']>>) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
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
  input: {
    runId: string
    profileSnapshotId: string
    submittedPayload: unknown
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: {
      ...input,
      status: 'queued',
      resetExisting: true,
    },
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function ensureAuthenticatedRequest(request: APIRequestContext, appBaseUrl: string) {
  const email = uniqueAuthEmail()
  const password = 'PlaywrightPass123!'

  const response = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email,
      password,
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (response.ok()) {
    return
  }

  const signUp = await request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email,
      password,
      name: 'Recommendation Comparison Integration Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUp.ok()) {
    const [signInFailure, signUpFailure] = await Promise.all([
      describeAuthFailure(response),
      describeAuthFailure(signUp),
    ])

    throw new Error(
      `Could not establish authenticated session for recommendation comparison integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

test.describe('Story 3.3 Recommendation Comparison Integration', () => {
  test('[P0][AC1][AC2][AC3] mixed recommendation classes remain distinct through status and results reads', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const runId = uniqueId('run_story33_integration_mixed')
    const profileSnapshotId = uniqueId('snapshot_story33_integration_mixed')

    await seedRecommendationRun(request, appBaseUrl, {
      runId,
      profileSnapshotId,
      submittedPayload: createRecommendationComparisonEvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(runId), {
      failOnStatusCode: false,
    })
    expect(statusResponse.status()).toBe(200)

    const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(runId), {
      failOnStatusCode: false,
    })
    expect(resultsResponse.status()).toBe(200)

    const body = await resultsResponse.json() as RecommendationComparisonResultsResponse

    expect(body.comparison.mode).toBe('workspace')
    expect(body.comparison.groups.map(group => group.key)).toEqual(['direct', 'blocked', 'composed'])
    expect(body.results.direct.length).toBeGreaterThan(0)
    expect(body.results.blocked.length).toBeGreaterThan(0)
    expect(body.results.composed.length).toBeGreaterThan(0)
    expect(body.results.direct[0]?.pathwayType.label).toBe('Available now')
    expect(body.results.blocked[0]?.pathwayType.label).toBe('Blocked but close')
    expect(body.results.composed[0]?.pathwayType.label).toBe('Strategic multi-step')
  })

  test('[P0][AC4] blocked-only recommendation runs return fallback comparison framing without losing next-step context', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const runId = uniqueId('run_story33_integration_fallback')
    const profileSnapshotId = uniqueId('snapshot_story33_integration_fallback')

    await seedRecommendationRun(request, appBaseUrl, {
      runId,
      profileSnapshotId,
      submittedPayload: createRecommendationComparisonFallbackEvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(runId), {
      failOnStatusCode: false,
    })
    expect(resultsResponse.status()).toBe(200)

    const body = await resultsResponse.json() as RecommendationComparisonResultsResponse

    expect(body.comparison.mode).toBe('fallback')
    expect(body.comparison.groups).toHaveLength(1)
    expect(body.comparison.groups[0]?.key).toBe('blocked')
    expect(body.results.blocked.length).toBeGreaterThan(0)
    expect(body.results.blocked[0]?.improvementActions.length).toBeGreaterThan(0)
    expect(body.results.blocked[0]?.tradeoffs.length).toBeGreaterThan(0)
    expect(body.noComposedReason || '').not.toHaveLength(0)
  })
})
