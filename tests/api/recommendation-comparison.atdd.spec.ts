import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationComparisonEvaluationPayload,
  createRecommendationComparisonFallbackEvaluationPayload,
  createRecommendationComparisonIds,
  type RecommendationComparisonResultsResponse,
} from '../support/fixtures/factories/recommendation-comparison-factory'
import { getTestEnvironment } from '../support/helpers/env'

type SeededRecommendationRun = {
  runId: string
  profileSnapshotId: string
  status: 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-comparison-api-${seed}@example.com`
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
      name: 'Recommendation Comparison API Test User',
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
      `Could not establish authenticated session for recommendation comparison API tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: {
      runId: input.runId,
      profileSnapshotId: input.profileSnapshotId,
      status: 'queued',
      resetExisting: true,
      submittedPayload: input.submittedPayload,
    },
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as SeededRecommendationRun
}

async function startRecommendationRun(request: APIRequestContext, appBaseUrl: string, runId: string) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/start`, {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function readRecommendationResults(request: APIRequestContext, appBaseUrl: string, runId: string) {
  const response = await request.get(`${appBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/results`, {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as RecommendationComparisonResultsResponse
}

function allCandidates(body: RecommendationComparisonResultsResponse) {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

test.describe('Story 3.3 Recommendation Comparison API ATDD', () => {
  test('[P0][AC1][AC2][AC3] recommendation results expose comparison groups, route-type labels, and preserved ranking context', async ({
    request,
    appBaseUrl,
  }) => {
    const ids = createRecommendationComparisonIds('story33-api-comparison')

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: ids.runId,
      profileSnapshotId: ids.profileSnapshotId,
      submittedPayload: createRecommendationComparisonEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, seededRun.runId)
    const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

    expect(results.comparison.mode).toBe('workspace')
    expect(results.comparison.visibleGroupCount).toBeGreaterThan(1)
    expect(results.comparison.totalCandidateCount).toBeGreaterThan(1)
    expect(results.comparison.groups.map(group => group.key)).toEqual(['direct', 'blocked', 'composed'])

    expect(results.results.direct[0]?.pathwayType.key).toBe('available-now')
    expect(results.results.blocked[0]?.pathwayType.key).toBe('blocked-but-close')
    expect(results.results.composed[0]?.pathwayType.key).toBe('strategic-multi-step')
    expect(results.results.blocked.length).toBeGreaterThan(0)

    for (const group of [results.results.direct, results.results.blocked, results.results.composed]) {
      const groupRanks = group.map(candidate => candidate.rank)
      expect(groupRanks).toEqual([...groupRanks].sort((left, right) => left - right))
    }

    const distinctRanks = [...new Set(allCandidates(results).map(candidate => candidate.rank))].sort((left, right) => left - right)
    expect(distinctRanks.length).toBe(allCandidates(results).length)
  })

  test('[P0][AC4] recommendation results expose structured fallback metadata when comparison is limited to one pathway class', async ({
    request,
    appBaseUrl,
  }) => {
    const ids = createRecommendationComparisonIds('story33-api-fallback')

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: ids.runId,
      profileSnapshotId: ids.profileSnapshotId,
      submittedPayload: createRecommendationComparisonFallbackEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, seededRun.runId)
    const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

    expect(results.comparison.mode).toBe('fallback')
    expect(results.comparison.visibleGroupCount).toBe(1)
    expect(results.comparison.groups).toHaveLength(1)
    expect(results.comparison.groups[0]?.key).toBe('blocked')
    expect(results.comparison.limitation || '').toMatch(/blocked-but-close|comparison is limited/i)

    expect(results.results.direct).toHaveLength(0)
    expect(results.results.composed).toHaveLength(0)
    expect(results.results.blocked.length).toBeGreaterThan(0)
    expect(results.results.blocked[0]?.pathwayType.label).toBe('Blocked but close')
    expect(results.noComposedReason || '').not.toHaveLength(0)
  })
})
