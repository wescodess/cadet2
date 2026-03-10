import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationComparisonMetadata,
  createRecommendationComparisonPathwayType,
  type RecommendationComparisonMetadata,
  type RecommendationComparisonPathwayType,
} from '../support/fixtures/factories/recommendation-comparison-factory'
import {
  createRecommendationLifecycleRecord,
  createRecommendationLifecycleRouteProbe,
  createRecommendationStatusPayload,
  type RecommendationLifecycleRecord,
  type RecommendationLifecycleStatus,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import {
  RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS,
  RECOMMENDATION_LIFECYCLE_IN_PROGRESS_COPY_SNIPPETS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type MockRecommendationFitSignal = {
  id: string
  label: string
  detail: string
  state: 'strength' | 'watch' | 'gap'
}

type MockRecommendationCitation = {
  citationId: string
  claimText: string
  sourceTitle: string
  sourceUrl: string
  sourceType: 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
  excerpt: string
  retrievalDate: string
  freshness: 'fresh' | 'stale' | 'unknown'
}

type MockRecommendationCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  rationale: string
  fitSignals: MockRecommendationFitSignal[]
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
  composedSteps?: string[]
  pathwayType: RecommendationComparisonPathwayType
  citations: MockRecommendationCitation[]
  trustBoundary: 'source-backed' | 'inferred' | 'system-generated'
}

type MockRecommendationResultsPayload = {
  direct: MockRecommendationCandidate[]
  blocked: MockRecommendationCandidate[]
  composed: MockRecommendationCandidate[]
  comparison?: RecommendationComparisonMetadata
  noComposedReason?: string
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-lifecycle-e2e-${seed}@example.com`
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
      name: 'Recommendation Lifecycle E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for recommendation lifecycle tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for recommendation lifecycle tests.')
  }

  await page.context().addCookies(storageState.cookies)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`${appBaseUrl}/workspace`, { waitUntil: 'domcontentloaded' })
    if (/\/workspace(?:\?.*)?$/.test(page.url())) {
      return
    }

    const signInResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
      data: {
        email,
        password,
        rememberMe: true,
      },
      failOnStatusCode: false,
    })

    if (!signInResponse.ok()) {
      const signInFailure = await describeAuthFailure(signInResponse)
      throw new Error(`Sign-in retry failed while establishing recommendation lifecycle auth session: ${signInFailure}`)
    }

    const refreshedStorageState = await page.request.storageState()
    if (refreshedStorageState.cookies.length > 0) {
      await page.context().addCookies(refreshedStorageState.cookies)
    }
  }

  throw new Error(`Could not open protected workspace route after sign-up/sign-in retries. Final URL: ${page.url()}`)
}

async function mockRecommendationLifecycleResponses(
  page: Page,
  appBaseUrl: string,
  runs: RecommendationLifecycleRecord[],
  statusByRunId: Partial<Record<string, RecommendationLifecycleRecord>>,
  resultsByRunId: Partial<Record<string, MockRecommendationResultsPayload>> = {},
) {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)

  await page.route('**/api/workspace/recommendation-runs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(runs),
    })
  })

  await page.route('**/api/recommendations/runs/*/status**', async (route) => {
    const url = new URL(route.request().url())
    const segments = url.pathname.split('/').filter(Boolean)
    const runId = segments.length >= 4 ? segments[3] : ''

    const statusPayload = (runId && statusByRunId[runId])
      ? statusByRunId[runId]
      : runs[0]

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(statusPayload),
    })
  })

  await page.route('**/api/recommendations/runs/*/start**', async (route) => {
    const url = new URL(route.request().url())
    const segments = url.pathname.split('/').filter(Boolean)
    const runId = segments.length >= 4 ? segments[3] : ''
    const payload = (runId && statusByRunId[runId]) ? statusByRunId[runId] : runs[0]

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload || runs[0] || createRunWithStatus('queued', '0')),
    })
  })

  await page.route('**/api/recommendations/runs/*/results**', async (route) => {
    const url = new URL(route.request().url())
    const segments = url.pathname.split('/').filter(Boolean)
    const runId = segments.length >= 4 ? segments[3] : ''
    const run = runs.find(candidate => candidate.runId === runId) || runs[0]
    const mockedResults = (runId && resultsByRunId[runId]) || null

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: run?.runId || 'run_story21_0',
        profileSnapshotId: run?.profileSnapshotId || 'snapshot_story21_0',
        status: run?.status || 'queued',
        results: mockedResults
          ? {
              direct: mockedResults.direct,
              blocked: mockedResults.blocked,
              composed: mockedResults.composed,
            }
          : {
              direct: [],
              blocked: [],
              composed: [],
            },
        comparison: mockedResults?.comparison || createRecommendationComparisonMetadata({
          directCount: mockedResults?.direct.length || 0,
          blockedCount: mockedResults?.blocked.length || 0,
          composedCount: mockedResults?.composed.length || 0,
          noComposedReason: mockedResults?.noComposedReason,
        }),
        noComposedReason: mockedResults?.noComposedReason || '',
      }),
    })
  })

  return routeProbe
}

function createRunWithStatus(status: RecommendationLifecycleStatus, suffix: string) {
  const timestamp = new Date(Date.parse('2026-03-04T13:15:00.000Z') + (Number(suffix) * 60_000)).toISOString()

  return createRecommendationLifecycleRecord({
    runId: `run_story21_${suffix}`,
    profileSnapshotId: `snapshot_story21_${suffix}`,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

function createMockCandidate(
  overrides: Partial<MockRecommendationCandidate> = {},
): MockRecommendationCandidate {
  const candidate: MockRecommendationCandidate = {
    pathwayId: 'mvp-skilled-worker',
    type: 'direct',
    rank: 1,
    tier: 'strong-fit',
    score: 90,
    rationale: 'Skilled Worker pathway appears because your profile aligns with key requirements.',
    fitSignals: [
      {
        id: 'english-clb',
        label: 'Language readiness',
        detail: 'CLB 9 against CLB 8 benchmark',
        state: 'strength',
      },
    ],
    qualification: 'supported',
    confidence: 'high',
    freshness: 'fresh',
    caveat: 'Direct-fit recommendation is supported by current profile and MVP pathway rules.',
    composedSteps: [],
    pathwayType: createRecommendationComparisonPathwayType('direct'),
    citations: [{
      citationId: 'story21-language-readiness',
      claimText: 'Language readiness supports this recommendation.',
      sourceTitle: 'Recommendation Assessment Guide',
      sourceUrl: 'https://example.com/recommendation-assessment-guide',
      sourceType: 'assessment-guide',
      excerpt: 'Language readiness remains a key decision input for the current recommendation surface.',
      retrievalDate: '2026-03-01T00:00:00Z',
      freshness: 'fresh',
    }],
    trustBoundary: 'source-backed',
    ...overrides,
  }

  return {
    ...candidate,
    pathwayType: overrides.pathwayType || createRecommendationComparisonPathwayType(candidate.type),
  }
}

test.describe('Story 2.1 Recommendation Status Banner E2E ATDD', () => {
  test.describe.configure({ mode: 'serial' })

  test('[P0][AC2][AC3] guest is redirected to auth when opening workspace recommendation status surface', async ({
    page,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)

    await page.goto(routeProbe.workspacePath)

    await expect(page).toHaveURL(/\/auth(?:\?.*)?$/)
  })

  test.describe('authenticated standard user', () => {
    test('[P0][AC2][AC3] workspace shows stable recommendation status banner hook for in-progress lifecycle states', async ({
      page,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const evaluatingRun = createRunWithStatus('evaluating', '1')
      const routeProbe = await mockRecommendationLifecycleResponses(
        page,
        appBaseUrl,
        [evaluatingRun],
        {
          [evaluatingRun.runId]: createRecommendationStatusPayload(evaluatingRun, {
            status: 'evaluating',
            statusMessage: 'Recommendation processing is actively evaluating your profile.',
            resumable: true,
            processingHeartbeatAt: new Date('2026-03-04T13:18:00.000Z').toISOString(),
          }),
        },
      )

      await page.goto(routeProbe.workspacePath)
      await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

      const banner = page.getByTestId(RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS.statusBanner)
      await expect(banner).toBeVisible()
      await expect(banner).toContainText(/evaluating|processing/i)
    })

    test('[P1][AC4] recoverable delay state copy stays active and resumable instead of appearing stuck', async ({
      page,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const queuedRun = createRunWithStatus('queued', '2')
      const routeProbe = await mockRecommendationLifecycleResponses(
        page,
        appBaseUrl,
        [queuedRun],
        {
          [queuedRun.runId]: createRecommendationStatusPayload(queuedRun, {
            status: 'queued',
            statusMessage: 'Processing is active and resumable while internal services catch up.',
            resumable: true,
          }),
        },
      )

      await page.goto(routeProbe.workspacePath)
      await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

      const banner = page.getByTestId(RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS.statusBanner)
      await expect(banner).toBeVisible()
      for (const snippet of RECOMMENDATION_LIFECYCLE_IN_PROGRESS_COPY_SNIPPETS) {
        await expect(banner).toContainText(new RegExp(snippet, 'i'))
      }
    })

    test('[P1][AC2][AC3] terminal lifecycle states are rendered with text-first messaging (completed, degraded, failed)', async ({
      page,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const completedRun = createRunWithStatus('completed', '3')
      const degradedRun = createRunWithStatus('degraded', '4')
      const failedRun = createRunWithStatus('failed', '5')
      const routeProbe = await mockRecommendationLifecycleResponses(
        page,
        appBaseUrl,
        [completedRun, degradedRun, failedRun],
        {
          [completedRun.runId]: createRecommendationStatusPayload(completedRun, { status: 'completed', statusMessage: 'Recommendation evaluation completed.' }),
          [degradedRun.runId]: createRecommendationStatusPayload(degradedRun, { status: 'degraded', statusMessage: 'Recommendation evaluation completed with degraded quality.' }),
          [failedRun.runId]: createRecommendationStatusPayload(failedRun, { status: 'failed', statusMessage: 'Recommendation evaluation failed and requires retry.' }),
        },
      )

      await page.goto(routeProbe.workspacePath)
      await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

      const banner = page.getByTestId(RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS.statusBanner)
      await expect(banner).toContainText(/completed|degraded|failed/i)
      await expect(banner).toContainText(/recommendation/i)
    })

    test('[P0][AC2][AC3] recommendation results show text-readable tier badges and rationale signals independent of color-only cues', async ({
      page,
      appBaseUrl,
    }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const completedRun = createRunWithStatus('completed', '8')
      const routeProbe = await mockRecommendationLifecycleResponses(
        page,
        appBaseUrl,
        [completedRun],
        {
          [completedRun.runId]: createRecommendationStatusPayload(completedRun, {
            status: 'completed',
            statusMessage: 'Recommendation evaluation completed.',
          }),
        },
        {
          [completedRun.runId]: {
            direct: [
              createMockCandidate({
                pathwayId: 'mvp-skilled-worker',
                tier: 'strong-fit',
                qualification: 'supported',
                confidence: 'high',
              }),
            ],
            blocked: [
              createMockCandidate({
                pathwayId: 'mvp-provincial-nominee',
                type: 'blocked',
                rank: 2,
                tier: 'conditional-fit',
                score: 58,
                qualification: 'low-confidence',
                confidence: 'medium',
                freshness: 'stale',
                rationale: 'Provincial Nominee pathway is conditional due to unresolved constraints.',
                fitSignals: [
                  {
                    id: 'job-offer',
                    label: 'Job offer requirement',
                    detail: 'No valid job offer on file',
                    state: 'gap',
                  },
                ],
                caveat: 'A valid job offer and relocation flexibility are still required.',
              }),
            ],
            composed: [
              createMockCandidate({
                pathwayId: 'mvp-study-to-work',
                type: 'composed',
                rank: 3,
                tier: 'lower-confidence',
                score: 52,
                qualification: 'withheld',
                confidence: 'withheld',
                freshness: 'unknown',
                rationale: 'Study-to-Work appears as a staged option but current evidence is insufficient.',
                fitSignals: [
                  {
                    id: 'study-budget',
                    label: 'Study budget',
                    detail: 'Budget is below CAD 25,000 benchmark',
                    state: 'gap',
                  },
                ],
                caveat: 'This pathway is withheld until stronger budget and timeline evidence is provided.',
                composedSteps: ['mvp-skilled-worker', 'build-study-budget'],
              }),
            ],
            noComposedReason: '',
          },
        },
      )

      await page.goto(routeProbe.workspacePath)
      await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

      const tierBadges = page.getByTestId(RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS.tierBadge)
      await expect(tierBadges).toHaveCount(3)
      await expect(tierBadges.nth(0)).toContainText(/strong fit/i)
      await expect(tierBadges.nth(0)).toContainText(/high alignment/i)
      await expect(tierBadges.nth(1)).toContainText(/conditional fit/i)
      await expect(tierBadges.nth(2)).toContainText(/lower confidence/i)

      const panel = page.getByTestId('recommendation-results-panel')
      await expect(panel).toContainText(/because your profile aligns|conditional due to unresolved constraints/i)
      await expect(panel).toContainText(/language readiness|job offer requirement|study budget/i)
      await expect(panel).toContainText(/caution/i)
    })

    test('[P0][AC2][AC3] run list and status banner hooks remain stable for workspace automation', async ({ page, appBaseUrl }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const evaluatingRun = createRunWithStatus('evaluating', '6')
      const queuedRun = createRunWithStatus('queued', '7')
      const routeProbe = await mockRecommendationLifecycleResponses(
        page,
        appBaseUrl,
        [evaluatingRun, queuedRun],
        {
          [evaluatingRun.runId]: createRecommendationStatusPayload(evaluatingRun, {
            status: 'evaluating',
            statusMessage: 'Recommendation processing is evaluating your profile now.',
          }),
          [queuedRun.runId]: createRecommendationStatusPayload(queuedRun, {
            status: 'queued',
            statusMessage: 'Recommendation processing is queued and will start shortly.',
          }),
        },
      )

      await page.goto(routeProbe.workspacePath)
      await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

      await expect(page.getByTestId(RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS.runList)).toBeVisible()
      await expect(page.getByTestId(RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS.runItem)).toHaveCount(2)
      await expect(page.getByTestId(RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS.statusBanner)).toBeVisible()
    })
  })
})
