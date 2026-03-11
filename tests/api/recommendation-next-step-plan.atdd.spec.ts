import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationNextStepPlanEvaluationPayload,
  createRecommendationNextStepPlanIds,
  type RecommendationCandidateWithNextStepPlan,
  type RecommendationNextStepPlanResultsResponse,
} from '../support/fixtures/factories/recommendation-next-step-plan-factory'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-next-step-plan-api-${seed}@example.com`
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
      name: 'Recommendation Next Step Plan API Test User',
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
      `Could not establish authenticated session for recommendation next-step plan API tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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
  return await response.json() as { runId: string; profileSnapshotId: string; status: string }
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
  return await response.json() as RecommendationNextStepPlanResultsResponse
}

function allCandidates(body: RecommendationNextStepPlanResultsResponse): RecommendationCandidateWithNextStepPlan[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

test.describe('Story 4.1 Recommendation Next-Step Plan API ATDD', () => {
  test('[P0][AC1] recommendation results expose a next-step plan with summary framing and ordered concrete user actions', async ({
    request,
    appBaseUrl,
  }) => {
    const ids = createRecommendationNextStepPlanIds('story41-api-next-step-plan')

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: ids.runId,
      profileSnapshotId: ids.profileSnapshotId,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, seededRun.runId)
    const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

    const candidates = allCandidates(results)
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(candidate.nextStepPlan.summary.trim().length).toBeGreaterThan(0)
      expect(Array.isArray(candidate.nextStepPlan.steps)).toBe(true)
      expect(candidate.nextStepPlan.steps.length).toBeGreaterThan(0)

      for (const [index, step] of candidate.nextStepPlan.steps.entries()) {
        expect(step.sequence).toBe(index + 1)
        expect(step.title.trim().length).toBeGreaterThan(0)
        expect(step.detail.trim().length).toBeGreaterThan(0)
        expect(['now', 'next', 'later']).toContain(step.priority)
        expect(step.title).toMatch(/^(Gather|Prepare|Review|Confirm|Check|Request|Compare|Update|Complete|Submit|Book)\b/i)
      }
    }
  })

  test('[P0][AC2] multiple recommendations keep recommendation-specific action plans rather than collapsing into a generic checklist', async ({
    request,
    appBaseUrl,
  }) => {
    const ids = createRecommendationNextStepPlanIds('story41-api-recommendation-specificity')

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: ids.runId,
      profileSnapshotId: ids.profileSnapshotId,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, seededRun.runId)
    const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

    const candidates = allCandidates(results)
    expect(candidates.length).toBeGreaterThanOrEqual(2)

    const planSummaries = new Set(candidates.map(candidate => candidate.nextStepPlan.summary.trim()))
    expect(planSummaries.size).toBeGreaterThanOrEqual(2)

    for (const candidate of candidates) {
      expect(candidate.nextStepPlan.summary.trim().length).toBeGreaterThan(0)

      if (candidate.type === 'blocked') {
        expect(candidate.nextStepPlan.summary).toMatch(/(block|gap|close|unlock)/i)
      }

      if (candidate.type === 'composed') {
        expect(candidate.nextStepPlan.steps.length).toBeGreaterThanOrEqual(2)
        expect(candidate.nextStepPlan.steps[0]?.sequence).toBe(1)
      }
    }
  })

  test('[P0][AC3] blocked or low-confidence recommendations include limitation language that tempers the action plan', async ({
    request,
    appBaseUrl,
  }) => {
    const ids = createRecommendationNextStepPlanIds('story41-api-next-step-plan-limitations')

    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: ids.runId,
      profileSnapshotId: ids.profileSnapshotId,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, seededRun.runId)
    const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

    const riskyCandidates = allCandidates(results).filter(candidate =>
      candidate.type === 'blocked'
      || candidate.qualification === 'low-confidence'
      || candidate.confidence === 'low'
      || candidate.qualification === 'withheld',
    )

    expect(riskyCandidates.length).toBeGreaterThan(0)

    for (const candidate of riskyCandidates) {
      expect(candidate.nextStepPlan.limitation.trim().length).toBeGreaterThan(0)
      expect(candidate.nextStepPlan.limitation).toMatch(/(do not|until|before|caution|limit|blocked|confidence)/i)

      for (const step of candidate.nextStepPlan.steps) {
        expect(step.title).not.toMatch(/^Apply now$/i)
      }
    }
  })
})
