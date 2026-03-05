import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import {
  RECOMMENDATION_PATHWAY_SUPPORTED_IDS,
  RECOMMENDATION_RESULT_TYPES,
  RECOMMENDATION_TIER_VALUES,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type RecommendationTier = typeof RECOMMENDATION_TIER_VALUES[number]
type RecommendationResultType = typeof RECOMMENDATION_RESULT_TYPES[number]

type RankedRecommendation = {
  pathwayId: string
  type: RecommendationResultType
  rank: number
  tier: RecommendationTier
  score: number
  composedSteps?: string[]
}

type RecommendationResultsResponse = {
  runId: string
  profileSnapshotId: string
  status: 'completed' | 'degraded'
  results: {
    direct: RankedRecommendation[]
    blocked: RankedRecommendation[]
    composed: RankedRecommendation[]
  }
  noComposedReason?: string
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-ranking-integration-${seed}@example.com`
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
      name: 'Recommendation Ranking Integration Test User',
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
      `Could not establish authenticated session for recommendation ranking integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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

async function startAndReadResults(
  request: APIRequestContext,
  appBaseUrl: string,
  seededRun: RecommendationLifecycleRecord,
  mode?: 'standard' | 'recoverable-delay',
) {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
  const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
    data: mode ? { mode } : undefined,
    failOnStatusCode: false,
  })
  const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
    failOnStatusCode: false,
  })

  const resultsResponse = await request.get(routeProbe.recommendationRunResultsPath(seededRun.runId), {
    failOnStatusCode: false,
  })

  return {
    startResponse,
    statusResponse,
    statusBody: await statusResponse.json() as RecommendationLifecycleRecord,
    resultsResponse,
    body: await resultsResponse.json() as RecommendationResultsResponse,
  }
}

function createNoComposedRoutePayload() {
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
      education: {},
      work: {
        yearsSkilledExperience: 0,
        hasValidJobOffer: 'no',
      },
      immigration: {
        openToRelocation: 'no',
        englishClb: 4,
        availableSettlementFundsCad: 1000,
      },
      goals: {
        targetTimelineMonths: 3,
        budgetCad: 2000,
        willingToStudyOrRetrain: 'no',
      },
    },
  }
}

function allRankedResults(body: RecommendationResultsResponse): RankedRecommendation[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

test.describe('Story 2.3 Recommendation Ranking Integration', () => {
  test('[P0][AC1][AC2] composed recommendations remain distinct from direct and blocked pathways when staged routes exist', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_integration_composed'),
      profileSnapshotId: uniqueId('snapshot_story23_integration_composed'),
      status: 'queued',
      resetExisting: true,
    })

    const result = await startAndReadResults(request, appBaseUrl, seededRun)

    expect(result.startResponse.status()).toBe(200)
    expect(result.statusResponse.status()).toBe(200)
    expect(result.statusBody.status).toBe('completed')
    expect(result.resultsResponse.status()).toBe(200)
    expect(result.body.runId).toBe(seededRun.runId)
    expect(result.body.profileSnapshotId).toBe(seededRun.profileSnapshotId)
    expect(result.body.results.composed.length).toBeGreaterThan(0)
    expect(result.body.results.composed.every(candidate => candidate.type === 'composed')).toBe(true)

    const directOrBlockedIds = new Set(
      [...result.body.results.direct, ...result.body.results.blocked].map(candidate => candidate.pathwayId),
    )
    for (const composedCandidate of result.body.results.composed) {
      expect(directOrBlockedIds.has(composedCandidate.pathwayId)).toBe(false)
      expect((composedCandidate.composedSteps || []).length).toBeGreaterThan(0)
    }
  })

  test('[P0][AC2][AC3] repeated start processing keeps deterministic ordering and canonical tier assignment', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_integration_determinism'),
      profileSnapshotId: uniqueId('snapshot_story23_integration_determinism'),
      status: 'queued',
      resetExisting: true,
    })

    const firstResult = await startAndReadResults(request, appBaseUrl, seededRun)
    const secondResult = await startAndReadResults(request, appBaseUrl, seededRun)

    expect(firstResult.startResponse.status()).toBe(200)
    expect(firstResult.statusResponse.status()).toBe(200)
    expect(firstResult.statusBody.status).toBe('completed')
    expect(firstResult.resultsResponse.status()).toBe(200)
    expect(secondResult.startResponse.status()).toBe(200)
    expect(secondResult.statusResponse.status()).toBe(200)
    expect(secondResult.statusBody.status).toBe('completed')
    expect(secondResult.resultsResponse.status()).toBe(200)

    expect(secondResult.body.results.direct).toEqual(firstResult.body.results.direct)
    expect(secondResult.body.results.blocked).toEqual(firstResult.body.results.blocked)
    expect(secondResult.body.results.composed).toEqual(firstResult.body.results.composed)

    const candidates = allRankedResults(firstResult.body)
    expect(candidates.length).toBeGreaterThan(0)
    for (const candidate of candidates) {
      expect(RECOMMENDATION_TIER_VALUES).toContain(candidate.tier)
      expect(RECOMMENDATION_RESULT_TYPES).toContain(candidate.type)
      expect(RECOMMENDATION_PATHWAY_SUPPORTED_IDS).toContain(candidate.pathwayId)
    }

    const ranks = candidates.map(candidate => candidate.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([...new Set(ranks)])
    for (let i = 0; i < ranks.length; i += 1) {
      expect(ranks[i]).toBe(i + 1)
    }
  })

  test('[P1][AC4] no-composed-pathway branch preserves direct/blocked outputs and emits explicit no-composed metadata', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_integration_no_composed'),
      profileSnapshotId: uniqueId('snapshot_story23_integration_no_composed'),
      status: 'evaluating',
      resetExisting: true,
      submittedPayload: createNoComposedRoutePayload(),
    })

    const result = await startAndReadResults(request, appBaseUrl, seededRun)

    expect(result.startResponse.status()).toBe(200)
    expect(result.statusResponse.status()).toBe(200)
    expect(result.statusBody.status).toBe('completed')
    expect(result.resultsResponse.status()).toBe(200)
    expect(result.body.results.composed.length).toBe(0)
    expect(result.body.results.direct.length + result.body.results.blocked.length).toBeGreaterThan(0)
    expect((result.body.noComposedReason || '').trim().length).toBeGreaterThan(0)
  })
})
