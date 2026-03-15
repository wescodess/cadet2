import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import { createRecommendationNextStepPlanEvaluationPayload } from '../support/fixtures/factories/recommendation-next-step-plan-factory'
import { getTestEnvironment } from '../support/helpers/env'

type WorkspaceSummaryResponse = {
  state: 'first-run' | 'resume-intake' | 'review-latest-run' | 'compare-latest-runs' | 'refresh-plan'
  draft: {
    exists: boolean
    savedAt: string | null
    currentSection: string | null
    currentSectionLabel: string | null
  }
  latestRun: null | {
    id: string
    status: string
    recommendationCount: number
  }
  latestReviewRun: null | {
    id: string
    status: string
    recommendationCount: number
  }
  archive: {
    totalRuns: number
    availableRuns: number
    completedCount: number
    degradedCount: number
    failedCount: number
  }
  comparison: {
    available: boolean
    baselineRunId: string | null
    currentRunId: string | null
    comparableRunCount: number
  }
  timeline: {
    intakeSaved: boolean
    latestRunGenerated: boolean
    latestComparisonAvailable: boolean
    nextStepPlanAvailable: boolean
  }
  nextAction: {
    actionKey: string
    state: WorkspaceSummaryResponse['state']
    reason: string
  }
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-workspace-summary-api-${seed}@example.com`
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
      name: 'Workspace Summary API Test User',
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
      `Could not establish authenticated session for workspace summary API tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function resetRecommendationRuns(request: APIRequestContext, appBaseUrl: string) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/reset`, {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function saveDraft(request: APIRequestContext, appBaseUrl: string) {
  const response = await request.post(`${appBaseUrl}/api/intake/draft`, {
    data: {
      currentSection: 'goals',
      sectionProgress: {
        personal: true,
        education: true,
        work: true,
        immigration: true,
        goals: false,
      },
      fieldValues: {
        personal: {
          firstName: 'Ada',
        },
        education: {},
        work: {},
        immigration: {},
        goals: {
          primaryGoal: 'permanent-residency',
          targetTimelineMonths: 18,
        },
      },
    },
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
  return await response.json() as { runId: string; profileSnapshotId: string }
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

async function readWorkspaceSummary(request: APIRequestContext, appBaseUrl: string) {
  const response = await request.get(`${appBaseUrl}/api/workspace/summary`, {
    failOnStatusCode: false,
  })

  const body = await response.json() as WorkspaceSummaryResponse
  expect(response.status()).toBe(200)
  return body
}

test.describe('Story 4.4 Workspace Summary API', () => {
  test('[P0][AC1] first-run users receive a first-run continuity summary when no draft or runs exist', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const body = await readWorkspaceSummary(request, appBaseUrl)

    expect(body.state).toBe('first-run')
    expect(body.draft.exists).toBe(false)
    expect(body.latestRun).toBeNull()
    expect(body.latestReviewRun).toBeNull()
    expect(body.archive.totalRuns).toBe(0)
    expect(body.comparison.available).toBe(false)
    expect(body.timeline.latestRunGenerated).toBe(false)
    expect(body.nextAction.actionKey).toBe('start-intake')
  })

  test('[P0][AC1][AC2] saved intake drafts move the workspace into resume-intake state', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    await saveDraft(request, appBaseUrl)

    const body = await readWorkspaceSummary(request, appBaseUrl)

    expect(body.state).toBe('resume-intake')
    expect(body.draft.exists).toBe(true)
    expect(body.draft.currentSection).toBe('goals')
    expect(body.timeline.intakeSaved).toBe(true)
    expect(body.nextAction.actionKey).toBe('resume-intake')
  })

  test('[P0][AC1][AC3] latest reviewable runs surface review-latest-run state with a preserved review target', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const latestRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story44-review'),
      profileSnapshotId: uniqueId('story44-review-snapshot'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, latestRun.runId)

    const body = await readWorkspaceSummary(request, appBaseUrl)

    expect(body.state).toBe('review-latest-run')
    expect(body.latestRun?.id).toBe(latestRun.runId)
    expect(body.latestReviewRun?.id).toBe(latestRun.runId)
    expect(body.timeline.latestRunGenerated).toBe(true)
    expect(body.timeline.nextStepPlanAvailable).toBe(true)
    expect(body.comparison.available).toBe(false)
    expect(body.nextAction.actionKey).toBe('review-latest-run')
  })

  test('[P0][AC1][AC3] the summary exposes compare-latest-runs state when two preserved reviewable runs exist', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const olderRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story44-older'),
      profileSnapshotId: uniqueId('story44-older-snapshot'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, olderRun.runId)

    const latestRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story44-latest'),
      profileSnapshotId: uniqueId('story44-latest-snapshot'),
      status: 'queued',
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, latestRun.runId)

    const body = await readWorkspaceSummary(request, appBaseUrl)

    expect(body.state).toBe('compare-latest-runs')
    expect(body.latestRun?.id).toBe(latestRun.runId)
    expect(body.latestReviewRun?.id).toBe(latestRun.runId)
    expect(body.archive.totalRuns).toBeGreaterThanOrEqual(2)
    expect(body.comparison.available).toBe(true)
    expect(body.comparison.currentRunId).toBe(latestRun.runId)
    expect(body.comparison.baselineRunId).toBe(olderRun.runId)
    expect(body.comparison.comparableRunCount).toBeGreaterThanOrEqual(2)
    expect(body.timeline.latestComparisonAvailable).toBe(true)
    expect(body.nextAction.actionKey).toBe('compare-latest-runs')
  })

  test('[P0][AC3] a newer in-progress run suppresses compare-latest-runs and reopens the current cycle instead', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const olderRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story44-compare-older'),
      profileSnapshotId: uniqueId('story44-compare-older-snapshot'),
      status: 'queued',
      resetExisting: true,
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })
    await startRecommendationRun(request, appBaseUrl, olderRun.runId)

    const latestReviewRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story44-compare-reviewable'),
      profileSnapshotId: uniqueId('story44-compare-reviewable-snapshot'),
      status: 'queued',
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })
    await startRecommendationRun(request, appBaseUrl, latestReviewRun.runId)

    const activeRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('story44-compare-active'),
      profileSnapshotId: uniqueId('story44-compare-active-snapshot'),
      status: 'queued',
      submittedPayload: createRecommendationNextStepPlanEvaluationPayload(),
    })

    const body = await readWorkspaceSummary(request, appBaseUrl)

    expect(body.state).toBe('review-latest-run')
    expect(body.latestRun?.id).toBe(activeRun.runId)
    expect(body.latestReviewRun?.id).toBe(latestReviewRun.runId)
    expect(body.comparison.available).toBe(false)
    expect(body.comparison.currentRunId).toBeNull()
    expect(body.nextAction.actionKey).toBe('review-latest-run')
  })
})
