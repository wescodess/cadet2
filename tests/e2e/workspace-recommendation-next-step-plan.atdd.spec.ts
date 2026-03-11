import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createBlockedCandidateWithNextStepPlan,
  createCandidateWithNextStepPlan,
  createComposedCandidateWithNextStepPlan,
  type RecommendationCandidateWithNextStepPlan,
} from '../support/fixtures/factories/recommendation-next-step-plan-factory'
import {
  createRecommendationLifecycleRecord,
  createRecommendationLifecycleRouteProbe,
  createRecommendationStatusPayload,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'
import { RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS } from '../support/fixtures/test-data'

async function mockRecommendationNextStepPlanData(
  page: Page,
  appBaseUrl: string,
  candidates: {
    direct: RecommendationCandidateWithNextStepPlan[]
    blocked: RecommendationCandidateWithNextStepPlan[]
    composed: RecommendationCandidateWithNextStepPlan[]
  },
) {
  const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
  const completedRun = createRecommendationLifecycleRecord({
    runId: `story41-e2e-run-${Date.now().toString(36)}`,
    profileSnapshotId: `story41-e2e-snapshot-${Math.random().toString(36).slice(2, 8)}`,
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
          direct: candidates.direct,
          blocked: candidates.blocked,
          composed: candidates.composed,
        },
        comparison: {
          mode: 'workspace',
          summary: 'Review each recommendation with its own next-step plan.',
          groups: [
            { key: 'direct', label: 'Available now', description: 'Routes you can act on soonest.', count: candidates.direct.length },
            { key: 'blocked', label: 'Blocked but close', description: 'Routes that need fixes first.', count: candidates.blocked.length },
            { key: 'composed', label: 'Longer-horizon', description: 'Multi-step routes.', count: candidates.composed.length },
          ],
          visibleGroupCount: 3,
          totalCandidateCount: candidates.direct.length + candidates.blocked.length + candidates.composed.length,
        },
      }),
    })
  })

  return routeProbe
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-next-step-plan-e2e-${seed}@example.com`
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
      name: 'Recommendation Next Step Plan E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for recommendation next-step plan E2E tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for recommendation next-step plan E2E tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

test.describe('Story 4.1 Recommendation Next-Step Plan E2E ATDD', () => {
  test('[P0][AC1] workspace renders a concrete next-step plan with summary framing and ordered steps inside each recommendation card', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)

    const routeProbe = await mockRecommendationNextStepPlanData(page, appBaseUrl, {
      direct: [createCandidateWithNextStepPlan()],
      blocked: [],
      composed: [],
    })

    await page.goto(routeProbe.workspacePath)

    const plan = page.getByTestId(RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS.plan).first()
    await expect(plan).toBeVisible()
    await expect(plan).toContainText('Take the direct route forward by packaging the strongest evidence first.')
    await expect(plan.getByTestId(RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS.item)).toHaveCount(2)
    await expect(plan).toContainText('Gather language and funds evidence')
    await expect(plan).toContainText('Update the profile before submission prep')
  })

  test('[P0][AC2] each recommendation card keeps its own next-step plan instead of sharing generic workspace guidance', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)

    const routeProbe = await mockRecommendationNextStepPlanData(page, appBaseUrl, {
      direct: [createCandidateWithNextStepPlan()],
      blocked: [createBlockedCandidateWithNextStepPlan()],
      composed: [createComposedCandidateWithNextStepPlan()],
    })

    await page.goto(routeProbe.workspacePath)

    const directCard = page.getByTestId('recommendation-result-item').filter({ hasText: 'Skilled Worker pathway' })
    const blockedCard = page.getByTestId('recommendation-result-item').filter({ hasText: 'Provincial Nominee pathway' })
    const composedCard = page.getByTestId('recommendation-result-item').filter({ hasText: 'Study-to-Work pathway' })

    await expect(directCard).toContainText('Take the direct route forward by packaging the strongest evidence first.')
    await expect(blockedCard).toContainText('Close the blocker first so this pathway can move from planning into execution.')
    await expect(composedCard).toContainText('Sequence this longer-horizon pathway as staged milestones instead of a single immediate application push.')
  })

  test('[P0][AC3] blocked or low-confidence pathways render visible limitation text with the plan so the action copy does not overstate certainty', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl)

    const routeProbe = await mockRecommendationNextStepPlanData(page, appBaseUrl, {
      direct: [],
      blocked: [createBlockedCandidateWithNextStepPlan()],
      composed: [],
    })

    await page.goto(routeProbe.workspacePath)

    const plan = page.getByTestId(RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS.plan).first()
    await expect(plan).toBeVisible()
    await expect(plan).toContainText('Do not treat this pathway as ready for submission until an eligible job offer is secured.')
    await expect(page.getByTestId(RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS.limitation).first()).toBeVisible()
  })

  test('[P1][AC3] mobile next-step plans stay keyboard reachable through progressive disclosure before revealing the ordered steps', async ({
    page,
    appBaseUrl,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await ensureAuthenticatedPage(page, appBaseUrl)

    const routeProbe = await mockRecommendationNextStepPlanData(page, appBaseUrl, {
      direct: [createCandidateWithNextStepPlan()],
      blocked: [],
      composed: [],
    })

    await page.goto(routeProbe.workspacePath)

    const toggle = page.getByTestId(RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS.toggle).first()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId(RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS.item).first()).toBeVisible()
  })
})
