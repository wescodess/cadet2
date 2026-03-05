import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
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

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: run?.runId || 'run_story21_0',
        profileSnapshotId: run?.profileSnapshotId || 'snapshot_story21_0',
        status: run?.status || 'queued',
        results: {
          direct: [],
          blocked: [],
          composed: [],
        },
        noComposedReason: '',
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
