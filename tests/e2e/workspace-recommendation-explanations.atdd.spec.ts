import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationLifecycleRecord,
  createRecommendationLifecycleRouteProbe,
  createRecommendationStatusPayload,
  type RecommendationLifecycleRecord,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'

type MockRecommendationFitSignal = {
  id: string
  label: string
  detail: string
  state: 'strength' | 'watch' | 'gap'
}

type MockRecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

type MockRecommendationTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

type MockRecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
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
  blockers: MockRecommendationBlocker[]
  tradeoffs: MockRecommendationTradeoff[]
  improvementActions: MockRecommendationImprovementAction[]
  composedSteps?: string[]
}

type MockRecommendationResultsPayload = {
  direct: MockRecommendationCandidate[]
  blocked: MockRecommendationCandidate[]
  composed: MockRecommendationCandidate[]
  noComposedReason?: string
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-explanations-e2e-${seed}@example.com`
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
      name: 'Recommendation Explanations E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for recommendation explanation tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for recommendation explanation tests.')
  }

  await page.context().addCookies(storageState.cookies)

  await page.goto(`${appBaseUrl}/workspace`, { waitUntil: 'domcontentloaded' })
  if (/\/auth(?:\?.*)?$/.test(page.url())) {
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
      throw new Error(`Sign-in retry failed while establishing recommendation explanation auth session: ${signInFailure}`)
    }

    const refreshedStorageState = await page.request.storageState()
    if (refreshedStorageState.cookies.length > 0) {
      await page.context().addCookies(refreshedStorageState.cookies)
    }

    await page.goto(`${appBaseUrl}/workspace`, { waitUntil: 'domcontentloaded' })
  }
}

function createStory32Candidate(
  overrides: Partial<MockRecommendationCandidate> = {},
): MockRecommendationCandidate {
  return {
    pathwayId: 'mvp-skilled-worker',
    type: 'direct',
    rank: 1,
    tier: 'strong-fit',
    score: 88,
    rationale: 'Skilled Worker pathway is strongest but still requires resolving two key gaps.',
    fitSignals: [
      {
        id: 'language-readiness',
        label: 'Language readiness',
        detail: 'CLB 7 against CLB 8 benchmark',
        state: 'watch',
      },
    ],
    qualification: 'supported',
    confidence: 'high',
    freshness: 'fresh',
    caveat: 'Remaining evidence gaps may lower confidence if not resolved before submission.',
    blockers: [],
    tradeoffs: [
      {
        id: 'effort-profile-update',
        dimension: 'effort',
        summary: 'Requires additional language prep and document updates.',
        impact: 'medium',
      },
      {
        id: 'timing-window',
        dimension: 'timing',
        summary: 'Application timing improves if language score is increased first.',
        impact: 'high',
      },
      {
        id: 'complexity-docs',
        dimension: 'complexity',
        summary: 'Evidence packaging is moderate once updated test scores are available.',
        impact: 'medium',
      },
    ],
    improvementActions: [],
    composedSteps: [],
    ...overrides,
  }
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
    const statusPayload = (runId && statusByRunId[runId]) ? statusByRunId[runId] : runs[0]

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
      body: JSON.stringify(payload || runs[0]),
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
        runId: run?.runId || 'run_story32_0',
        profileSnapshotId: run?.profileSnapshotId || 'snapshot_story32_0',
        status: run?.status || 'completed',
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
        noComposedReason: mockedResults?.noComposedReason || '',
      }),
    })
  })

  return routeProbe
}

test.describe('Story 3.2 Recommendation Blockers + Tradeoffs + Actions E2E ATDD', () => {
  test.describe.configure({ mode: 'serial' })

  test('[P0][AC1][AC2] workspace recommendation review renders factual blockers separate from improvement actions', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)

    const completedRun = createRecommendationLifecycleRecord({
      runId: 'run_story32_e2e_blockers_actions',
      profileSnapshotId: 'snapshot_story32_e2e_blockers_actions',
      status: 'completed',
    })

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
          direct: [createStory32Candidate()],
          blocked: [createStory32Candidate({
            pathwayId: 'mvp-provincial-nominee',
            type: 'blocked',
            rank: 2,
            tier: 'conditional-fit',
            score: 62,
            qualification: 'low-confidence',
            blockers: [{
              id: 'language-threshold',
              label: 'Language threshold',
              detail: 'Current CLB score is below the strongest-fit benchmark.',
              severity: 'high',
            }],
            improvementActions: [{
              id: 'raise-language-score',
              title: 'Raise language score to CLB 8+',
              detail: 'Schedule exam retake and upload updated score evidence.',
              priority: 'now',
              expectedImpact: 'Removes high-severity blocker and improves fit confidence.',
            }],
          })],
          composed: [],
        },
      },
    )

    await page.goto(routeProbe.workspacePath)
    await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

    const panel = page.getByTestId('recommendation-results-panel')
    await expect(panel.getByTestId('recommendation-blockers-panel').first()).toBeVisible()
    await expect(panel.getByTestId('recommendation-actions-queue').first()).toBeVisible()
    await expect(panel).toContainText(/language threshold/i)
    await expect(panel).toContainText(/raise language score/i)
  })

  test('[P0][AC3] workspace comparison renders explicit effort, timing, and complexity tradeoffs per pathway', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)

    const completedRun = createRecommendationLifecycleRecord({
      runId: 'run_story32_e2e_tradeoffs',
      profileSnapshotId: 'snapshot_story32_e2e_tradeoffs',
      status: 'completed',
    })

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
          direct: [createStory32Candidate()],
          blocked: [createStory32Candidate({
            pathwayId: 'mvp-provincial-nominee',
            type: 'blocked',
            rank: 2,
            tier: 'conditional-fit',
            score: 62,
            qualification: 'low-confidence',
            blockers: [{
              id: 'language-threshold',
              label: 'Language threshold',
              detail: 'Current CLB score is below the strongest-fit benchmark.',
              severity: 'high',
            }],
            improvementActions: [{
              id: 'raise-language-score',
              title: 'Raise language score to CLB 8+',
              detail: 'Schedule exam retake and upload updated score evidence.',
              priority: 'now',
              expectedImpact: 'Removes high-severity blocker and improves fit confidence.',
            }],
          })],
          composed: [createStory32Candidate({
            pathwayId: 'mvp-study-to-work',
            type: 'composed',
            rank: 3,
            tier: 'lower-confidence',
            score: 50,
            qualification: 'withheld',
            confidence: 'withheld',
            freshness: 'unknown',
            composedSteps: ['mvp-study-to-work', 'mvp-skilled-worker'],
            blockers: [{
              id: 'study-budget-threshold',
              label: 'Study budget threshold',
              detail: 'Profile budget is below the pathway planning threshold.',
              severity: 'high',
            }],
            improvementActions: [{
              id: 'increase-study-budget',
              title: 'Increase study budget plan',
              detail: 'Build and document a funding plan to satisfy pathway readiness.',
              priority: 'next',
              expectedImpact: 'Improves feasibility and confidence for staged eligibility.',
            }],
          })],
        },
      },
    )

    await page.goto(routeProbe.workspacePath)
    await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

    const panel = page.getByTestId('recommendation-results-panel')
    await expect(panel.getByTestId('recommendation-tradeoffs-panel').first()).toBeVisible()
    await expect(panel).toContainText(/effort/i)
    await expect(panel).toContainText(/timing/i)
    await expect(panel).toContainText(/complexity/i)
  })

  test('[P1][AC1][AC2][AC3] workspace exposes stable text-first hooks for blocker severity, tradeoff impact, and action priority', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)

    const completedRun = createRecommendationLifecycleRecord({
      runId: 'run_story32_e2e_hooks',
      profileSnapshotId: 'snapshot_story32_e2e_hooks',
      status: 'completed',
    })

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
          direct: [createStory32Candidate()],
          blocked: [createStory32Candidate({
            pathwayId: 'mvp-provincial-nominee',
            type: 'blocked',
            rank: 2,
            tier: 'conditional-fit',
            score: 62,
            qualification: 'low-confidence',
            blockers: [{
              id: 'language-threshold',
              label: 'Language threshold',
              detail: 'Current CLB score is below the strongest-fit benchmark.',
              severity: 'high',
            }],
            improvementActions: [{
              id: 'raise-language-score',
              title: 'Raise language score to CLB 8+',
              detail: 'Schedule exam retake and upload updated score evidence.',
              priority: 'now',
              expectedImpact: 'Removes high-severity blocker and improves fit confidence.',
            }],
          })],
          composed: [],
        },
      },
    )

    await page.goto(routeProbe.workspacePath)
    await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })

    const panel = page.getByTestId('recommendation-results-panel')
    await expect(panel.getByTestId('recommendation-blockers-panel').first()).toBeVisible()
    await expect(panel.getByTestId('recommendation-tradeoffs-panel').first()).toBeVisible()
    await expect(panel.getByTestId('recommendation-actions-queue').first()).toBeVisible()

    await expect(panel).toContainText(/high|critical|medium|low/i)
    await expect(panel).toContainText(/high|medium|low/i)
    await expect(panel).toContainText(/now|next|later/i)
  })
})
