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
  return `playwright-${getTestEnvironment()}-recommendation-ranking-api-${seed}@example.com`
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
    return { email, password }
  }

  const signUpResponse = await request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email,
      password,
      name: 'Recommendation Ranking API Test User',
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
      `Could not establish authenticated API session for recommendation ranking tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }

  return { email, password }
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

function allRankedResults(body: RecommendationResultsResponse): RankedRecommendation[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

function emittedPathwayIds(body: RecommendationResultsResponse): string[] {
  return allRankedResults(body).map(candidate => candidate.pathwayId)
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

test.describe('Story 2.3 Recommendation Ranking API ATDD', () => {
  test('[P0][AC3] unauthenticated user cannot read ranked recommendation outputs', async ({ request, appBaseUrl }) => {
    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const response = await request.get(routeProbe.recommendationRunResultsPath('run_rank_not_authenticated'), {
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(401)
  })

  test('[P0][AC3][AC4] owner gets pending signal when ranked recommendation output has not finalized', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_api_pending'),
      profileSnapshotId: uniqueId('snapshot_story23_api_pending'),
      status: 'queued',
      resetExisting: true,
    })

    const { response } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(409)
  })

  test('[P0][AC1][AC2][AC3] start processing persists ranked direct, blocked, and composed results for the run owner', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_api_groups'),
      profileSnapshotId: uniqueId('snapshot_story23_api_groups'),
      status: 'queued',
      resetExisting: true,
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })

    expect(startResponse.status()).toBe(200)
    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(statusResponse.status()).toBe(200)
    expect((await statusResponse.json() as RecommendationLifecycleRecord).status).toBe('completed')

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)
    expect(body.runId).toBe(seededRun.runId)
    expect(body.profileSnapshotId).toBe(seededRun.profileSnapshotId)
    expect(Array.isArray(body.results.direct)).toBe(true)
    expect(Array.isArray(body.results.blocked)).toBe(true)
    expect(Array.isArray(body.results.composed)).toBe(true)
    expect(allRankedResults(body).length).toBeGreaterThan(0)
  })

  test('[P0][AC2][AC3] ranked outputs use canonical tier labels and stable ascending rank metadata', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_api_rank'),
      profileSnapshotId: uniqueId('snapshot_story23_api_rank'),
      status: 'queued',
      resetExisting: true,
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)
    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(statusResponse.status()).toBe(200)
    expect((await statusResponse.json() as RecommendationLifecycleRecord).status).toBe('completed')

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    const candidates = allRankedResults(body)
    expect(candidates.length).toBeGreaterThan(0)
    for (const candidate of candidates) {
      expect(RECOMMENDATION_TIER_VALUES).toContain(candidate.tier)
      expect(RECOMMENDATION_RESULT_TYPES).toContain(candidate.type)
      expect(candidate.rank).toBeGreaterThan(0)
    }

    const ranks = candidates.map(candidate => candidate.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([...new Set(ranks)])
    for (let i = 0; i < ranks.length; i += 1) {
      expect(ranks[i]).toBe(i + 1)
    }
  })

  test('[P0][AC3] ranked result payload excludes unsupported pathway IDs and raw provider internals', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_api_scope'),
      profileSnapshotId: uniqueId('snapshot_story23_api_scope'),
      status: 'queued',
      resetExisting: true,
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)
    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(statusResponse.status()).toBe(200)
    expect((await statusResponse.json() as RecommendationLifecycleRecord).status).toBe('completed')

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    const pathwayIds = emittedPathwayIds(body)
    expect(pathwayIds.length).toBeGreaterThan(0)
    for (const pathwayId of pathwayIds) {
      expect(RECOMMENDATION_PATHWAY_SUPPORTED_IDS).toContain(pathwayId)
    }
    expect(Object.prototype.hasOwnProperty.call(body, 'providerPayload')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(body, 'providerResponse')).toBe(false)
  })

  test('[P1][AC4] no-composed-route scenarios keep direct/blocked outputs and emit an explicit no-composed signal', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story23_api_no_composed'),
      profileSnapshotId: uniqueId('snapshot_story23_api_no_composed'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createNoComposedRoutePayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)
    expect(body.results.composed.length).toBe(0)
    expect(body.results.direct.length + body.results.blocked.length).toBeGreaterThan(0)
    expect((body.noComposedReason || '').trim().length).toBeGreaterThan(0)
  })
})
