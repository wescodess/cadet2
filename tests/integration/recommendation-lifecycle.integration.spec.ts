import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-lifecycle-integration-${seed}@example.com`
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
      name: 'Recommendation Lifecycle Integration Test User',
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
      `Could not establish authenticated session for recommendation lifecycle integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: input,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as RecommendationLifecycleRecord
}

test.describe('Story 2.1 Recommendation Lifecycle Integration', () => {
  test('[P0][AC4] recoverable delay keeps evaluating runs active/resumable and readable through status endpoint', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story21_integration_delay'),
      profileSnapshotId: uniqueId('snapshot_story21_integration_delay'),
      status: 'evaluating',
      resetExisting: true,
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      data: { mode: 'recoverable-delay' },
      failOnStatusCode: false,
    })
    const startBody = await startResponse.json() as RecommendationLifecycleRecord

    expect(startResponse.status()).toBe(200)
    expect(startBody.status).toBe('evaluating')
    expect(startBody.resumable).toBe(true)

    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    const statusBody = await statusResponse.json() as RecommendationLifecycleRecord

    expect(statusResponse.status()).toBe(200)
    expect(statusBody.status).toBe('evaluating')
    expect(statusBody.resumable).toBe(true)
  })

  test('[P0][AC4][AC5] terminal mock transitions persist through status reads (completed/degraded/failed)', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)

    const terminalCases = [
      { mode: 'mock-completed' as const, expectedStatus: 'completed' as const },
      { mode: 'mock-degraded' as const, expectedStatus: 'degraded' as const },
      { mode: 'mock-failed' as const, expectedStatus: 'failed' as const },
    ]

    for (const terminalCase of terminalCases) {
      const seededRun = await seedRecommendationRun(request, appBaseUrl, {
        runId: uniqueId(`run_story21_integration_${terminalCase.expectedStatus}`),
        profileSnapshotId: uniqueId(`snapshot_story21_integration_${terminalCase.expectedStatus}`),
        status: 'evaluating',
      })

      const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
        data: { mode: terminalCase.mode },
        failOnStatusCode: false,
      })
      const startBody = await startResponse.json() as RecommendationLifecycleRecord

      expect(startResponse.status()).toBe(200)
      expect(startBody.status).toBe(terminalCase.expectedStatus)
      expect(startBody.resumable).toBe(false)

      const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
        failOnStatusCode: false,
      })
      const statusBody = await statusResponse.json() as RecommendationLifecycleRecord

      expect(statusResponse.status()).toBe(200)
      expect(statusBody.status).toBe(terminalCase.expectedStatus)
      expect(statusBody.resumable).toBe(false)
    }
  })
})
