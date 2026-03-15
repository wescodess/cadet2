import type { APIResponse, Page } from '@playwright/test'
import type { WorkspaceSummary } from '../../shared/types/workspace-summary'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationComparisonMetadata,
  createRecommendationComparisonPathwayType,
  type RecommendationComparisonPathwayType,
} from '../support/fixtures/factories/recommendation-comparison-factory'
import {
  createRecommendationRunHistoryDetail,
  createRecommendationRunHistoryListFixture,
} from '../support/fixtures/factories/recommendation-run-history-factory'
import {
  createWorkspaceSummaryFixture,
  createWorkspaceSummaryRouteProbe,
} from '../support/fixtures/factories/workspace-summary-factory'
import { getTestEnvironment } from '../support/helpers/env'

type MockRecommendationCandidate = {
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
  pathwayType: RecommendationComparisonPathwayType
  citations: Array<{
    citationId: string
    claimText: string
    sourceTitle: string
    sourceUrl: string
    sourceType: 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
    excerpt: string
    retrievalDate: string
    freshness: 'fresh' | 'stale' | 'unknown'
  }>
  trustBoundary: 'source-backed' | 'inferred' | 'system-generated'
  nextStepPlan: {
    summary: string
    steps: Array<{
      sequence: number
      title: string
      detail: string
      priority: 'now' | 'next' | 'later'
    }>
    limitation: string
  }
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-workspace-continuity-e2e-${seed}@example.com`
}

async function describeAuthFailure(response: APIResponse) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureAuthenticatedPage(page: Page, appBaseUrl: string) {
  const email = uniqueAuthEmail()
  const password = 'PlaywrightPass123!'

  const signUpResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    data: {
      email,
      password,
      name: 'Workspace Continuity E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for workspace continuity tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for workspace continuity tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

function createMockCandidate(overrides: Partial<MockRecommendationCandidate> = {}): MockRecommendationCandidate {
  return {
    pathwayId: 'mvp-skilled-worker',
    type: 'direct',
    rank: 1,
    tier: 'strong-fit',
    score: 91,
    rationale: 'Skilled Worker remains the strongest available pathway in the current planning cycle.',
    fitSignals: [
      {
        id: 'language',
        label: 'Language readiness',
        detail: 'CLB 9 clears the active benchmark.',
        state: 'strength',
      },
    ],
    qualification: 'supported',
    confidence: 'high',
    freshness: 'fresh',
    caveat: 'Confirm threshold changes before submitting.',
    pathwayType: createRecommendationComparisonPathwayType('direct'),
    citations: [
      {
        citationId: 'story44-citation-1',
        claimText: 'Language readiness remains above the required benchmark.',
        sourceTitle: 'Recommendation Assessment Guide',
        sourceUrl: 'https://example.com/recommendation-assessment-guide',
        sourceType: 'assessment-guide',
        excerpt: 'Language results remain aligned with the top pathway.',
        retrievalDate: '2026-03-11T00:00:00.000Z',
        freshness: 'fresh',
      },
    ],
    trustBoundary: 'source-backed',
    nextStepPlan: {
      summary: 'Move the strongest evidence into your submission-ready checklist.',
      steps: [
        {
          sequence: 1,
          title: 'Review employer evidence',
          detail: 'Confirm the latest employer letter still matches the submitted job history.',
          priority: 'now',
        },
      ],
      limitation: 'Monitor threshold movement between refreshes.',
    },
    ...overrides,
  }
}

async function mockWorkspaceContinuity(
  page: Page,
  appBaseUrl: string,
  options: {
    summary?: WorkspaceSummary
  } = {},
) {
  const routeProbe = createWorkspaceSummaryRouteProbe(appBaseUrl)
  const summary = options.summary || createWorkspaceSummaryFixture()
  const runs = [
    {
      runId: summary.latestRun!.id,
      profileSnapshotId: summary.latestRun!.profileSnapshotId,
      status: summary.latestRun!.status,
      createdAt: summary.latestRun!.createdAt,
      updatedAt: summary.latestRun!.updatedAt,
    },
  ]
  const historyRuns = createRecommendationRunHistoryListFixture()
  const latestRunDetail = createRecommendationRunHistoryDetail({
    id: summary.latestRun!.id,
    status: 'completed',
    recommendationCount: summary.latestRun!.recommendationCount,
    profileSnapshotSummary: summary.latestRun!.profileSnapshotSummary,
    createdAt: summary.latestRun!.createdAt,
    isLatest: true,
    isAvailable: true,
  })

  await page.route('**/api/workspace/summary**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summary),
    })
  })

  await page.route('**/api/workspace/recommendation-runs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(runs),
    })
  })

  await page.route('**/api/recommendations/runs/*/status**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: summary.latestRun!.id,
        profileSnapshotId: summary.latestRun!.profileSnapshotId,
        status: summary.latestRun!.status,
        statusMessage: summary.latestRun!.statusMessage,
        resumable: summary.latestRun!.resumable,
        processingHeartbeatAt: summary.latestRun!.updatedAt,
        createdAt: summary.latestRun!.createdAt,
        updatedAt: summary.latestRun!.updatedAt,
      }),
    })
  })

  await page.route('**/api/recommendations/runs/*/start**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: summary.latestRun!.id,
        profileSnapshotId: summary.latestRun!.profileSnapshotId,
        status: summary.latestRun!.status,
        statusMessage: summary.latestRun!.statusMessage,
        resumable: summary.latestRun!.resumable,
        processingHeartbeatAt: summary.latestRun!.updatedAt,
        createdAt: summary.latestRun!.createdAt,
        updatedAt: summary.latestRun!.updatedAt,
      }),
    })
  })

  await page.route('**/api/recommendations/runs/*/refresh**', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: 'run_story44_refreshed',
        profileSnapshotId: 'snapshot_story44_refreshed',
        refreshedFromRunId: summary.latestRun!.id,
        previousProfileSnapshotId: summary.latestRun!.profileSnapshotId,
        refreshRootRunId: summary.latestRun!.refreshRootRunId || summary.latestRun!.id,
        refreshSequence: (summary.latestRun!.refreshSequence || 0) + 1,
        status: 'queued',
        statusMessage: 'Recommendation processing is active and resumable while internal services catch up.',
        resumable: true,
        processingHeartbeatAt: summary.latestRun!.updatedAt,
        createdAt: summary.latestRun!.updatedAt,
        updatedAt: summary.latestRun!.updatedAt,
      }),
    })
  })

  await page.route('**/api/recommendations/runs/*/results**', async (route) => {
    const directCandidate = createMockCandidate()

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: summary.latestRun!.id,
        profileSnapshotId: summary.latestRun!.profileSnapshotId,
        status: summary.latestRun!.status,
        results: {
          direct: [directCandidate],
          blocked: [],
          composed: [],
        },
        comparison: createRecommendationComparisonMetadata({
          directCount: 1,
          blockedCount: 0,
          composedCount: 0,
        }),
      }),
    })
  })

  await page.route('**/api/workspace/runs**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname !== '/api/workspace/runs') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runs: historyRuns,
      }),
    })
  })

  await page.route('**/api/workspace/runs/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(latestRunDetail),
    })
  })

  await page.route('**/api/intake/draft**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        savedAt: summary.draft.savedAt,
        currentSection: summary.draft.currentSection,
        values: {},
      }),
    })
  })

  return {
    routeProbe,
    summary,
  }
}

test.describe('Story 4.4 Workspace Continuity Hub', () => {
  test.use({ authSessionEnabled: false })

  test('[P0][AC1][AC2][AC3] returning users can continue planning, open archive, and start a new cycle without losing continuity', async ({
    page,
    appBaseUrl,
  }) => {
    const { routeProbe, summary } = await mockWorkspaceContinuity(page, appBaseUrl)
    await ensureAuthenticatedPage(page, appBaseUrl)

    await page.goto(routeProbe.dashboardPath)

    await expect(page.getByTestId('planning-workspace-hub')).toBeVisible()
    await expect(page.getByTestId('planning-progress-timeline')).toContainText('Latest comparison available')

    await page.getByRole('button', { name: 'Review current recommendations' }).click()
    await expect(page).toHaveURL(/\/workspace\/recommendations$/)

    await page.goto(routeProbe.dashboardPath)
    await page.getByRole('button', { name: 'Open archive' }).click()
    await expect(page).toHaveURL(routeProbe.historyPath)
    await expect(page.getByTestId('recommendation-history-list')).toBeVisible()

    const intakeDraftRequest = page.waitForRequest((request) => {
      const url = new URL(request.url())

      return url.pathname === '/api/intake/draft'
        && url.searchParams.get('mode') === 'new-cycle'
        && url.searchParams.get('sourceRun') === summary.latestRun!.id
    })

    await page.goto(routeProbe.dashboardPath)
    await page.getByTestId('planning-cycle-start').click()
    await intakeDraftRequest
    await expect(page).toHaveURL(/\/workspace\/intake(?:\?.*)?$/)
  })

  test('[P0][AC2][AC3] refresh from latest profile routes directly into the newly created planning cycle', async ({
    page,
    appBaseUrl,
  }) => {
    const { routeProbe } = await mockWorkspaceContinuity(page, appBaseUrl)
    await ensureAuthenticatedPage(page, appBaseUrl)

    await page.goto(routeProbe.dashboardPath)
    await page.getByRole('button', { name: 'Refresh from latest profile' }).click()

    await expect(page).toHaveURL(/\/workspace\/recommendations$/)
  })

  test('[P0][AC1][AC3] latest-cycle review actions reopen the newest run when it is newer than the reviewable archive set', async ({
    page,
    appBaseUrl,
  }) => {
    const activeRunId = 'run_story44_active_cycle'
    const reviewableRunId = 'run_story44_latest_review'
    const activeRunUpdatedAt = '2026-03-12T14:00:00.000Z'
    const reviewableRunUpdatedAt = '2026-03-11T17:05:00.000Z'

    const { routeProbe } = await mockWorkspaceContinuity(page, appBaseUrl, {
      summary: createWorkspaceSummaryFixture({
        state: 'review-latest-run',
        latestRun: {
          id: activeRunId,
          profileSnapshotId: 'snapshot_story44_active_cycle',
          status: 'queued',
          statusMessage: 'Recommendation processing is active and resumable while internal services catch up.',
          resumable: true,
          createdAt: '2026-03-12T13:58:00.000Z',
          updatedAt: activeRunUpdatedAt,
          recommendationCount: 0,
          isAvailable: false,
          profileSnapshotSummary: 'A new planning cycle is in progress from the latest preserved profile.',
          refreshedFromRunId: reviewableRunId,
          previousProfileSnapshotId: 'snapshot_story44_latest_review',
          refreshRootRunId: 'run_story44_previous',
          refreshSequence: 2,
        },
        latestReviewRun: {
          id: reviewableRunId,
          profileSnapshotId: 'snapshot_story44_latest_review',
          status: 'completed',
          statusMessage: 'Recommendation evaluation completed.',
          resumable: false,
          createdAt: '2026-03-11T17:00:00.000Z',
          updatedAt: reviewableRunUpdatedAt,
          recommendationCount: 3,
          isAvailable: true,
          profileSnapshotSummary: 'CLB 9, software engineer, Ontario preference, 18-month target.',
          refreshedFromRunId: 'run_story44_previous',
          previousProfileSnapshotId: 'snapshot_story44_previous',
          refreshRootRunId: 'run_story44_previous',
          refreshSequence: 1,
        },
        comparison: {
          available: false,
          baselineRunId: null,
          currentRunId: null,
          comparableRunCount: 2,
        },
        nextAction: {
          actionKey: 'review-latest-run',
          state: 'review-latest-run',
          reason: 'Your latest planning cycle is newer than the preserved review set, so reopen it from the workspace to track the current status safely.',
        },
        lastActivity: {
          label: 'Cycle refreshed',
          detail: 'A newer planning cycle is active and still processing.',
          occurredAt: activeRunUpdatedAt,
        },
      }),
    })
    await ensureAuthenticatedPage(page, appBaseUrl)

    await page.goto(routeProbe.dashboardPath)
    await page.getByRole('button', { name: 'Review current recommendations', exact: true }).click()

    await expect(page).toHaveURL(/\/workspace\/recommendations$/)
  })
})
