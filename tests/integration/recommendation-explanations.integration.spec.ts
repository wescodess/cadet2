import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'

type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

type RecommendationTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
}

type RecommendationCandidateWithExplanationModules = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  rationale: string
  fitSignals: Array<{
    id: string
    label: string
    detail: string
    state: 'strength' | 'watch' | 'gap'
  }>
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
  composedSteps?: string[]
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
}

type RecommendationResultsResponse = {
  runId: string
  profileSnapshotId: string
  status: 'completed' | 'degraded' | 'failed'
  results: {
    direct: RecommendationCandidateWithExplanationModules[]
    blocked: RecommendationCandidateWithExplanationModules[]
    composed: RecommendationCandidateWithExplanationModules[]
  }
  noComposedReason?: string
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-explanations-integration-${seed}@example.com`
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
      name: 'Recommendation Explanations Integration Test User',
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
      `Could not establish authenticated session for recommendation explanation integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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

function createStory32EvaluationPayload() {
  return {
    currentSection: 'goals',
    sectionProgress: {
      personal: true,
      education: true,
      work: true,
      immigration: true,
      goals: true,
    },
    fieldValues: {
      personal: {},
      education: {
        highestEducationLevel: 'bachelors',
      },
      work: {
        yearsSkilledExperience: 1,
        hasValidJobOffer: 'no',
      },
      immigration: {
        openToRelocation: 'yes',
        englishClb: 6,
        availableSettlementFundsCad: 9500,
      },
      goals: {
        targetTimelineMonths: 6,
        budgetCad: 10000,
        willingToStudyOrRetrain: 'yes',
      },
    },
  }
}

function allCandidates(body: RecommendationResultsResponse): RecommendationCandidateWithExplanationModules[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

test.describe('Story 3.2 Recommendation Explanation Modules Integration', () => {
  test('[P0][AC1][AC2] recommendation results persistence preserves blockers and action modules through status and results reads', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story32_integration_modules'),
      profileSnapshotId: uniqueId('snapshot_story32_integration_modules'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createStory32EvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(statusResponse.status()).toBe(200)

    const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(resultsResponse.status()).toBe(200)

    const body = await resultsResponse.json() as RecommendationResultsResponse
    const candidates = allCandidates(body)
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(Array.isArray(candidate.blockers)).toBe(true)
      expect(Array.isArray(candidate.improvementActions)).toBe(true)
      if (candidate.qualification === 'supported') {
        expect(candidate.blockers.length).toBe(0)
        expect(candidate.improvementActions.length).toBe(0)
      }
      else {
        expect(candidate.blockers.length).toBeGreaterThan(0)
        expect(candidate.improvementActions.length).toBeGreaterThan(0)
      }
    }
  })

  test('[P0][AC3] tradeoff modules remain available across direct, blocked, and composed collections for side-by-side comparison', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story32_integration_tradeoffs'),
      profileSnapshotId: uniqueId('snapshot_story32_integration_tradeoffs'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createStory32EvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(resultsResponse.status()).toBe(200)

    const body = await resultsResponse.json() as RecommendationResultsResponse
    const candidates = allCandidates(body)
    expect(candidates.length).toBeGreaterThan(1)

    for (const candidate of candidates) {
      expect(Array.isArray(candidate.tradeoffs)).toBe(true)
      expect(candidate.tradeoffs.length).toBeGreaterThan(0)
      expect(candidate.tradeoffs.some(tradeoff => tradeoff.dimension === 'effort')).toBe(true)
      expect(candidate.tradeoffs.some(tradeoff => tradeoff.dimension === 'timing')).toBe(true)
      expect(candidate.tradeoffs.some(tradeoff => tradeoff.dimension === 'complexity')).toBe(true)
    }
  })

  test('[P1][AC1][AC2] blocker entries remain factual while action entries remain directive and non-overlapping in persisted contract', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story32_integration_separation'),
      profileSnapshotId: uniqueId('snapshot_story32_integration_separation'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createStory32EvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(resultsResponse.status()).toBe(200)

    const body = await resultsResponse.json() as RecommendationResultsResponse

    for (const candidate of allCandidates(body)) {
      const blockerDetails = new Set(candidate.blockers.map(blocker => blocker.detail.toLowerCase()))
      expect(candidate.improvementActions.every(action => !blockerDetails.has(action.detail.toLowerCase()))).toBe(true)
      expect(candidate.improvementActions.every(action => action.expectedImpact.trim().length > 0)).toBe(true)
    }
  })
})
