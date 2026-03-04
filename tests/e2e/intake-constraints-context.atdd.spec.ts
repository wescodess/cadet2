import type { APIResponse, Page } from '@playwright/test'

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

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-constraints-e2e-${seed}@example.com`
}

async function describeAuthFailure(response: APIResponse) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureAuthenticatedPage(page: Page, appBaseUrl: string) {
  const email = uniqueAuthEmail()
  const password = 'PlaywrightPass123!'

  const signInResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
    data: {
      email,
      password,
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (signInResponse.ok()) {
    return
  }

  const signUpResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    data: {
      email,
      password,
      name: 'Intake Constraints E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    const [signInFailure, signUpFailure] = await Promise.all([
      describeAuthFailure(signInResponse),
      describeAuthFailure(signUpResponse),
    ])

    throw new Error(
      `Could not establish authenticated browser session for constraints/context tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function seedGoalsDraft(page: Page, appBaseUrl: string, payload = createGoalsDraftPayload()) {
  const response = await page.request.post(`${appBaseUrl}/api/intake/draft`, {
    data: payload,
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

test.describe('Story 1.3 Constraints and Context E2E ATDD', () => {
  test('[P0][AC3] guest is redirected to auth when opening intake route', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    // Given a guest user without a workspace session
    // When opening the intake route directly
    await page.goto(probe.intakePath)

    // Then access is redirected to auth
    await expect(page).toHaveURL(/\/auth(?:\?.*)?$/)
  })

  test.describe('authenticated standard user', () => {
    test('[P0][AC1][AC4] goals stage shows structured constraints and helper text', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      await ensureAuthenticatedPage(page, appBaseUrl)
      await seedGoalsDraft(page, appBaseUrl)

      // Given an authenticated user re-entering intake on the goals stage
      // When the page hydrates saved goals context
      await page.goto(probe.intakePath)

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
      await seedGoalsDraft(page, appBaseUrl)

      // Given goals constraints can be updated in-place
      await page.goto(probe.intakePath)
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
      await seedGoalsDraft(page, appBaseUrl)

      // Given goals values were edited and saved
      await page.goto(probe.intakePath)
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
      await seedGoalsDraft(page, appBaseUrl)

      // Given a mobile viewport with keyboard-only interaction
      await page.goto(probe.intakePath)

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
