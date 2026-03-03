import { test, expect } from '../support/fixtures'
import {
  createIntakeDraftPayload,
  createIntakeRouteProbe,
  createResumeDraftFixture,
} from '../support/fixtures/factories/intake-draft-factory'
import {
  INTAKE_ATDD_SECTIONS,
  INTAKE_ATDD_TEST_IDS,
} from '../support/fixtures/test-data'
import { getBaseUrl, getTestEnvironment } from '../support/helpers/env'

const authTestUser = {
  environment: getTestEnvironment(),
  baseUrl: getBaseUrl(),
  userIdentifier: `playwright-${getTestEnvironment()}-intake-atdd@example.com`,
  userPassword: 'PlaywrightPass123!',
}

test.describe('Story 1.2 Guided Intake Draft ATDD (RED)', () => {
  test.skip('[P0][AC1] guest is redirected to auth when opening intake route', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    // Given a guest user without an authenticated session
    // When the guest navigates directly to intake
    await page.goto(probe.intakePath)

    // Then the user is redirected to authentication
    await expect(page).toHaveURL(/\/auth$/)
  })

  test.describe('authenticated standard user', () => {
    test.use({
      authSessionEnabled: true,
      authOptions: authTestUser,
    })

    test.skip('[P0][AC1] guided intake sections and progress container are visible', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)

      // Given an authenticated user
      // When the user opens intake
      await page.goto(probe.intakePath)

      // Then guided sections and stable progress hook are rendered
      await expect(page).toHaveURL(/\/workspace\/intake$/)
      await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.progress)).toBeVisible()
      for (const section of INTAKE_ATDD_SECTIONS) {
        await expect(page.getByText(new RegExp(section, 'i')).first()).toBeVisible()
      }
    })

    test.skip('[P0][AC2] save action persists draft and shows immediate confirmation', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const payload = createIntakeDraftPayload()

      // Given a save call is intercepted before navigation (network-first)
      await page.route('**/api/intake/draft', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'saved',
            savedAt: new Date().toISOString(),
            currentSection: payload.currentSection,
            values: payload.fieldValues,
          }),
        })
      })

      const saveResponse = page.waitForResponse((response) =>
        response.url().includes('/api/intake/draft') && response.request().method() === 'POST',
      )

      // When the user saves a valid draft section
      await page.goto(probe.intakePath)
      await page.getByLabel('First name').fill(String(payload.fieldValues.personal?.firstName || 'Ada'))
      await page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton).click()

      // Then save confirmation is immediate and scoped payload is persisted
      const response = await saveResponse
      const body = await response.json() as { currentSection: string, status: string }
      expect(body.status).toBe('saved')
      expect(body.currentSection).toBe(payload.currentSection)
      await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveFeedback)).toBeVisible()
    })

    test.skip('[P0][AC4] returning user resumes at saved section with previous values', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)
      const resumeFixture = createResumeDraftFixture({ currentSection: 'work' })

      // Given an existing draft is available before page load
      await page.route('**/api/intake/draft', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            savedAt: resumeFixture.savedAt,
            currentSection: resumeFixture.draft.currentSection,
            values: resumeFixture.draft.fieldValues,
          }),
        })
      })

      // When the user returns to intake
      await page.goto(probe.intakePath)

      // Then section position and previously entered values are restored
      await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.sectionHeading)).toContainText(/work/i)
      await expect(page.getByLabel('First name')).toHaveValue(
        String(resumeFixture.draft.fieldValues.personal?.firstName || ''),
      )
    })

    test.skip('[P1][AC5] invalid required fields show inline accessible guidance', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)

      // Given an authenticated user on the intake form
      await page.goto(probe.intakePath)

      // When required fields are left empty and validation runs
      await page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton).click()

      // Then inline validation and summary guidance are visible and accessible
      await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.validationSummary)).toBeVisible()
      await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError)).toBeVisible()
      await page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError).focus()
      await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError)).toBeFocused()
    })

    test.skip('[P1][AC5] keyboard navigation works across section controls', async ({ page, appBaseUrl }) => {
      const probe = createIntakeRouteProbe(appBaseUrl)

      // Given an authenticated user using keyboard-only navigation
      await page.goto(probe.intakePath)

      // When focus moves through section controls
      const previousButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.previousButton)
      const nextButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton)
      const saveButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton)

      await previousButton.focus()
      await expect(previousButton).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(nextButton).toBeFocused()

      await page.keyboard.press('Tab')
      await expect(saveButton).toBeFocused()

      // Then control activation remains keyboard operable
      await page.keyboard.press('Enter')
      await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveFeedback)).toBeVisible()
    })
  })
})
