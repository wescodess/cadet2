import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createCompletedIntakeDraftPayload,
  createIntakeSubmitRouteProbe,
  createRecommendationRunListFixture,
  createRecommendationRunRecord,
  type RecommendationRunRecord,
} from '../support/fixtures/factories/intake-submit-factory'
import {
  INTAKE_SUBMIT_ATDD_CONFIRMATION_SNIPPETS,
  INTAKE_SUBMIT_ATDD_TEST_IDS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-submit-e2e-${seed}@example.com`
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
      name: 'Intake Submit E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const signUpFailure = await describeAuthFailure(signUpResponse)
    throw new Error(`Could not establish authenticated browser session for intake submit tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for intake submit tests.')
  }

  await page.context().addCookies(storageState.cookies)

  // In local environments, session propagation can lag right after sign-up.
  // Validate access to protected intake route, then retry once with sign-in if needed.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`${appBaseUrl}/workspace/intake`, { waitUntil: 'domcontentloaded' })
    if (/\/workspace\/intake(?:\?.*)?$/.test(page.url())) {
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
      throw new Error(`Sign-in retry failed while establishing intake submit auth session: ${signInFailure}`)
    }

    const refreshedStorageState = await page.request.storageState()
    if (refreshedStorageState.cookies.length > 0) {
      await page.context().addCookies(refreshedStorageState.cookies)
    }
  }

  throw new Error(`Could not open protected intake route after sign-up/sign-in retries. Final URL: ${page.url()}`)
}

async function mockCompletedIntakeDraft(page: Page, appBaseUrl: string) {
  const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
  const completedDraft = createCompletedIntakeDraftPayload()

  await page.route('**/api/intake/draft**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        savedAt: new Date().toISOString(),
        currentSection: 'goals',
        values: completedDraft.fieldValues,
      }),
    })
  })

  return routeProbe
}

async function waitForSubmitResponse(page: Page): Promise<APIResponse> {
  return page.waitForResponse((response) =>
    response.url().includes('/api/intake/submit') && response.request().method() === 'POST',
  )
}

async function waitForIntakeHydration(page: Page) {
  await expect(page.getByText('Restoring your saved draft...')).toBeHidden({ timeout: 20_000 })
}

async function waitForRunListLoad(page: Page) {
  await expect(page.getByText('Loading your recommendation runs...')).toBeHidden({ timeout: 20_000 })
}

async function expectWorkspaceStatusBannerToShowRun(page: Page, runId: string) {
  const statusBanner = page.getByTestId('recommendation-status-banner')
  await expect(statusBanner).toBeVisible()
  await expect(statusBanner).toContainText(runId)
}

async function mockRecommendationStart(page: Page) {
  await page.route('**/api/recommendations/runs/*/start**', async (route) => {
    const url = new URL(route.request().url())
    const segments = url.pathname.split('/').filter(Boolean)
    const runId = segments.length >= 4 ? decodeURIComponent(segments[3] || '') : ''
    const nowIso = new Date().toISOString()

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: runId || 'run_mock_start',
        profileSnapshotId: 'snapshot_mock_start',
        status: 'queued',
        statusMessage: 'Recommendation processing is active and resumable while internal services catch up.',
        resumable: true,
        processingHeartbeatAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
    })
  })
}

function buildLifecycleStatusMessage(status: RecommendationRunRecord['status']) {
  switch (status) {
    case 'queued':
      return 'Recommendation processing is active and resumable while internal services catch up.'
    case 'evaluating':
      return 'Recommendation processing is actively evaluating your profile.'
    case 'completed':
      return 'Recommendation evaluation completed.'
    case 'degraded':
      return 'Recommendation evaluation completed with degraded quality.'
    case 'failed':
      return 'Recommendation evaluation failed and requires retry.'
  }
}

