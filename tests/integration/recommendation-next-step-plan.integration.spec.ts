import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationNextStepPlanEvaluationPayload,
  type RecommendationCandidateWithNextStepPlan,
  type RecommendationNextStepPlanResultsResponse,
} from '../support/fixtures/factories/recommendation-next-step-plan-factory'
import { createRecommendationComparisonFallbackEvaluationPayload } from '../support/fixtures/factories/recommendation-comparison-factory'
import { createRecommendationLifecycleRouteProbe } from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueId(prefix: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${seed}`
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-next-step-plan-integration-${seed}@example.com`
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
      name: 'Recommendation Next Step Plan Integration Test User',
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
      `Could not establish authenticated session for recommendation next-step plan integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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
      ...input,
      status: 'queued',
      resetExisting: true,
    },
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

function allCandidates(body: RecommendationNextStepPlanResultsResponse): RecommendationCandidateWithNextStepPlan[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

test.describe('Story 4.1 Recommendation Next-Step Plan Integration', () => {
  test('[P0][AC1][AC2][AC3] next-step plans remain recommendation-specific while comparison, citations, and trust metadata stay intact', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const runId = uniqueId('run_story41_integration_mixed')
    const profileSnapshotId = uniqueId('snapshot_story41_integration_mixed')

    await seedRecommendationRun(request, appBaseUrl, {
      runId,
      profileSnapshotId,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(runId), {
      failOnStatusCode: false,
    })
    expect(resultsResponse.status()).toBe(200)

    const body = await resultsResponse.json() as RecommendationNextStepPlanResultsResponse
    const candidates = allCandidates(body)
    const comparison = body.comparison as { mode?: string } | null

    expect(comparison).toBeTruthy()
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(candidate.nextStepPlan.summary.trim().length).toBeGreaterThan(0)
      expect(candidate.nextStepPlan.steps.length).toBeGreaterThan(0)
      expect(Array.isArray(candidate.improvementActions)).toBe(true)
      expect(Array.isArray(candidate.tradeoffs)).toBe(true)
      expect(Array.isArray(candidate.citations)).toBe(true)
      expect(candidate.trustBoundary).toBeTruthy()
      expect(candidate.pathwayType.label.trim().length).toBeGreaterThan(0)
    }

    const blockedCandidate = body.results.blocked[0]
    const composedCandidate = body.results.composed[0]

    expect(blockedCandidate?.nextStepPlan.limitation.trim().length || 0).toBeGreaterThan(0)
    expect(composedCandidate?.nextStepPlan.steps.length || 0).toBeGreaterThanOrEqual(2)
  })

  test('[P1][AC3] blocked-only fallback comparison still carries cautious next-step plans without dropping comparison framing', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const runId = uniqueId('run_story41_integration_fallback')
    const profileSnapshotId = uniqueId('snapshot_story41_integration_fallback')

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

    const body = await resultsResponse.json() as RecommendationNextStepPlanResultsResponse
    const comparison = body.comparison as { mode?: string } | null

    expect(comparison?.mode).toBe('fallback')
    expect(body.results.direct).toHaveLength(0)
    expect(body.results.composed).toHaveLength(0)
    expect(body.results.blocked.length).toBeGreaterThan(0)

    for (const candidate of body.results.blocked) {
      expect(candidate.nextStepPlan.summary).toMatch(/(block|close|unlock|planning)/i)
      expect(candidate.nextStepPlan.limitation.trim().length).toBeGreaterThan(0)
      expect(Array.isArray(candidate.citations)).toBe(true)
      expect(candidate.trustBoundary).toBeTruthy()
    }
  })
})
