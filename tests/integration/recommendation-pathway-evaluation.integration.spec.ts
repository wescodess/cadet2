import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import {
  RECOMMENDATION_PATHWAY_SUPPORTED_IDS,
  RECOMMENDATION_PATHWAY_UNSUPPORTED_IDS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type PathwayOutcome = {
  pathwayId: string
  status: 'direct' | 'blocked'
  unmetConditions?: string[]
}

type RecommendationPathwayResponse = {
  runId: string
  profileSnapshotId: string
  direct: PathwayOutcome[]
  blocked: PathwayOutcome[]
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-pathway-integration-${seed}@example.com`
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
      name: 'Recommendation Pathway Integration Test User',
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
      `Could not establish authenticated session for recommendation pathway integration tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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

async function startAndReadPathways(
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

  const pathwaysResponse = await request.get(routeProbe.recommendationRunPathwaysPath(seededRun.runId), {
    failOnStatusCode: false,
  })

  return {
    startResponse,
    pathwaysResponse,
    body: await pathwaysResponse.json() as RecommendationPathwayResponse,
  }
}

function createMissingConditionPayload() {
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

test.describe('Story 2.2 Recommendation Pathway Evaluation Integration', () => {
  test('[P0][AC1][AC2] pathway evaluation artifacts stay linked to runId and profileSnapshotId across processing boundaries', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_integration_linkage'),
      profileSnapshotId: uniqueId('snapshot_story22_integration_linkage'),
      status: 'queued',
      resetExisting: true,
    })

    const result = await startAndReadPathways(request, appBaseUrl, seededRun)

    expect(result.startResponse.status()).toBe(200)
    expect(result.pathwaysResponse.status()).toBe(200)
    expect(result.body.runId).toBe(seededRun.runId)
    expect(result.body.profileSnapshotId).toBe(seededRun.profileSnapshotId)
    expect(result.body.direct.length + result.body.blocked.length).toBeGreaterThan(0)
  })

  test('[P0][AC2] missing-condition scenarios remain blocked with unmet-condition details available for downstream explanation', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_integration_blocked'),
      profileSnapshotId: uniqueId('snapshot_story22_integration_blocked'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createMissingConditionPayload(),
    })

    const result = await startAndReadPathways(request, appBaseUrl, seededRun)

    expect(result.startResponse.status()).toBe(200)
    expect(result.pathwaysResponse.status()).toBe(200)
    expect(result.body.blocked.length).toBeGreaterThan(0)
    expect(result.body.blocked.every(pathway => (pathway.unmetConditions?.length || 0) > 0)).toBe(true)
  })

  test('[P1][AC3] no-strong-fit runs return only supported blocked outcomes and exclude unsupported pathway domains', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_integration_scope'),
      profileSnapshotId: uniqueId('snapshot_story22_integration_scope'),
      status: 'evaluating',
      resetExisting: true,
    })

    const result = await startAndReadPathways(request, appBaseUrl, seededRun, 'recoverable-delay')

    expect(result.startResponse.status()).toBe(200)
    expect(result.pathwaysResponse.status()).toBe(200)
    expect(result.body.direct.length).toBe(0)
    expect(result.body.blocked.length).toBeGreaterThan(0)

    const emittedIds = [...result.body.direct, ...result.body.blocked].map(pathway => pathway.pathwayId)
    for (const pathwayId of emittedIds) {
      expect(RECOMMENDATION_PATHWAY_SUPPORTED_IDS).toContain(pathwayId)
    }
    for (const unsupportedPathway of RECOMMENDATION_PATHWAY_UNSUPPORTED_IDS) {
      expect(emittedIds).not.toContain(unsupportedPathway)
    }
  })
})
