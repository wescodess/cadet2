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
  return `playwright-${getTestEnvironment()}-recommendation-explanations-api-${seed}@example.com`
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
      name: 'Recommendation Explanations API Test User',
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
      `Could not establish authenticated API session for recommendation explanation tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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

async function readResultsForRun(
  request: APIRequestContext,
  appBaseUrl: string,
  runId: string,
) {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
  const response = await request.get(routeProbe.recommendationRunResultsPath(runId), {
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as RecommendationResultsResponse,
  }
}

function allCandidates(body: RecommendationResultsResponse): RecommendationCandidateWithExplanationModules[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
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
        yearsSkilledExperience: 2,
        hasValidJobOffer: 'no',
      },
      immigration: {
        openToRelocation: 'yes',
        englishClb: 7,
        availableSettlementFundsCad: 11000,
      },
      goals: {
        targetTimelineMonths: 8,
        budgetCad: 12000,
        willingToStudyOrRetrain: 'yes',
      },
    },
  }
}

test.describe('Story 3.2 Recommendation Blockers + Tradeoffs + Action Modules API ATDD', () => {
  test('[P0][AC1] recommendation results include factual blocker modules per candidate when constraints are unresolved', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story32_api_blockers'),
      profileSnapshotId: uniqueId('snapshot_story32_api_blockers'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createStory32EvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    const candidates = allCandidates(body)
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(Array.isArray(candidate.blockers)).toBe(true)
      if (candidate.qualification === 'supported') {
        expect(candidate.blockers.length).toBe(0)
      }
      else {
        expect(candidate.blockers.length).toBeGreaterThan(0)
      }
      for (const blocker of candidate.blockers) {
        expect(blocker.id.trim().length).toBeGreaterThan(0)
        expect(blocker.label.trim().length).toBeGreaterThan(0)
        expect(blocker.detail.trim().length).toBeGreaterThan(0)
        expect(['critical', 'high', 'medium', 'low']).toContain(blocker.severity)
      }
    }
  })

  test('[P0][AC2] recommendation actions are present and remain semantically distinct from factual blockers', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story32_api_actions'),
      profileSnapshotId: uniqueId('snapshot_story32_api_actions'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createStory32EvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    const candidates = allCandidates(body)
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(Array.isArray(candidate.improvementActions)).toBe(true)
      if (candidate.qualification === 'supported') {
        expect(candidate.improvementActions.length).toBe(0)
      }
      else {
        expect(candidate.improvementActions.length).toBeGreaterThan(0)
      }

      const blockerIds = new Set(candidate.blockers.map(blocker => blocker.id))

      for (const action of candidate.improvementActions) {
        expect(action.id.trim().length).toBeGreaterThan(0)
        expect(action.title.trim().length).toBeGreaterThan(0)
        expect(action.detail.trim().length).toBeGreaterThan(0)
        expect(action.expectedImpact.trim().length).toBeGreaterThan(0)
        expect(['now', 'next', 'later']).toContain(action.priority)
        expect(blockerIds.has(action.id)).toBe(false)
      }
    }
  })

  test('[P0][AC3] recommendation options expose tradeoff modules with explicit effort/timing/complexity dimensions for comparison', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story32_api_tradeoffs'),
      profileSnapshotId: uniqueId('snapshot_story32_api_tradeoffs'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createStory32EvaluationPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    const candidates = allCandidates(body)
    expect(candidates.length).toBeGreaterThan(1)

    for (const candidate of candidates) {
      expect(Array.isArray(candidate.tradeoffs)).toBe(true)
      expect(candidate.tradeoffs.length).toBeGreaterThan(0)

      const dimensions = new Set(candidate.tradeoffs.map(tradeoff => tradeoff.dimension))
      expect(dimensions.has('effort')).toBe(true)
      expect(dimensions.has('timing')).toBe(true)
      expect(dimensions.has('complexity')).toBe(true)

      for (const tradeoff of candidate.tradeoffs) {
        expect(tradeoff.id.trim().length).toBeGreaterThan(0)
        expect(tradeoff.summary.trim().length).toBeGreaterThan(0)
        expect(['high', 'medium', 'low']).toContain(tradeoff.impact)
      }
    }
  })
})
