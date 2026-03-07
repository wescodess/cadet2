import type { Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createGoalsDraftPayload,
  createGoalsUpdateFixture,
  createIntakeRouteProbe,
} from '../support/fixtures/factories/intake-draft-factory'
import {
  INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS,
  INTAKE_CONSTRAINTS_ATDD_HELPER_TEXT_SNIPPETS,
  INTAKE_CONSTRAINTS_ATDD_TEST_IDS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type DraftValues = Record<string, Record<string, unknown>>
type AuthCredentials = {
  email: string
  password: string
}

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-constraints-e2e-${seed}@example.com`
}

async function ensureAuthenticatedPage(
  page: Page,
  appBaseUrl: string,
): Promise<AuthCredentials> {
  const credentials = {
    email: uniqueAuthEmail(),
    password: 'PlaywrightPass123!',
  }

  const signUpResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    data: {
      email: credentials.email,
      password: credentials.password,
      name: 'Intake Constraints E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const text = (await signUpResponse.text()).trim().replace(/\s+/g, ' ')
    const signUpFailure = text
      ? `HTTP ${signUpResponse.status()}: ${text.slice(0, 240)}`
      : `HTTP ${signUpResponse.status()}`
    throw new Error(`Could not establish authenticated browser session for constraints/context tests. sign-up: ${signUpFailure}`)
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for constraints/context tests.')
  }

  await page.context().addCookies(storageState.cookies)

  // In local environments, session propagation can lag right after sign-up.
  // Validate access to protected intake route, then retry once with sign-in if needed.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto(`${appBaseUrl}/workspace/intake`, { waitUntil: 'domcontentloaded' })
    if (/\/workspace\/intake(?:\?.*)?$/.test(page.url())) {
      return credentials
    }

    const signInResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
      data: {
        email: credentials.email,
        password: credentials.password,
        rememberMe: true,
      },
      failOnStatusCode: false,
    })

    if (!signInResponse.ok()) {
      const signInText = (await signInResponse.text()).trim().replace(/\s+/g, ' ')
      const signInFailure = signInText
        ? `HTTP ${signInResponse.status()}: ${signInText.slice(0, 240)}`
        : `HTTP ${signInResponse.status()}`
      throw new Error(`Sign-in retry failed while establishing constraints/context auth session: ${signInFailure}`)
    }

    const refreshedStorageState = await page.request.storageState()
    if (refreshedStorageState.cookies.length > 0) {
      await page.context().addCookies(refreshedStorageState.cookies)
    }
  }

  return credentials
}

async function seedGoalsDraft(page: Page, appBaseUrl: string, payload = createGoalsDraftPayload()) {
  const response = await page.request.post(`${appBaseUrl}/api/intake/draft`, {
    data: payload,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function waitForIntakeHydration(page: Page) {
  await expect(page).toHaveURL(/\/workspace\/intake(?:\?.*)?$/, { timeout: 20_000 })
  await expect(page.getByText('Restoring your saved draft...')).toBeHidden({ timeout: 20_000 })
  const authHeading = page.getByRole('heading', { name: /create account|sign in/i })
  const authHeadingVisible = (await authHeading.count()) > 0 && await authHeading.first().isVisible().catch(() => false)
  if (authHeadingVisible) {
    const cookies = await page.context().cookies()
    const cookieSummary = cookies.map(cookie => `${cookie.name}@${cookie.domain}`).join(', ')
    throw new Error(`Auth view rendered while waiting for intake hydration at URL ${page.url()}. Cookies: ${cookieSummary}`)
  }
  await expect(page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.sectionHeading)).toBeVisible({ timeout: 20_000 })
}

test.describe('Story 1.3 Constraints and Context E2E ATDD', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ authSessionEnabled: false })

  test('[P0][AC3] guest is redirected to auth when opening intake route', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    // Given a guest user without a workspace session
    // When opening the intake route directly
    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })

    // Then access is redirected to auth
    await expect(page).toHaveURL(/\/auth(?:\/)?(?:\?.*)?$/)
  })

  test.describe('authenticated standard user', () => {
    test('[P0][AC1][AC4] goals stage shows structured constraints and helper text', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      await ensureAuthenticatedPage(page, appBaseUrl)
      await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)
      await seedGoalsDraft(page, appBaseUrl)

      // Given an authenticated user re-entering intake on the goals stage
      // When the page hydrates saved goals context
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)

      // Then structured constraints and narrative context controls are visible with guidance
      await expect(page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.sectionHeading)).toContainText(/planning goals/i)
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.targetTimelineMonths)).toBeVisible()
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.budgetCad)).toBeVisible()
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.priorityPreference)).toBeVisible()
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.locationPreference)).toBeVisible()
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.willingToStudyOrRetrain)).toBeVisible()
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.additionalContext)).toBeVisible()

      for (const helperSnippet of INTAKE_CONSTRAINTS_ATDD_HELPER_TEXT_SNIPPETS) {
        await expect(page.getByText(helperSnippet, { exact: false })).toBeVisible()
      }
    })

    test('[P0][AC1][AC2] user can save edited constraints and free-form context with immediate feedback', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const goalsUpdate = createGoalsUpdateFixture().updated
      await ensureAuthenticatedPage(page, appBaseUrl)
      await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)
      await seedGoalsDraft(page, appBaseUrl)

      // Given goals constraints can be updated in-place
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.targetTimelineMonths).fill(
        String(goalsUpdate.targetTimelineMonths),
      )
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.budgetCad).fill(String(goalsUpdate.budgetCad))
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.priorityPreference).selectOption(
        goalsUpdate.priorityPreference,
      )
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.locationPreference).selectOption(
        goalsUpdate.locationPreference,
      )
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.willingToStudyOrRetrain).selectOption(
        goalsUpdate.willingToStudyOrRetrain,
      )
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.additionalContext).fill(goalsUpdate.additionalContext)

      const saveResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/intake/draft') && response.request().method() === 'POST',
      )

      // When the user saves updated goals values
      await page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.saveButton).click()

      // Then API response and in-page confirmation reflect saved updates
      const saveResponse = await saveResponsePromise
      const saveBody = await saveResponse.json() as {
        currentSection: string
        values: DraftValues
      }
      expect(saveResponse.status()).toBe(200)
      expect(saveBody.currentSection).toBe('goals')
      expect(saveBody.values.goals?.locationPreference).toBe(goalsUpdate.locationPreference)
      expect(saveBody.values.goals?.additionalContext).toBe(goalsUpdate.additionalContext)
      await expect(page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.saveFeedback)).toBeVisible()
      await expect(page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.saveFeedback)).toContainText(/draft saved/i)
    })

    test('[P0][AC2] returning user sees edited goals values after reload', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const goalsUpdate = createGoalsUpdateFixture().updated
      await ensureAuthenticatedPage(page, appBaseUrl)
      await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)
      await seedGoalsDraft(page, appBaseUrl)

      // Given goals values were edited and saved
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.targetTimelineMonths).fill(
        String(goalsUpdate.targetTimelineMonths),
      )
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.budgetCad).fill(String(goalsUpdate.budgetCad))
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.priorityPreference).selectOption(
        goalsUpdate.priorityPreference,
      )
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.locationPreference).selectOption(
        goalsUpdate.locationPreference,
      )
      await page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.additionalContext).fill(goalsUpdate.additionalContext)
      const saveResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/intake/draft') && response.request().method() === 'POST',
      )
      await page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.saveButton).click()
      const saveResponse = await saveResponsePromise
      expect(saveResponse.status()).toBe(200)

      // When the user revisits the intake page
      await page.reload()
      await waitForIntakeHydration(page)

      // Then the updated constraints/context hydrate without restarting previous sections
      await expect(page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.sectionHeading)).toContainText(/planning goals/i)
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.targetTimelineMonths)).toHaveValue(
        String(goalsUpdate.targetTimelineMonths),
      )
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.budgetCad)).toHaveValue(
        String(goalsUpdate.budgetCad),
      )
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.priorityPreference)).toHaveValue(
        goalsUpdate.priorityPreference,
      )
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.locationPreference)).toHaveValue(
        goalsUpdate.locationPreference,
      )
      await expect(page.getByLabel(INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS.additionalContext)).toHaveValue(
        goalsUpdate.additionalContext,
      )
    })

    test('[P1][AC4] mobile controls stay readable and keyboard-operable on goals stage', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      await page.setViewportSize({ width: 390, height: 844 })
      await ensureAuthenticatedPage(page, appBaseUrl)
      await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)
      await seedGoalsDraft(page, appBaseUrl)

      // Given a mobile viewport with keyboard-only interaction
      await page.reload({ waitUntil: 'domcontentloaded' })
      await waitForIntakeHydration(page)

      // Then required mobile controls are visible and large enough for touch accessibility
      const previousButton = page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.previousMobileButton)
      const saveButton = page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.saveMobileButton)
      const nextButton = page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.nextMobileButton)

      await expect(previousButton).toBeVisible()
      await expect(saveButton).toBeVisible()
      await expect(nextButton).toBeVisible()

      for (const button of [previousButton, saveButton, nextButton]) {
        const box = await button.boundingBox()
        expect(box?.height || 0).toBeGreaterThanOrEqual(44)
      }

      // And keyboard activation still works for save action
      const saveResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/intake/draft') && response.request().method() === 'POST',
      )
      await saveButton.focus()
      await expect(saveButton).toBeFocused()
      await page.keyboard.press('Enter')
      const saveResponse = await saveResponsePromise
      expect(saveResponse.status()).toBe(200)
      await expect(page.getByTestId(INTAKE_CONSTRAINTS_ATDD_TEST_IDS.saveFeedback)).toContainText(/draft saved/i)

      await expect(
        page.getByText(INTAKE_CONSTRAINTS_ATDD_HELPER_TEXT_SNIPPETS[INTAKE_CONSTRAINTS_ATDD_HELPER_TEXT_SNIPPETS.length - 1], {
          exact: false,
        }),
      ).toBeVisible()
    })
  })
})
