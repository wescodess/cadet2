import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createCitationEvaluationPayload,
  createDegradedCitationEvaluationPayload,
  type RecommendationCitationsResultsResponse,
  type RecommendationCandidateWithCitations,
} from '../support/fixtures/factories/recommendation-citations-factory'
import {
  createRecommendationLifecycleRouteProbe,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import {
  RECOMMENDATION_TRUST_BOUNDARY_VALUES,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueId(prefix: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${seed}`
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-citations-integration-${seed}@example.com`
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
      name: 'Recommendation Citations Integration Test User',
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
      `Could not establish authenticated session for recommendation citations integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

function allCandidates(body: RecommendationCitationsResultsResponse): RecommendationCandidateWithCitations[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

test.describe('Story 3.4 Recommendation Citations Integration', () => {
  test('[P0][AC1][AC2][AC3] citation and trust metadata flow through start, status, and results reads without regressing comparison metadata', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const runId = uniqueId('run_story34_integration_mixed')
    const profileSnapshotId = uniqueId('snapshot_story34_integration_mixed')

    await seedRecommendationRun(request, appBaseUrl, {
      runId,
      profileSnapshotId,
      submittedPayload: createCitationEvaluationPayload(),
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

    const body = await resultsResponse.json() as RecommendationCitationsResultsResponse
    const candidates = allCandidates(body)

    expect(body.comparison).toBeDefined()
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(Array.isArray(candidate.blockers)).toBe(true)
      expect(Array.isArray(candidate.tradeoffs)).toBe(true)
      expect(Array.isArray(candidate.improvementActions)).toBe(true)
      expect(Array.isArray(candidate.citations)).toBe(true)
      expect(RECOMMENDATION_TRUST_BOUNDARY_VALUES).toContain(candidate.trustBoundary)
    }
  })

  test('[P1][AC3] failed recommendation outputs preserve empty citation arrays and trust-boundary fields instead of omitting them', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const runId = uniqueId('run_story34_integration_failed')
    const profileSnapshotId = uniqueId('snapshot_story34_integration_failed')

    await seedRecommendationRun(request, appBaseUrl, {
      runId,
      profileSnapshotId,
      submittedPayload: createDegradedCitationEvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(runId), {
      failOnStatusCode: false,
    })
    expect(resultsResponse.status()).toBe(200)

    const body = await resultsResponse.json() as RecommendationCitationsResultsResponse
    const candidates = allCandidates(body)

    expect(body.status).toBe('failed')

    for (const candidate of candidates) {
      expect(Array.isArray(candidate.citations)).toBe(true)
      expect(candidate.citations).toHaveLength(0)
      expect(RECOMMENDATION_TRUST_BOUNDARY_VALUES).toContain(candidate.trustBoundary)
    }
  })
})
