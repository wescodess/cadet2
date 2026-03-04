import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRouteProbe,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import {
  RECOMMENDATION_PATHWAY_STATUSES,
  RECOMMENDATION_PATHWAY_SUPPORTED_IDS,
  RECOMMENDATION_PATHWAY_UNSUPPORTED_IDS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type PathwayStatus = typeof RECOMMENDATION_PATHWAY_STATUSES[number]

type PathwayOutcome = {
  pathwayId: string
  status: PathwayStatus
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
  return `playwright-${getTestEnvironment()}-recommendation-pathway-api-${seed}@example.com`
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
      name: 'Recommendation Pathway API Test User',
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
      `Could not establish authenticated API session for recommendation pathway tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
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

async function readPathwaysForRun(
  request: APIRequestContext,
  appBaseUrl: string,
  runId: string,
) {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
  const response = await request.get(routeProbe.recommendationRunPathwaysPath(runId), {
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as RecommendationPathwayResponse,
  }
}

function emittedPathwayIds(payload: RecommendationPathwayResponse) {
  return [...payload.direct, ...payload.blocked].map(pathway => pathway.pathwayId)
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

test.describe('Story 2.2 Recommendation Pathway Evaluation API ATDD', () => {
  test('[P0][AC2][AC3] unauthenticated user cannot read pathway evaluation outputs', async ({ request, appBaseUrl }) => {
    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const response = await request.get(routeProbe.recommendationRunPathwaysPath('run_pathway_not_authenticated'), {
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(401)
  })

  test('[P0][AC2] owner gets a pending signal when pathway evaluation has not run yet', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_api_not_evaluated'),
      profileSnapshotId: uniqueId('snapshot_story22_api_not_evaluated'),
      status: 'queued',
      resetExisting: true,
    })

    const { response } = await readPathwaysForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(409)
  })

  test('[P0][AC1] authenticated user cannot read another user run pathways', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const ownerRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_api_owner_scope'),
      profileSnapshotId: uniqueId('snapshot_story22_api_owner_scope'),
      status: 'queued',
      resetExisting: true,
    })

    const ownerStart = await request.post(routeProbe.recommendationRunStartPath(ownerRun.runId), {
      failOnStatusCode: false,
    })
    expect(ownerStart.status()).toBe(200)

    await ensureAuthenticatedRequest(request, appBaseUrl)

    const { response } = await readPathwaysForRun(request, appBaseUrl, ownerRun.runId)
    expect(response.status()).toBe(404)
  })

  test('[P0][AC1] start processing persists direct and blocked pathway groups for the run owner', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_api_groups'),
      profileSnapshotId: uniqueId('snapshot_story22_api_groups'),
      status: 'queued',
      resetExisting: true,
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })

    expect(startResponse.status()).toBe(200)

    const { response, body } = await readPathwaysForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)
    expect(body.runId).toBe(seededRun.runId)
    expect(body.profileSnapshotId).toBe(seededRun.profileSnapshotId)
    expect(Array.isArray(body.direct)).toBe(true)
    expect(Array.isArray(body.blocked)).toBe(true)
    expect(body.direct.length + body.blocked.length).toBeGreaterThan(0)
    expect(body.direct.every(pathway => pathway.status === 'direct')).toBe(true)
    expect(body.blocked.every(pathway => pathway.status === 'blocked')).toBe(true)
  })

  test('[P0][AC2] blocked pathways include unmet conditions and never appear in direct results', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_api_blocked'),
      profileSnapshotId: uniqueId('snapshot_story22_api_blocked'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createMissingConditionPayload(),
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const { response, body } = await readPathwaysForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)
    expect(body.blocked.length).toBeGreaterThan(0)

    for (const blockedPathway of body.blocked) {
      expect(Array.isArray(blockedPathway.unmetConditions)).toBe(true)
      expect(blockedPathway.unmetConditions?.length || 0).toBeGreaterThan(0)
      expect(body.direct.some(directPathway => directPathway.pathwayId === blockedPathway.pathwayId)).toBe(false)
    }
  })

  test('[P0][AC3] pathway outputs stay within supported MVP inventory and exclude unsupported pathways', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_api_scope'),
      profileSnapshotId: uniqueId('snapshot_story22_api_scope'),
      status: 'queued',
      resetExisting: true,
    })

    const startResponse = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(startResponse.status()).toBe(200)

    const { response, body } = await readPathwaysForRun(request, appBaseUrl, seededRun.runId)
    expect(response.status()).toBe(200)

    const pathwayIds = emittedPathwayIds(body)
    expect(pathwayIds.length).toBeGreaterThan(0)
    for (const pathwayId of pathwayIds) {
      expect(RECOMMENDATION_PATHWAY_SUPPORTED_IDS).toContain(pathwayId)
    }
    for (const unsupportedPathway of RECOMMENDATION_PATHWAY_UNSUPPORTED_IDS) {
      expect(pathwayIds).not.toContain(unsupportedPathway)
    }
  })

  test('[P1][AC1][AC2] repeated start requests keep pathway evaluation output deterministic and idempotent', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run_story22_api_idempotent'),
      profileSnapshotId: uniqueId('snapshot_story22_api_idempotent'),
      status: 'queued',
      resetExisting: true,
    })

    const firstStart = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(firstStart.status()).toBe(200)
    const firstPathways = await readPathwaysForRun(request, appBaseUrl, seededRun.runId)
    expect(firstPathways.response.status()).toBe(200)

    const secondStart = await request.post(routeProbe.recommendationRunStartPath(seededRun.runId), {
      failOnStatusCode: false,
    })
    expect(secondStart.status()).toBe(200)
    const secondPathways = await readPathwaysForRun(request, appBaseUrl, seededRun.runId)
    expect(secondPathways.response.status()).toBe(200)
    expect(secondPathways.body.direct).toEqual(firstPathways.body.direct)
    expect(secondPathways.body.blocked).toEqual(firstPathways.body.blocked)
  })
})
