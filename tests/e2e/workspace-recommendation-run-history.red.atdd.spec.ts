import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  type RecommendationRunHistorySummary,
  createRecommendationRunHistoryDetail,
  createRecommendationRunHistoryListFixture,
  createRecommendationRunHistoryRouteProbe,
  createUnavailableRecommendationRunHistoryDetail,
} from '../support/fixtures/factories/recommendation-run-history-factory'
import {
  RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS,
  RECOMMENDATION_RUN_HISTORY_FILTER_LABELS,
  RECOMMENDATION_RUN_HISTORY_STATUS_LABELS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-recommendation-run-history-e2e-red-${seed}@example.com`
}

function runCardTestId(runId: string) {
  return `run-card-${runId}`
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
      name: 'Recommendation Run History E2E Red-Phase Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for recommendation run history red-phase E2E tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for recommendation run history red-phase E2E tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

async function mockRecommendationRunHistoryData(
  page: Page,
  appBaseUrl: string,
  runs: RecommendationRunHistorySummary[],
) {
  const routeProbe = createRecommendationRunHistoryRouteProbe(appBaseUrl)
  const detailByRunId = new Map(
    runs.map((run) => {
      const detail = run.isAvailable
        ? createRecommendationRunHistoryDetail(run)
        : createUnavailableRecommendationRunHistoryDetail(
            run.unavailableReason || 'Archived run is no longer available.',
          )

      return [run.id, detail]
    }),
  )

  await page.route('**/api/workspace/runs**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname !== '/api/workspace/runs') {
      await route.fallback()
      return
    }

    const statusFilter = url.searchParams.get('status')
    const filteredRuns = statusFilter
      ? runs.filter(run => run.status === statusFilter)
      : runs

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runs: filteredRuns,
      }),
    })
  })

  await page.route('**/api/workspace/runs/*', async (route) => {
    const url = new URL(route.request().url())
    const runId = decodeURIComponent(url.pathname.split('/').pop() || '')
    const detail = detailByRunId.get(runId)

    if (!detail || !detail.available) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify(detail || createUnavailableRecommendationRunHistoryDetail()),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    })
  })

  return routeProbe
}

test.describe('Story 4.2 Recommendation Run History E2E RED ATDD', () => {
  test.use({ authSessionEnabled: false })

  test('[P0][AC1] guest is redirected to auth when opening the run archive directly', async ({
    page,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationRunHistoryRouteProbe(appBaseUrl)

    await page.goto(routeProbe.historyPath, { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/auth(?:\/)?(?:\?.*)?$/)
  })

  test('[P0][AC1][AC2][AC3] archive renders newest-first cards with latest emphasis, status badges, and profile snapshot summaries', async ({
    page,
    appBaseUrl,
  }) => {
    const runs = createRecommendationRunHistoryListFixture()
    await ensureAuthenticatedPage(page, appBaseUrl)
    const routeProbe = await mockRecommendationRunHistoryData(page, appBaseUrl, runs)

    await page.goto(routeProbe.historyPath)

    const archive = page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.list)
    await expect(archive).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.totalCount)).toContainText(String(runs.length))

    const latestRun = runs[0]!
    const latestCard = page.getByTestId(runCardTestId(latestRun.id))

    await expect(latestCard).toBeVisible()
    await expect(latestCard.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.latestBadge)).toContainText(
      RECOMMENDATION_RUN_HISTORY_STATUS_LABELS.latest,
    )
    await expect(latestCard.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.statusBadge)).toContainText(
      RECOMMENDATION_RUN_HISTORY_STATUS_LABELS.completed,
    )
    await expect(latestCard).toContainText(latestRun.profileSnapshotSummary)

    const degradedCard = page.getByTestId(runCardTestId(runs[1]!.id))
    await expect(degradedCard.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.statusBadge)).toContainText(
      RECOMMENDATION_RUN_HISTORY_STATUS_LABELS.degraded,
    )
  })

  test('[P0][AC5][AC7] archive filters by status and keeps unavailable runs non-actionable with an explanation', async ({
    page,
    appBaseUrl,
  }) => {
    const runs = createRecommendationRunHistoryListFixture()
    const unavailableRun = runs.find(run => !run.isAvailable)

    await ensureAuthenticatedPage(page, appBaseUrl)
    const routeProbe = await mockRecommendationRunHistoryData(page, appBaseUrl, runs)

    await page.goto(routeProbe.historyPath)

    const filterBar = page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.filterBar)
    await expect(filterBar).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.totalCount)).toContainText(String(runs.length))

    for (const label of RECOMMENDATION_RUN_HISTORY_FILTER_LABELS) {
      await expect(filterBar.getByRole('button', { name: label })).toBeVisible()
    }

    await filterBar.getByRole('button', { name: 'Failed' }).click()
    await expect(page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.totalCount)).toContainText(String(runs.length))

    if (!unavailableRun) {
      throw new Error('Expected an unavailable archived run in the test fixture.')
    }

    const unavailableCard = page.getByTestId(runCardTestId(unavailableRun.id))
    await expect(unavailableCard).toBeVisible()
    await expect(unavailableCard).toContainText(RECOMMENDATION_RUN_HISTORY_STATUS_LABELS.unavailable)
    await expect(unavailableCard.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.unavailableReason)).toContainText(
      unavailableRun.unavailableReason || '',
    )
    await expect(unavailableCard.getByRole('button', { name: 'View Results' })).toHaveCount(0)
  })

  test('[P0][AC4] selecting a preserved run opens its recommendation review route with a back-link to the archive', async ({
    page,
    appBaseUrl,
  }) => {
    const runs = createRecommendationRunHistoryListFixture().filter(run => run.isAvailable)
    const targetRun = runs[1] || runs[0]

    await ensureAuthenticatedPage(page, appBaseUrl)
    const routeProbe = await mockRecommendationRunHistoryData(page, appBaseUrl, runs)

    if (!targetRun) {
      throw new Error('Expected at least one available archived run fixture.')
    }

    await page.goto(routeProbe.historyPath)

    await page.getByTestId(runCardTestId(targetRun.id)).getByRole('button', { name: 'View Results' }).click()

    await expect(page).toHaveURL(new RegExp(`/workspace/recommendations/${targetRun.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
    await expect(page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.backLink)).toHaveAttribute('href', '/workspace/history')
    await expect(page.getByText(targetRun.profileSnapshotSummary)).toBeVisible()
  })

  test('[P1][AC6][AC8] empty and mobile archive states stay actionable without hiding the intake CTA or disclosure controls', async ({
    page,
    appBaseUrl,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await ensureAuthenticatedPage(page, appBaseUrl)
    const routeProbe = await mockRecommendationRunHistoryData(page, appBaseUrl, [])

    await page.goto(routeProbe.historyPath)

    const emptyState = page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.emptyState)
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText(/start your first intake/i)
    await expect(emptyState.getByRole('link', { name: /start your first intake/i })).toHaveAttribute('href', '/workspace/intake')
    await expect(page.getByTestId(RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS.expandToggle)).toHaveCount(0)
  })
})
