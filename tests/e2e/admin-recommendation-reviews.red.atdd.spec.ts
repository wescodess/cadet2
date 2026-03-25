import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import { createAdminAccessResponse } from '../support/fixtures/factories/pathway-inventory-factory'
import {
  createRecommendationReviewCitationFlagInput,
  createRecommendationReviewListResponse,
  createRecommendationReviewRouteProbe,
  createRecommendationReviewRunActionInput,
  createRecommendationReviewRunDetail,
  createRecommendationReviewRunSummary,
  type RecommendationReviewCitation,
  type RecommendationReviewRunSummary,
} from '../support/fixtures/factories/recommendation-review-factory'
import {
  RECOMMENDATION_REVIEW_ATDD_TEST_IDS,
  RECOMMENDATION_REVIEW_FILTER_LABELS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail(label: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-${label}-${seed}@example.com`
}

async function describeAuthFailure(response: APIResponse) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureAuthenticatedPage(page: Page, appBaseUrl: string, label: string) {
  const email = uniqueAuthEmail(label)
  const password = 'PlaywrightPass123!'

  const signUpResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    data: {
      email,
      password,
      name: 'Admin Recommendation Review RED E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signInResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
      data: {
        email,
        password,
        rememberMe: true,
      },
      failOnStatusCode: false,
    })

    if (!signInResponse.ok()) {
      const [signUpFailure, signInFailure] = await Promise.all([
        describeAuthFailure(signUpResponse),
        describeAuthFailure(signInResponse),
      ])

      throw new Error(
        `Could not establish authenticated browser session for Story 5.3 recommendation review red-phase E2E tests. sign-up: ${signUpFailure}; sign-in: ${signInFailure}`,
      )
    }
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Authenticated browser session did not return Better Auth cookies for Story 5.3 recommendation review red-phase E2E tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

async function mockAdminRecommendationReviewUi(
  page: Page,
  appBaseUrl: string,
  input: {
    runs?: RecommendationReviewRunSummary[]
    selectedRunId?: string
  } = {},
) {
  const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)
  const runs = input.runs || createRecommendationReviewListResponse().items
  const selectedRun = runs.find(run => run.runId === input.selectedRunId) || runs[0] || createRecommendationReviewRunSummary()
  const detail = createRecommendationReviewRunDetail(selectedRun)

  let latestRunAction: { type: 'flag' | 'resolve' | 'dismiss', body: unknown } | null = null
  let latestCitationAction: { runId: string, citationId: string, body: unknown } | null = null
  let latestPauseSourceId: string | null = null

  await page.route('**/api/admin/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createAdminAccessResponse()),
    })
  })

  await page.route('**/api/admin/recommendation-reviews', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createRecommendationReviewListResponse(runs)),
    })
  })

  await page.route('**/api/admin/recommendation-reviews/*/citations/*/flag', async (route) => {
    const segments = route.request().url().split('/')
    latestCitationAction = {
      runId: decodeURIComponent(segments.slice(-4)[0] || ''),
      citationId: decodeURIComponent(segments.slice(-2)[0] || ''),
      body: route.request().postDataJSON() as unknown,
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        reviewState: 'flagged',
        citationId: latestCitationAction.citationId,
      }),
    })
  })

  await page.route('**/api/admin/recommendation-reviews/*/flag', async (route) => {
    latestRunAction = {
      type: 'flag',
      body: route.request().postDataJSON() as unknown,
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        reviewState: 'flagged',
      }),
    })
  })

  await page.route('**/api/admin/recommendation-reviews/*/resolve', async (route) => {
    latestRunAction = {
      type: 'resolve',
      body: route.request().postDataJSON() as unknown,
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        reviewState: 'resolved',
      }),
    })
  })

  await page.route('**/api/admin/recommendation-reviews/*/dismiss', async (route) => {
    latestRunAction = {
      type: 'dismiss',
      body: route.request().postDataJSON() as unknown,
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        reviewState: 'dismissed',
      }),
    })
  })

  await page.route('**/api/admin/rag/sources/*/pause', async (route) => {
    const sourceId = decodeURIComponent(route.request().url().split('/').slice(-2)[0] || '')
    latestPauseSourceId = sourceId

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, status: 'paused', sourceId }),
    })
  })

  await page.route('**/api/admin/recommendation-reviews/*/citations', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        items: detail.citations,
        totalCount: detail.citations.length,
      }),
    })
  })

  await page.route('**/api/admin/recommendation-reviews/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(detail),
    })
  })

  return {
    routeProbe,
    detail,
    latestRunAction: () => latestRunAction,
    latestCitationAction: () => latestCitationAction,
    latestPauseSourceId: () => latestPauseSourceId,
  }
}

test.describe('Story 5.3 Admin Recommendation Reviews E2E RED ATDD', () => {
  test.describe.configure({ mode: 'serial' })

  test('[P0][AC1] guest users are redirected to auth when opening the admin recommendation reviews route', async ({
    page,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/auth$/)
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
  })

  test('[P0][AC1] standard authenticated users are redirected away from the admin recommendation reviews route', async ({
    page,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-recommendation-review-standard-user-red')
    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page).not.toHaveURL(/\/admin\/recommendation-reviews$/)

    if (/\/workspace$/.test(page.url())) {
      await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).first()).toBeVisible()
    }
    else {
      await expect(page).toHaveURL(/\/auth/)
    }
  })

  test('[P0][AC1][AC3] admin users see the run queue, trust indicators, and citation integrity inspector tabs', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-recommendation-review-admin-view-red')
    const { routeProbe, detail } = await mockAdminRecommendationReviewUi(page, appBaseUrl)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.page)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.panel)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.runList)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.runItem)).toHaveCount(2)
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.trustScore)).toContainText(/high|medium|low/i)
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.reviewStateBadge)).toContainText(/pending|flagged|resolved|dismissed/i)
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.citationCard)).toHaveCount(detail.citations.length)

    const filterBar = page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.citationFilters)
    await expect(filterBar).toBeVisible()

    for (const label of RECOMMENDATION_REVIEW_FILTER_LABELS) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible()
    }
  })

  test('[P0][AC2][AC3] admin users can flag a run, flag a citation, and pause a related source from the review surface', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-recommendation-review-admin-actions-red')
    const { routeProbe, detail, latestRunAction, latestCitationAction, latestPauseSourceId } = await mockAdminRecommendationReviewUi(page, appBaseUrl)
    const weakCitation = detail.citations.find(citation => citation.supportStrength === 'weak' || citation.supportStrength === 'unsupported') || detail.citations[0]!

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.runFlagButton).click()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.confirmationDialog)).toBeVisible()
    await page.getByRole('button', { name: 'Confirm flag run' }).click()
    expect(latestRunAction()?.type).toBe('flag')
    expect(latestRunAction()?.body).toEqual(createRecommendationReviewRunActionInput())

    await page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.citationFlagButton).first().click()
    await page.getByRole('button', { name: 'Confirm flag citation' }).click()
    expect(latestCitationAction()?.citationId).toBe(weakCitation.citationId)
    expect(latestCitationAction()?.body).toEqual(createRecommendationReviewCitationFlagInput())

    await page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.pauseSourceButton).first().click()
    await page.getByRole('button', { name: 'Pause related source' }).click()
    expect(latestPauseSourceId()).toBe(weakCitation.sourceId)
  })

  test('[P1][AC1][AC2] mobile recommendation reviews collapse into Runs and Citations tabs with a persistent action bar', async ({
    page,
    appBaseUrl,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-recommendation-review-mobile-red')
    const { routeProbe } = await mockAdminRecommendationReviewUi(page, appBaseUrl)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.mobileTabs)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.mobileRunTab)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.mobileCitationTab)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.mobileActionBar)).toBeVisible()
    await expect(page.getByTestId(RECOMMENDATION_REVIEW_ATDD_TEST_IDS.runItem)).toHaveCount(2)
  })
})
