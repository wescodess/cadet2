import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import {
  RECOMMENDATION_CONFIDENCE_LEVELS,
  RECOMMENDATION_FIT_SIGNAL_STATES,
  RECOMMENDATION_FRESHNESS_LEVELS,
  RECOMMENDATION_QUALIFICATION_LEVELS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type RecommendationQualification = typeof RECOMMENDATION_QUALIFICATION_LEVELS[number]
type RecommendationConfidence = typeof RECOMMENDATION_CONFIDENCE_LEVELS[number]
type RecommendationFreshness = typeof RECOMMENDATION_FRESHNESS_LEVELS[number]

type QualifiedRecommendation = {
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
    state: typeof RECOMMENDATION_FIT_SIGNAL_STATES[number]
  }>
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  qualification: RecommendationQualification
  caveat: string
  composedSteps?: string[]
}

type RecommendationResultsResponse = {
  runId: string
  profileSnapshotId: string
  status: 'completed' | 'degraded' | 'failed'
  results: {
    direct: QualifiedRecommendation[]
    blocked: QualifiedRecommendation[]
    composed: QualifiedRecommendation[]
  }
  noComposedReason?: string
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-qualification-api-${seed}@example.com`
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
      name: 'Recommendation Qualification API Test User',
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
      `Could not establish authenticated API session for recommendation qualification tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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

function allCandidates(body: RecommendationResultsResponse): QualifiedRecommendation[] {
  return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

function createDegradedEvidencePayload() {
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
        yearsSkilledExperience: 3,
        hasValidJobOffer: 'no',
      },
      immigration: {
        openToRelocation: 'yes',
        englishClb: 7,
        availableSettlementFundsCad: 20000,
      },
      goals: {
        targetTimelineMonths: 12,
        budgetCad: 20000,
        willingToStudyOrRetrain: 'yes',
      },
    },
  }
}

function createFailedEvidencePayload() {
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
        availableSettlementFundsCad: 500,
      },
      goals: {
        targetTimelineMonths: 3,
        budgetCad: 1500,
        willingToStudyOrRetrain: 'no',
      },
    },
  }
}

test.describe('Story 2.4 Recommendation Qualification API ATDD', () => {
  test('[P0][AC1] weak-evidence runs are finalized as degraded and expose confidence/freshness/caveat metadata', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story24_api_degraded'),
      profileSnapshotId: uniqueId('snapshot_story24_api_degraded'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createDegradedEvidencePayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(statusResponse.status()).toBe(200)

    const statusBody = await statusResponse.json() as RecommendationLifecycleRecord
    expect(statusBody.status).toBe('degraded')

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)
    expect(body.status).toBe('degraded')

    const candidates = allCandidates(body)
    expect(candidates.length).toBeGreaterThan(0)

    for (const candidate of candidates) {
      expect(RECOMMENDATION_QUALIFICATION_LEVELS).toContain(candidate.qualification)
      expect(RECOMMENDATION_CONFIDENCE_LEVELS).toContain(candidate.confidence)
      expect(RECOMMENDATION_FRESHNESS_LEVELS).toContain(candidate.freshness)
      expect(candidate.caveat.trim().length).toBeGreaterThan(0)
    }
  })

  test('[P0][AC1] degraded or withheld recommendations are explicit and never silently dropped from results payloads', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story24_api_withheld'),
      profileSnapshotId: uniqueId('snapshot_story24_api_withheld'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createDegradedEvidencePayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    const candidates = allCandidates(body)
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.some(candidate => candidate.qualification === 'low-confidence')).toBe(true)
    expect(candidates.some(candidate => candidate.qualification === 'withheld')).toBe(true)
  })

  test('[P1][AC3] no-trustworthy scenarios fail safely with retry guidance and never surface strong-fit recommendations', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story24_api_failed'),
      profileSnapshotId: uniqueId('snapshot_story24_api_failed'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createFailedEvidencePayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const statusResponse = await request.get(routeProbe.recommendationRunStatusPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(statusResponse.status()).toBe(200)

    const statusBody = await statusResponse.json() as RecommendationLifecycleRecord
    expect(statusBody.status).toBe('failed')
    expect((statusBody.statusMessage || '').toLowerCase()).toContain('retry')

    const { response, body } = await readResultsForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    for (const candidate of allCandidates(body)) {
      expect(candidate.tier).not.toBe('strong-fit')
      expect(candidate.qualification).toBe('withheld')
    }
  })
})
