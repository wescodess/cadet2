import type { Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationComparisonCandidate,
  type RecommendationComparisonResultsPayload,
} from '../support/fixtures/factories/recommendation-comparison-factory'
import {
  createRecommendationLifecycleRecord,
  createRecommendationLifecycleRouteProbe,
  createRecommendationStatusPayload,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'
import {
  RECOMMENDATION_COMPARISON_ATDD_TEST_IDS,
  RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS,
} from '../support/fixtures/test-data'

async function mockRecommendationWorkspaceData(
  page: Page,
  appBaseUrl: string,
  resultsPayload: RecommendationComparisonResultsPayload,
) {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
  const completedRun = createRecommendationLifecycleRecord({
    runId: `story33-e2e-run-${Date.now().toString(36)}`,
    profileSnapshotId: `story33-e2e-snapshot-${Math.random().toString(36).slice(2, 8)}`,
    status: 'completed',
  })
  const statusPayload = createRecommendationStatusPayload(completedRun, {
    status: 'completed',
    statusMessage: 'Recommendation evaluation completed.',
  })

  await page.route('**/api/workspace/recommendation-runs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([completedRun]),
    })
  })

  await page.route('**/api/recommendations/runs/*/status**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(statusPayload),
    })
  })

  await page.route('**/api/recommendations/runs/*/start**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(statusPayload),
    })
  })

  await page.route('**/api/recommendations/runs/*/results**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: completedRun.runId,
        profileSnapshotId: completedRun.profileSnapshotId,
        status: 'completed',
        results: {
          direct: resultsPayload.direct,
          blocked: resultsPayload.blocked,
          composed: resultsPayload.composed,
        },
        comparison: resultsPayload.comparison,
        noComposedReason: resultsPayload.noComposedReason || '',
      }),
    })
  })

  return routeProbe
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-comparison-e2e-${seed}@example.com`
}

async function describeAuthFailure(response: Awaited<ReturnType<Page['request']['post']>>) {
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
      name: 'Recommendation Comparison E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for recommendation comparison tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for recommendation comparison tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

test.describe('Story 3.3 Recommendation Comparison Workspace E2E ATDD', () => {
  test('[P0][AC1][AC2][AC3] workspace renders explicit available-now, blocked-but-close, and strategic route groupings', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)
    const routeProbe = await mockRecommendationWorkspaceData(page, appBaseUrl, {
      direct: [
        createRecommendationComparisonCandidate(),
      ],
      blocked: [
        createRecommendationComparisonCandidate({
          pathwayId: 'mvp-provincial-nominee',
          type: 'blocked',
          rank: 2,
          tier: 'conditional-fit',
          score: 64,
          qualification: 'low-confidence',
          confidence: 'medium',
          rationale: 'A nomination route is close, but a valid job offer still blocks near-term action.',
          blockers: [
            {
              id: 'job-offer',
              label: 'Valid job offer requirement',
              detail: 'A valid job offer is still missing for this route.',
              severity: 'critical',
            },
          ],
          improvementActions: [
            {
              id: 'secure-job-offer',
              title: 'Secure an eligible job offer',
              detail: 'Prioritize employer outreach before re-running this pathway.',
              priority: 'now',
              expectedImpact: 'Unlocks near-term nominee eligibility.',
            },
          ],
          pathwayType: {
            key: 'blocked-but-close',
            label: RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS.blocked,
            description: 'Needs one or more concrete fixes before it becomes actionable.',
          },
        }),
      ],
      composed: [
        createRecommendationComparisonCandidate({
          pathwayId: 'mvp-study-to-work',
          type: 'composed',
          rank: 3,
          tier: 'lower-confidence',
          score: 58,
          qualification: 'withheld',
          confidence: 'low',
          rationale: 'A study-first route works as a staged plan when the immediate options are constrained.',
          blockers: [
            {
              id: 'budget-gap',
              label: 'Study budget threshold',
              detail: 'A stronger budget plan is needed before this route becomes realistic.',
              severity: 'high',
            },
          ],
          improvementActions: [
            {
              id: 'increase-budget',
              title: 'Increase pathway budget plan',
              detail: 'Build savings before committing to the study-first route.',
              priority: 'next',
              expectedImpact: 'Improves feasibility for the longer-horizon route.',
            },
          ],
          composedSteps: ['mvp-skilled-worker', 'build-study-budget'],
          pathwayType: {
            key: 'strategic-multi-step',
            label: RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS.composed,
            description: 'Requires staged milestones instead of immediate execution.',
          },
        }),
      ],
      comparison: {
        mode: 'workspace',
        summary: 'Compare immediate, blocked, and longer-horizon routes without losing rank context.',
        groups: [
          { key: 'direct', label: 'Available now', description: 'Routes you can act on soonest.', count: 1 },
          { key: 'blocked', label: 'Blocked but close', description: 'Routes that need specific fixes first.', count: 1 },
          { key: 'composed', label: 'Longer-horizon pathways', description: 'Strategic multi-step routes.', count: 1 },
        ],
        visibleGroupCount: 3,
        totalCandidateCount: 3,
      },
    })

    await page.goto(routeProbe.workspacePath)

    const panel = page.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.panel)
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.workspace)).toBeVisible()
    await expect(panel.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.group)).toHaveCount(3)
    await expect(panel.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.pathwayTypeBadge)).toHaveCount(3)
    await expect(panel.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.routePlanner)).toBeVisible()
    await expect(panel).toContainText(RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS.direct)
    await expect(panel).toContainText(RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS.blocked)
    await expect(panel).toContainText(RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS.composed)
  })

  test('[P0][AC4] workspace falls back to a structured review state when only one comparison bucket is available', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)
    const routeProbe = await mockRecommendationWorkspaceData(page, appBaseUrl, {
      direct: [],
      blocked: [
        createRecommendationComparisonCandidate({
          pathwayId: 'mvp-provincial-nominee',
          type: 'blocked',
          rank: 1,
          tier: 'conditional-fit',
          score: 55,
          qualification: 'low-confidence',
          confidence: 'medium',
          rationale: 'This is the only structured route available right now, but it still needs a job offer.',
          blockers: [
            {
              id: 'job-offer',
              label: 'Valid job offer requirement',
              detail: 'A valid job offer is still required.',
              severity: 'critical',
            },
          ],
          improvementActions: [
            {
              id: 'secure-job-offer',
              title: 'Secure an eligible job offer',
              detail: 'Prioritize employer outreach and update the profile when the offer is secured.',
              priority: 'now',
              expectedImpact: 'Turns the closest blocked route into a stronger near-term option.',
            },
          ],
          pathwayType: {
            key: 'blocked-but-close',
            label: RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS.blocked,
            description: 'Needs one or more concrete fixes before it becomes actionable.',
          },
        }),
      ],
      composed: [],
      comparison: {
        mode: 'fallback',
        summary: 'Comparison is limited for this run, so the workspace shifts into a structured review state.',
        limitation: 'Current results are limited to blocked-but-close pathways.',
        groups: [
          { key: 'blocked', label: 'Blocked but close', description: 'Routes that need specific fixes first.', count: 1 },
        ],
        visibleGroupCount: 1,
        totalCandidateCount: 1,
      },
      noComposedReason: 'No currently viable direct pathway is available to anchor a composed route in the MVP scope.',
    })

    await page.goto(routeProbe.workspacePath)

    const panel = page.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.panel)
    await expect(panel).toBeVisible()
    await expect(panel.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.fallback)).toBeVisible()
    await expect(panel.getByTestId(RECOMMENDATION_COMPARISON_ATDD_TEST_IDS.group)).toHaveCount(1)
    await expect(panel).toContainText(RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS.blocked)
    await expect(panel).toContainText(/comparison is limited/i)
    await expect(panel).toContainText(/no currently viable direct pathway/i)
    await expect(panel).toContainText(/secure an eligible job offer/i)
  })
})
