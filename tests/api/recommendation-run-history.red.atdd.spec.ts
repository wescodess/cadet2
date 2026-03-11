import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import { createRecommendationNextStepPlanEvaluationPayload } from '../support/fixtures/factories/recommendation-next-step-plan-factory'
import {
  type RecommendationRunHistoryDetailResponse,
  type RecommendationRunHistorySummary,
  createRecommendationRunHistoryRouteProbe,
} from '../support/fixtures/factories/recommendation-run-history-factory'
import {
  RECOMMENDATION_CITATION_SOURCE_TYPES,
  RECOMMENDATION_TRUST_BOUNDARY_VALUES,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-run-history-api-red-${seed}@example.com`
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
      name: 'Recommendation Run History API Red-Phase Test User',
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
      `Could not establish authenticated session for recommendation run history API red-phase tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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
    status: 'queued' | 'completed' | 'degraded' | 'failed'
    resetExisting?: boolean
    submittedPayload?: unknown
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: input,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as { runId: string; profileSnapshotId: string; status: string }
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

test.describe('Story 4.2 Recommendation Run History API RED ATDD', () => {
  test('[P0][AC1][AC7] workspace run history endpoint returns newest-first summaries with latest metadata and status filtering', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationRunHistoryRouteProbe(appBaseUrl)

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const degradedRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story42-api-degraded'),
      profileSnapshotId: uniqueId('story42-api-degraded-snapshot'),
      status: 'degraded',
      resetExisting: true,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story42-api-failed'),
      profileSnapshotId: uniqueId('story42-api-failed-snapshot'),
      status: 'failed',
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    const latestCompletedRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story42-api-completed'),
      profileSnapshotId: uniqueId('story42-api-completed-snapshot'),
      status: 'queued',
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, latestCompletedRun.runId)

    const historyResponse = await request.get(routeProbe.historyApiPath, {
      failOnStatusCode: false,
    })
    const historyBody = await historyResponse.json() as { runs: RecommendationRunHistorySummary[] }

    expect(historyResponse.status()).toBe(200)
    expect(Array.isArray(historyBody.runs)).toBe(true)
    expect(historyBody.runs.length).toBeGreaterThanOrEqual(3)
    expect(historyBody.runs[0]?.isLatest).toBe(true)

    for (let index = 0; index < historyBody.runs.length - 1; index += 1) {
      const currentCreatedAt = new Date(historyBody.runs[index]!.createdAt).getTime()
      const nextCreatedAt = new Date(historyBody.runs[index + 1]!.createdAt).getTime()
      expect(currentCreatedAt).toBeGreaterThanOrEqual(nextCreatedAt)
    }

    const degradedOnlyResponse = await request.get(routeProbe.historyApiPathWithStatus('degraded'), {
      failOnStatusCode: false,
    })
    const degradedOnlyBody = await degradedOnlyResponse.json() as { runs: RecommendationRunHistorySummary[] }

    expect(degradedOnlyResponse.status()).toBe(200)
    expect(degradedOnlyBody.runs.length).toBeGreaterThanOrEqual(1)
    expect(degradedOnlyBody.runs.some(run => run.id === degradedRun.runId)).toBe(true)
    expect(degradedOnlyBody.runs.every(run => run.status === 'degraded')).toBe(true)
  })

  test('[P0][AC4][AC9] run detail endpoint returns preserved snapshot, recommendations, citations, and trust metadata for a selected run', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationRunHistoryRouteProbe(appBaseUrl)

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story42-api-detail'),
      profileSnapshotId: uniqueId('story42-api-detail-snapshot'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, seededRun.runId)

    const response = await request.get(routeProbe.historyRunApiPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    const body = await response.json() as RecommendationRunHistoryDetailResponse

    expect(response.status()).toBe(200)
    expect(body.available).toBe(true)

    if (!body.available) {
      throw new Error(`Expected preserved detail payload for ${seededRun.runId}.`)
    }

    expect(body.run.id).toBe(seededRun.runId)
    expect(body.profileSnapshot.id).toBe(seededRun.profileSnapshotId)
    expect(body.profileSnapshot.summary.trim().length).toBeGreaterThan(0)

    const candidates = [...body.results.direct, ...body.results.blocked, ...body.results.composed]
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(candidate.summary.trim().length).toBeGreaterThan(0)
      expect(RECOMMENDATION_TRUST_BOUNDARY_VALUES).toContain(candidate.trustBoundary)
      expect(candidate.nextStepPlan.summary.trim().length).toBeGreaterThan(0)

      for (const step of candidate.nextStepPlan.steps) {
        expect(step.sequence).toBeGreaterThan(0)
        expect(step.title.trim().length).toBeGreaterThan(0)
      }

      for (const citation of candidate.citations) {
        expect(RECOMMENDATION_CITATION_SOURCE_TYPES).toContain(citation.sourceType)
        expect(citation.claimText.trim().length).toBeGreaterThan(0)
        expect(citation.sourceUrl.trim().length).toBeGreaterThan(0)
      }
    }
  })

  test('[P0][AC5] unavailable archived runs return 404 with available=false and a user-safe explanation', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationRunHistoryRouteProbe(appBaseUrl)

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story42-api-unavailable'),
      profileSnapshotId: uniqueId('story42-api-unavailable-snapshot'),
      status: 'failed',
      resetExisting: true,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    const response = await request.get(routeProbe.historyRunApiPath('story42-archived-expired-run'), {
      failOnStatusCode: false,
    })
    const body = await response.json() as RecommendationRunHistoryDetailResponse

    expect(response.status()).toBe(404)
    expect(body.available).toBe(false)

    if (body.available) {
      throw new Error('Expected an unavailable response for an expired run.')
    }

    expect(body.reason.trim().length).toBeGreaterThan(0)
    expect(body.reason).toMatch(/(unavailable|expired|archived|retention)/i)
  })

  test('[P1][AC1][AC9] run history remains workspace-scoped and does not disclose another user run when a foreign id is requested', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationRunHistoryRouteProbe(appBaseUrl)

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story42-api-owned'),
      profileSnapshotId: uniqueId('story42-api-owned-snapshot'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    const response = await request.get(routeProbe.historyRunApiPath('run_belongs_to_someone_else'), {
      failOnStatusCode: false,
    })

    expect([403, 404]).toContain(response.status())
  })
})
