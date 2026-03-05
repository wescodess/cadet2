import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'

type RecommendationRefreshResponse = {
  runId: string
  profileSnapshotId: string
  status: RecommendationLifecycleRecord['status']
  refreshedFromRunId: string
  previousProfileSnapshotId: string
  refreshRootRunId?: string
  refreshSequence?: number
  createdAt: string
  updatedAt: string
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-refresh-integration-${seed}@example.com`
}

function uniqueId(prefix: string) {
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

  if (signInResponse.ok()) {
    return
  }

  const signUpResponse = await request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email,
      password,
      name: 'Recommendation Refresh Integration Test User',
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
      `Could not establish authenticated session for recommendation refresh integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
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
    status: RecommendationLifecycleRecord['status']
    resetExisting?: boolean
    submittedPayload?: unknown
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: input,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as RecommendationLifecycleRecord
}

async function refreshRecommendationRun(
  request: APIRequestContext,
  appBaseUrl: string,
  runId: string,
) {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
  const response = await request.post(routeProbe.recommendationRunRefreshPath(runId), {
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as RecommendationRefreshResponse,
  }
}

test.describe('Story 2.4 Recommendation Refresh Integration', () => {
  test('[P0][AC2] refresh flow creates a new linked run while preserving source run history', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const sourceRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story24_integration_refresh_source'),
      profileSnapshotId: uniqueId('snapshot_story24_integration_refresh_source'),
      status: 'completed',
      resetExisting: true,
    })

    const refreshResult = await refreshRecommendationRun(request, appBaseUrl, sourceRun.runId)

    expect(refreshResult.response.status()).toBe(202)
    expect(refreshResult.body.runId).not.toBe(sourceRun.runId)
    expect(refreshResult.body.refreshedFromRunId).toBe(sourceRun.runId)
    expect(refreshResult.body.previousProfileSnapshotId).toBe(sourceRun.profileSnapshotId)
    expect(['queued', 'evaluating']).toContain(refreshResult.body.status)

    const sourceStatusResponse = await request.get(routeProbe.recommendationRunStatusPath(sourceRun.runId), {
      failOnStatusCode: false,
    })
    expect(sourceStatusResponse.status()).toBe(200)

    const sourceStatus = await sourceStatusResponse.json() as RecommendationLifecycleRecord
    expect(sourceStatus.status).toBe('completed')
  })

  test('[P1][AC2] consecutive refreshes create a traceable chain of run lineage metadata', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const firstRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story24_integration_refresh_chain_1'),
      profileSnapshotId: uniqueId('snapshot_story24_integration_refresh_chain_1'),
      status: 'completed',
      resetExisting: true,
    })

    const firstRefresh = await refreshRecommendationRun(request, appBaseUrl, firstRun.runId)
    expect(firstRefresh.response.status()).toBe(202)

    const secondRefresh = await refreshRecommendationRun(request, appBaseUrl, firstRefresh.body.runId)
    expect(secondRefresh.response.status()).toBe(202)
    expect(secondRefresh.body.refreshedFromRunId).toBe(firstRefresh.body.runId)
    expect(secondRefresh.body.runId).not.toBe(firstRun.runId)
    expect(secondRefresh.body.refreshRootRunId).toBe(firstRun.runId)
    expect(secondRefresh.body.refreshSequence).toBe(2)
  })

  test('[P1][AC2][AC3] refresh remains owner-scoped and rejects unknown/non-owned runs', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const unknownRefresh = await refreshRecommendationRun(request, appBaseUrl, uniqueId('run_story24_not_owned'))

    expect([403, 404]).toContain(unknownRefresh.response.status())
  })
})
