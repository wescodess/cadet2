import type { APIRequestContext } from '@playwright/test'
import { faker } from '@faker-js/faker'

import { test, expect } from '../support/fixtures'
import {
  createCompletedIntakeDraftPayload,
  createIncompleteIntakeDraftPayload,
  createIntakeSubmitRouteProbe,
} from '../support/fixtures/factories/intake-submit-factory'
import { createRecommendationNextStepPlanEvaluationPayload } from '../support/fixtures/factories/recommendation-next-step-plan-factory'
import { RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS } from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type RecommendationRunApiRecord = {
  runId: string
  profileSnapshotId: string
  refreshedFromRunId?: string
  previousProfileSnapshotId?: string
  refreshRootRunId?: string
  refreshSequence?: number
  status: string
  createdAt: string
  updatedAt: string
  userId?: string
} & Record<string, unknown>

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-submit-api-${seed}@example.com`
}

async function describeAuthFailure(response: Awaited<ReturnType<APIRequestContext['post']>>) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureAuthenticatedRequest(request: APIRequestContext, appBaseUrl: string) {
  const email = uniqueAuthEmail()
  const password = 'PlaywrightPass123!'

  const signInResponse = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
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
    data: {
      email,
      password,
      name: 'Intake Submit API Test User',
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
      `Could not establish authenticated API session for intake submit tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function seedDraft(
  request: APIRequestContext,
  routeProbe: ReturnType<typeof createIntakeSubmitRouteProbe>,
  payload: ReturnType<typeof createCompletedIntakeDraftPayload>,
) {
  const response = await request.post(routeProbe.draftApiPath, {
    data: payload,
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
    submittedPayload?: unknown
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: input,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as RecommendationRunApiRecord
}

async function readNewCycleDraft(
  request: APIRequestContext,
  routeProbe: ReturnType<typeof createIntakeSubmitRouteProbe>,
  sourceRunId: string,
) {
  const response = await request.get(routeProbe.draftApiPath, {
    params: {
      mode: 'new-cycle',
      sourceRun: sourceRunId,
    },
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as {
    currentSection: string
    values: Record<string, Record<string, unknown>>
    sourceRunId?: string | null
  }
}

test.describe('Story 1.4 Intake Submit and Recommendation Run Tracking API ATDD (RED)', () => {
  test('[P0][AC1] unauthenticated intake submission is denied by workspace session guard', async ({ request, appBaseUrl }) => {
    const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)

    // Given no authenticated workspace session
    // When intake submission is requested
    const response = await request.post(routeProbe.submitApiPath, {
      failOnStatusCode: false,
    })

    // Then the server rejects the operation
    expect(response.status()).toBe(401)
  })

  test.describe('authenticated standard user', () => {
    test('[P0][AC1][AC3][AC4] submitting completed intake creates a queued run linked to a profile snapshot', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await seedDraft(request, routeProbe, createCompletedIntakeDraftPayload())

      // Given an authenticated user with all required intake sections complete
      // When the intake submission endpoint is called
      const response = await request.post(routeProbe.submitApiPath, {
        failOnStatusCode: false,
      })
      const body = await response.json() as RecommendationRunApiRecord

      // Then a minimal queued recommendation run record is returned
      expect(response.status()).toBe(201)
      for (const key of RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(body, key)).toBe(true)
      }
      expect(body.status).toBe('queued')
      expect(typeof body.runId).toBe('string')
      expect(typeof body.profileSnapshotId).toBe('string')

      for (const forbiddenField of ['recommendations', 'pathwayRankings', 'citations', 'confidenceScore', 'auditTrail']) {
        expect(Object.prototype.hasOwnProperty.call(body, forbiddenField)).toBe(false)
      }
    })

    test('[P0][AC2][AC5] submitting a new planning cycle preserves source-run lineage and existing history', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)

      const sourceRun = await seedRecommendationRun(request, appBaseUrl, {
        runId: `run_story44_cycle_source_${Date.now().toString(36)}`,
        profileSnapshotId: `snapshot_story44_cycle_source_${Date.now().toString(36)}`,
        status: 'completed',
        submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
      })

      await seedDraft(request, routeProbe, createCompletedIntakeDraftPayload({
        fieldValues: {
          goals: {
            primaryGoal: 'permanent-residency',
            targetTimelineMonths: 18,
            budgetCad: 24000,
            priorityPreference: 'highest-odds',
            locationPreference: 'targeted-provinces',
            willingToStudyOrRetrain: 'yes',
            hasFamilyInCanada: 'no',
            additionalContext: 'Updated after reviewing the previous planning cycle.',
          },
        },
      }))

      const submitResponse = await request.post(routeProbe.submitApiPath, {
        data: {
          sourceRunId: sourceRun.runId,
        },
        failOnStatusCode: false,
      })
      const submittedRun = await submitResponse.json() as RecommendationRunApiRecord

      expect(submitResponse.status()).toBe(201)
      expect(submittedRun.runId).not.toBe(sourceRun.runId)
      expect(submittedRun.refreshedFromRunId).toBe(sourceRun.runId)
      expect(submittedRun.previousProfileSnapshotId).toBe(sourceRun.profileSnapshotId)
      expect(submittedRun.refreshRootRunId).toBe(sourceRun.runId)
      expect(submittedRun.refreshSequence).toBe(1)

      const runsResponse = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const runs = await runsResponse.json() as RecommendationRunApiRecord[]

      expect(runsResponse.status()).toBe(200)
      expect(runs.some(run => run.runId === sourceRun.runId)).toBe(true)

      const createdRun = runs.find(run => run.runId === submittedRun.runId)
      expect(createdRun).toBeTruthy()
      expect(createdRun?.refreshedFromRunId).toBe(sourceRun.runId)
      expect(createdRun?.previousProfileSnapshotId).toBe(sourceRun.profileSnapshotId)
    })

    test('[P1][AC2][AC5] submitting a new planning cycle rejects unknown source lineage without creating a run', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await seedDraft(request, routeProbe, createCompletedIntakeDraftPayload())

      const submitResponse = await request.post(routeProbe.submitApiPath, {
        data: {
          sourceRunId: `run_story44_missing_source_${Date.now().toString(36)}`,
        },
        failOnStatusCode: false,
      })

      expect(submitResponse.status()).toBe(404)

      const runsResponse = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const runs = await runsResponse.json() as RecommendationRunApiRecord[]

      expect(runsResponse.status()).toBe(200)
      expect(runs).toHaveLength(0)
    })

    test('[P0][AC2][AC5] refresh from latest profile preserves the source snapshot instead of leaking active draft edits', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)

      const sourcePayload = createCompletedIntakeDraftPayload({
        fieldValues: {
          goals: {
            primaryGoal: 'permanent-residency',
            targetTimelineMonths: 14,
            budgetCad: 18000,
            priorityPreference: 'highest-odds',
            locationPreference: 'targeted-provinces',
            willingToStudyOrRetrain: 'yes',
            hasFamilyInCanada: 'no',
            additionalContext: 'Use the preserved planning cycle snapshot.',
          },
        },
      })
      const activeDraftPayload = createCompletedIntakeDraftPayload({
        fieldValues: {
          goals: {
            primaryGoal: 'study-to-pr',
            targetTimelineMonths: 48,
            budgetCad: 42000,
            priorityPreference: 'lowest-cost',
            locationPreference: 'major-city-focus',
            willingToStudyOrRetrain: 'yes',
            hasFamilyInCanada: 'yes',
            additionalContext: 'This newer draft should not leak into refresh-from-latest-profile.',
          },
        },
      })

      const sourceRun = await seedRecommendationRun(request, appBaseUrl, {
        runId: `run_story44_refresh_source_${Date.now().toString(36)}`,
        profileSnapshotId: `snapshot_story44_refresh_source_${Date.now().toString(36)}`,
        status: 'completed',
        submittedPayload: sourcePayload,
      })

      await seedDraft(request, routeProbe, activeDraftPayload)

      const refreshResponse = await request.post(
        `${appBaseUrl}/api/recommendations/runs/${encodeURIComponent(sourceRun.runId)}/refresh`,
        {
          failOnStatusCode: false,
        },
      )
      const refreshedRun = await refreshResponse.json() as RecommendationRunApiRecord

      expect(refreshResponse.status()).toBe(202)
      expect(refreshedRun.refreshedFromRunId).toBe(sourceRun.runId)

      const hydratedDraft = await readNewCycleDraft(request, routeProbe, refreshedRun.runId)

      expect(hydratedDraft.sourceRunId).toBe(refreshedRun.runId)
      expect(hydratedDraft.currentSection).toBe(sourcePayload.currentSection)
      expect(hydratedDraft.values.goals?.primaryGoal).toBe(sourcePayload.fieldValues.goals?.primaryGoal)
      expect(hydratedDraft.values.goals?.additionalContext).toBe(sourcePayload.fieldValues.goals?.additionalContext)
      expect(hydratedDraft.values.goals?.additionalContext).not.toBe(activeDraftPayload.fieldValues.goals?.additionalContext)
      expect(hydratedDraft.values.goals?.targetTimelineMonths).toBe(sourcePayload.fieldValues.goals?.targetTimelineMonths)
      expect(hydratedDraft.values.goals?.targetTimelineMonths).not.toBe(activeDraftPayload.fieldValues.goals?.targetTimelineMonths)
    })

    test('[P0][AC1] submission is rejected when required intake sections are incomplete', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await seedDraft(request, routeProbe, createIncompleteIntakeDraftPayload())

      // Given an authenticated user with an incomplete intake draft
      // When intake submission is requested
      const response = await request.post(routeProbe.submitApiPath, {
        failOnStatusCode: false,
      })
      const responseText = (await response.text()).toLowerCase()

      // Then validation blocks recommendation run creation
      expect(response.status()).toBe(400)
      expect(responseText).toMatch(/incomplete|required|missing/)
    })

    test('[P0][AC2] recommendation runs endpoint is user-scoped and returns newest-first order', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      const attackerUserId = `user_${faker.string.alphanumeric(10)}`
      await ensureAuthenticatedRequest(request, appBaseUrl)

      // Given an authenticated user requests their run history
      const baselineResponse = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const baselineBody = await baselineResponse.json() as RecommendationRunApiRecord[]

      // When the same user attempts query tampering with another user identifier
      const tamperedResponse = await request.get(
        `${routeProbe.recommendationRunsApiPath}?userId=${attackerUserId}`,
        { failOnStatusCode: false },
      )
      const tamperedBody = await tamperedResponse.json() as RecommendationRunApiRecord[]

      // Then response scope stays bound to the authenticated session
      expect(baselineResponse.status()).toBe(200)
      expect(tamperedResponse.status()).toBe(200)
      expect(tamperedBody).toEqual(baselineBody)

      for (let index = 0; index < baselineBody.length - 1; index += 1) {
        const currentCreatedAt = new Date(baselineBody[index]!.createdAt).getTime()
        const nextCreatedAt = new Date(baselineBody[index + 1]!.createdAt).getTime()
        expect(currentCreatedAt).toBeGreaterThanOrEqual(nextCreatedAt)
      }
    })

    test('[P1][AC4] run listing keeps metadata minimal without recommendation-detail leakage', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)

      // Given recommendation runs are listed for an authenticated user
      const response = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const runs = await response.json() as RecommendationRunApiRecord[]

      // Then each record remains within minimum metadata for this epic
      expect(response.status()).toBe(200)
      for (const run of runs) {
        expect(Object.keys(run).sort()).toEqual([...RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS].sort())
      }
    })

    test('[P0][AC2][AC5] repeated submissions create distinct run records in reverse-chronological order', async ({ request, appBaseUrl }) => {
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      await ensureAuthenticatedRequest(request, appBaseUrl)
      await seedDraft(request, routeProbe, createCompletedIntakeDraftPayload())

      // Given a completed intake can be submitted repeatedly over time
      // When submission is called twice
      const firstSubmitResponse = await request.post(routeProbe.submitApiPath, { failOnStatusCode: false })
      const secondSubmitResponse = await request.post(routeProbe.submitApiPath, { failOnStatusCode: false })
      expect(firstSubmitResponse.status()).toBe(201)
      expect(secondSubmitResponse.status()).toBe(201)

      // Then two distinct run records are visible with newest-first ordering
      const runsResponse = await request.get(routeProbe.recommendationRunsApiPath, {
        failOnStatusCode: false,
      })
      const runs = await runsResponse.json() as RecommendationRunApiRecord[]

      expect(runsResponse.status()).toBe(200)
      expect(runs.length).toBeGreaterThanOrEqual(2)
      expect(runs[0]?.runId).not.toBe(runs[1]?.runId)

      if (runs[0]?.createdAt && runs[1]?.createdAt) {
        expect(new Date(runs[0].createdAt).getTime()).toBeGreaterThanOrEqual(new Date(runs[1].createdAt).getTime())
      }
    })
  })
})
