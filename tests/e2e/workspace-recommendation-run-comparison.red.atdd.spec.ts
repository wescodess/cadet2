import type { Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationRunComparisonFixture,
  createRecommendationRunComparisonRouteProbe,
} from '../support/fixtures/factories/recommendation-run-comparison-factory'
import { createRecommendationRunHistoryListFixture } from '../support/fixtures/factories/recommendation-run-history-factory'
import { RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS } from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-run-comparison-e2e-red-${seed}@example.com`
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
      name: 'Recommendation Run Comparison E2E Red-Phase Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for run comparison red-phase tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for run comparison red-phase tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

async function mockRunComparisonData(page: Page, appBaseUrl: string) {
  const routeProbe = createRecommendationRunComparisonRouteProbe(appBaseUrl)
  const runs = createRecommendationRunHistoryListFixture()
  const comparison = createRecommendationRunComparisonFixture()

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
        runs,
      }),
    })
  })

  await page.route('**/api/workspace/runs/compare**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(comparison),
    })
  })

  return {
    routeProbe,
    runs,
    comparison,
  }
}

test.describe('Story 4.3 Recommendation Run Comparison E2E RED ATDD', () => {
  test.use({ authSessionEnabled: false })

  test.skip('[P0][AC1][AC3][AC4][AC5] history compare action opens the comparison dashboard with diff stats, profile deltas, and trust evidence context', async ({
    page,
    appBaseUrl,
  }) => {
    const { routeProbe, runs, comparison } = await mockRunComparisonData(page, appBaseUrl)
    await ensureAuthenticatedPage(page, appBaseUrl)

    await page.goto(routeProbe.historyPath)
    await page.getByRole('button', { name: 'Degraded' }).click()

    const targetRun = runs.find(run => run.status === 'degraded' && run.isAvailable)
    if (!targetRun) {
      throw new Error('Expected an available non-latest run in the history fixture.')
    }

    await page.getByTestId(`run-card-${targetRun.id}`).getByRole('button', { name: 'Compare' }).click()

    await expect(page).toHaveURL(new RegExp(`/workspace/compare\\?runA=${targetRun.id}.*runB=${runs[0]!.id}.*historyFilter=degraded`))
    await expect(page.getByTestId(RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS.dashboard)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS.changedStat)).toContainText(String(comparison.summary.changed))
    await expect(page.getByTestId(RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS.confidenceStat)).toContainText('+1')
    await expect(page.getByTestId(RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS.evidenceStat)).toContainText(String(comparison.summary.newEvidenceCount))
    await expect(page.getByTestId(RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS.profilePanel)).toContainText('Valid job offer')
    await expect(page.getByTestId(RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS.trustPanel)).toContainText('Express Entry Language Requirements')
    await expect(page.getByTestId(RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS.caveatPanel)).toContainText('Program intake windows should be rechecked')
  })

  test.skip('[P0][AC1][AC5] comparison categories isolate newly added and removed pathways without implying unchanged recommendations moved', async ({
    page,
    appBaseUrl,
  }) => {
    const { routeProbe, comparison } = await mockRunComparisonData(page, appBaseUrl)
    await ensureAuthenticatedPage(page, appBaseUrl)

    await page.goto(routeProbe.comparePath(comparison.runs.baseline.id, comparison.runs.current.id))

    await page.getByRole('button', { name: 'New' }).click()
    await expect(page.getByTestId('pathway-change-card-mvp-study-to-work')).toBeVisible()
    await expect(page.getByTestId('pathway-change-card-mvp-provincial-nominee')).toHaveCount(0)

    await page.getByRole('button', { name: 'Removed' }).click()
    await expect(page.getByTestId('pathway-change-card-mvp-provincial-nominee')).toBeVisible()
    await expect(page.getByTestId('pathway-change-card-mvp-study-to-work')).toHaveCount(0)
  })

  test.skip('[P0][AC2] comparison-unavailable state stays actionable with back-links to both run details and history', async ({
    page,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationRunComparisonRouteProbe(appBaseUrl)
    const unavailableComparison = createRecommendationRunComparisonFixture({
      comparisonAvailable: false,
      unavailableReason: 'Comparison data is unavailable for this preserved pair.',
      pathwayChanges: [],
      trustChanges: [],
    })

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.route('**/api/workspace/runs/compare**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(unavailableComparison),
      })
    })

    await page.goto(routeProbe.comparePath(unavailableComparison.runs.baseline.id, unavailableComparison.runs.current.id, 'completed'))

    await expect(page.getByText(/comparison unavailable/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open first run' })).toHaveAttribute(
      'href',
      `/workspace/recommendations/${unavailableComparison.runs.baseline.id}`,
    )
    await expect(page.getByRole('link', { name: 'Open second run' })).toHaveAttribute(
      'href',
      `/workspace/recommendations/${unavailableComparison.runs.current.id}`,
    )
    await expect(page.getByRole('link', { name: 'Return to archive' })).toHaveAttribute('href', '/workspace/history?filter=completed')
  })
})
