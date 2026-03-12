import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationComparisonEvaluationPayload,
  createRecommendationComparisonFallbackEvaluationPayload,
} from '../support/fixtures/factories/recommendation-comparison-factory'
import { getTestEnvironment } from '../support/helpers/env'

type RunComparisonResponse = {
  comparisonAvailable: boolean
  unavailableReason?: string
  summary: {
    added: number
    removed: number
    changed: number
    overallConfidenceChange: number
    newEvidenceCount: number
  }
  pathwayChanges: Array<{
    pathwayId: string
    changeType: string
  }>
  trustChanges: Array<{
    pathwayId: string
  }>
  caveatChanges: {
    added: unknown[]
    removed: unknown[]
  }
  profileDelta: null | {
    changedFieldCount: number
  }
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-run-comparison-api-${seed}@example.com`
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
      name: 'Run Comparison API Test User',
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
      `Could not establish authenticated session for run comparison API tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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
    submittedPayload: unknown
    resetExisting?: boolean
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: {
      ...input,
      status: 'queued',
    },
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as { runId: string }
}

async function startRecommendationRun(
  request: APIRequestContext,
  appBaseUrl: string,
  runId: string,
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/start`, {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

test.describe('Story 4.3 Run Comparison API', () => {
  test('[P0][AC1][AC3][AC4][AC5] compare endpoint returns structured diffs, trust metadata changes, and profile deltas for two preserved runs', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const olderRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story43-older'),
      profileSnapshotId: uniqueId('story43-older-snapshot'),
      submittedPayload: createRecommendationComparisonFallbackEvaluationPayload(),
      resetExisting: true,
    })

    await startRecommendationRun(request, appBaseUrl, olderRun.runId)

    const newerRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story43-newer'),
      profileSnapshotId: uniqueId('story43-newer-snapshot'),
      submittedPayload: createRecommendationComparisonEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, newerRun.runId)

    const response = await request.get(
      `${appBaseUrl}/api/workspace/runs/compare?runA=${encodeURIComponent(olderRun.runId)}&runB=${encodeURIComponent(newerRun.runId)}`,
      { failOnStatusCode: false },
    )
    const body = await response.json() as RunComparisonResponse

    expect(response.status()).toBe(200)
    expect(body.comparisonAvailable).toBe(true)
    expect(body.summary.changed).toBeGreaterThan(0)
    expect(body.pathwayChanges.length).toBeGreaterThan(0)
    expect(body.pathwayChanges.some(change => change.changeType !== 'unchanged')).toBe(true)
    expect(body.trustChanges.length).toBeGreaterThan(0)
    expect(body.profileDelta?.changedFieldCount || 0).toBeGreaterThan(0)
  })

  test('[P0][AC2] compare endpoint returns a comparison-unavailable payload when either run cannot be compared', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const availableRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story43-available'),
      profileSnapshotId: uniqueId('story43-available-snapshot'),
      submittedPayload: createRecommendationComparisonEvaluationPayload(),
      resetExisting: true,
    })

    await startRecommendationRun(request, appBaseUrl, availableRun.runId)

    const response = await request.get(
      `${appBaseUrl}/api/workspace/runs/compare?runA=${encodeURIComponent(availableRun.runId)}&runB=${encodeURIComponent('missing-run')}`,
      { failOnStatusCode: false },
    )
    const body = await response.json() as RunComparisonResponse

    expect(response.status()).toBe(200)
    expect(body.comparisonAvailable).toBe(false)
    expect(body.unavailableReason || '').toMatch(/unavailable|missing|compare/i)
    expect(body.pathwayChanges).toHaveLength(0)
  })

  test('[P1][AC2] compare endpoint rejects same-run comparisons with a safe unavailable response', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const run = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story43-same-run'),
      profileSnapshotId: uniqueId('story43-same-run-snapshot'),
      submittedPayload: createRecommendationComparisonEvaluationPayload(),
      resetExisting: true,
    })

    await startRecommendationRun(request, appBaseUrl, run.runId)

    const response = await request.get(
      `${appBaseUrl}/api/workspace/runs/compare?runA=${encodeURIComponent(run.runId)}&runB=${encodeURIComponent(run.runId)}`,
      { failOnStatusCode: false },
    )
    const body = await response.json() as RunComparisonResponse

    expect(response.status()).toBe(200)
    expect(body.comparisonAvailable).toBe(false)
    expect(body.unavailableReason || '').toMatch(/same run/i)
  })

  test('[P1] compare endpoint requires an authenticated workspace session', async ({
    request,
    appBaseUrl,
  }) => {
    const response = await request.get(
      `${appBaseUrl}/api/workspace/runs/compare?runA=one&runB=two`,
      { failOnStatusCode: false },
    )

    expect([302, 401]).toContain(response.status())
  })
})