async function mockRecommendationStatusByRunId(
  page: Page,
  getRuns: () => RecommendationRunRecord[],
) {
  await page.route('**/api/recommendations/runs/*/status**', async (route) => {
    const url = new URL(route.request().url())
    const segments = url.pathname.split('/').filter(Boolean)
    const runId = segments.length >= 4 ? decodeURIComponent(segments[3] || '') : ''
    const runs = getRuns()
    const fallbackRun = runs[0]
    const run = runs.find(candidate => candidate.runId === runId) || fallbackRun

    if (!run) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ statusMessage: 'Recommendation run not found' }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: run.runId,
        profileSnapshotId: run.profileSnapshotId,
        status: run.status,
        statusMessage: buildLifecycleStatusMessage(run.status),
        resumable: run.status === 'queued' || run.status === 'evaluating',
        processingHeartbeatAt: run.updatedAt,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
      }),
    })
  })
}

test.describe('Story 1.4 Intake Submit and Recommendation Run Continuity E2E ATDD (RED)', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ authSessionEnabled: false })

  test('[P0][AC1] guest is redirected to auth when opening intake submission route', async ({ page, appBaseUrl }) => {
    const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)

    // Given a guest user without workspace authentication
    // When the guest opens the intake route directly
    await page.goto(routeProbe.intakePath, { waitUntil: 'domcontentloaded' })

    // Then access is redirected to authentication
    await expect(page).toHaveURL(/\/auth(?:\/)?(?:\?.*)?$/)
  })

  test.describe('authenticated standard user', () => {
    test.beforeEach(async ({ page }) => {
      await mockRecommendationStart(page)
    })

    test('[P0][AC1][AC5] completed intake shows a dedicated submit action with stable hooks', async ({ page, appBaseUrl }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const routeProbe = await mockCompletedIntakeDraft(page, appBaseUrl)

      // Given intake draft hydration restores a goals-stage completed profile
      // When the intake page renders
      await page.goto(routeProbe.intakePath)
      await waitForIntakeHydration(page)

      // Then a dedicated submit action is visible for recommendation processing handoff
      await expect(page.getByTestId(INTAKE_SUBMIT_ATDD_TEST_IDS.submitButton)).toBeVisible()
    })

    test('[P0][AC1][AC2][AC5] successful intake submission confirms next state and surfaces run continuity in workspace', async ({ page, appBaseUrl }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const routeProbe = await mockCompletedIntakeDraft(page, appBaseUrl)
      const runHistory: RecommendationRunRecord[] = []
      let submitCount = 0

      await page.route('**/api/intake/submit**', async (route) => {
        submitCount += 1
        const createdAt = new Date(Date.parse('2026-03-04T13:15:00.000Z') + (submitCount * 60_000)).toISOString()
        const createdRun = createRecommendationRunRecord({
          runId: `run_story14_${submitCount}`,
          profileSnapshotId: `snapshot_story14_${submitCount}`,
          status: 'queued',
          createdAt,
          updatedAt: createdAt,
        })
        runHistory.unshift(createdRun)

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createdRun),
        })
      })

      await page.route('**/api/workspace/recommendation-runs**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(runHistory),
        })
      })
      await mockRecommendationStatusByRunId(page, () => runHistory)

      // Given a completed intake with a successful submit API response
      await page.goto(routeProbe.intakePath)
      await waitForIntakeHydration(page)
      const submitResponsePromise = waitForSubmitResponse(page)

      // When the user submits intake for recommendation processing
      await page.getByTestId(INTAKE_SUBMIT_ATDD_TEST_IDS.submitButton).click()

      // Then submit feedback confirms completion and communicates what happens next
      const submitResponse = await submitResponsePromise
      expect(submitResponse.status()).toBe(201)

      const submitFeedback = page.getByTestId(INTAKE_SUBMIT_ATDD_TEST_IDS.submitFeedback)
      await expect(submitFeedback).toBeVisible()
      for (const snippet of INTAKE_SUBMIT_ATDD_CONFIRMATION_SNIPPETS) {
        await expect(submitFeedback).toContainText(new RegExp(snippet, 'i'))
      }

      // And the user is handed off to workspace review with the created run visible
      await expect(page).toHaveURL(/\/workspace\/recommendations(?:\?.*)?$/)
      await waitForRunListLoad(page)
      await expectWorkspaceStatusBannerToShowRun(page, 'run_story14_1')
    })

    test('[P0][AC5] duplicate submission attempts are blocked while submit request is in progress', async ({ page, appBaseUrl }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const routeProbe = await mockCompletedIntakeDraft(page, appBaseUrl)
      let submitRequestCount = 0

      await page.route('**/api/intake/submit**', async (route) => {
        submitRequestCount += 1
        await new Promise(resolve => setTimeout(resolve, 300))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createRecommendationRunRecord({ status: 'queued' })),
        })
      })

      // Given submission takes long enough for accidental double-clicks
      await page.goto(routeProbe.intakePath)
      await waitForIntakeHydration(page)
      const submitResponsePromise = waitForSubmitResponse(page)
      const submitButton = page.getByTestId(INTAKE_SUBMIT_ATDD_TEST_IDS.submitButton)

      // When the user clicks submit twice rapidly
      await submitButton.click()
      await submitButton.click({ force: true })

      // Then only one request is accepted while the button is disabled for the pending request
      await expect(submitButton).toBeDisabled()
      await submitResponsePromise
      expect(submitRequestCount).toBe(1)
    })

    test('[P0][AC2] workspace dashboard shows recommendation continuity surfaces for the signed-in user', async ({ page, appBaseUrl }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const routeProbe = createIntakeSubmitRouteProbe(appBaseUrl)
      const runListFixture = createRecommendationRunListFixture()

      // Given workspace run metadata is available for the signed-in user
      await page.route('**/api/workspace/recommendation-runs**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(runListFixture),
        })
      })
      await mockRecommendationStatusByRunId(page, () => runListFixture)

      // When the user opens workspace home
      await page.goto(routeProbe.workspacePath)
      await waitForRunListLoad(page)

      // Then the continuity dashboard exposes the latest run and aggregate count
      await expect(page.getByTestId('planning-workspace-hub')).toBeVisible()
      await expectWorkspaceStatusBannerToShowRun(page, runListFixture[0]!.runId)
      await expect(page.getByText(`${runListFixture.length} current runs`)).toBeVisible()
    })

    test('[P0][AC2][AC5] repeated submissions create distinct run records in reverse-chronological order', async ({ page, appBaseUrl }) => {
      await ensureAuthenticatedPage(page, appBaseUrl)
      const routeProbe = await mockCompletedIntakeDraft(page, appBaseUrl)
      const runHistory: RecommendationRunRecord[] = []
      let submitCount = 0

      await page.route('**/api/intake/submit**', async (route) => {
        submitCount += 1
        const createdAt = new Date(Date.parse('2026-03-04T13:15:00.000Z') + (submitCount * 60_000)).toISOString()
        const createdRun = createRecommendationRunRecord({
          runId: `run-repeat-${submitCount}`,
          profileSnapshotId: `snapshot-repeat-${submitCount}`,
          status: 'queued',
          createdAt,
          updatedAt: createdAt,
        })
        runHistory.unshift(createdRun)

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createdRun),
        })
      })

      await page.route('**/api/workspace/recommendation-runs**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(runHistory),
        })
      })
      await mockRecommendationStatusByRunId(page, () => runHistory)

      // Given a completed draft is submitted twice
      await page.goto(routeProbe.intakePath)
      await waitForIntakeHydration(page)
      const submitButton = page.getByTestId(INTAKE_SUBMIT_ATDD_TEST_IDS.submitButton)
      const firstSubmit = waitForSubmitResponse(page)
      await submitButton.click()
      expect((await firstSubmit).status()).toBe(201)
      const secondSubmit = waitForSubmitResponse(page)
      await submitButton.click()
      expect((await secondSubmit).status()).toBe(201)

      // When the user revisits workspace after repeated submission
      await page.goto(routeProbe.workspacePath)
      await waitForRunListLoad(page)

      // Then the newest run is active and the dashboard reflects the aggregate continuity count
      await expect(page.getByTestId('planning-workspace-hub')).toBeVisible()
      await expectWorkspaceStatusBannerToShowRun(page, 'run-repeat-2')
      await expect(page.getByText('2 current runs')).toBeVisible()
    })
  })
})
