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
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-e2e-${seed}@example.com`
}

async function ensureAuthenticatedPage(page: import('@playwright/test').Page, appBaseUrl: string) {
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
      name: 'Intake E2E Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    throw new Error('Could not establish authenticated browser session for intake e2e tests')
  }
}

async function waitForIntakeHydration(page: import('@playwright/test').Page) {
  await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton)).toBeEnabled()
}

test.describe('Guided intake draft save and resume', () => {
  test.describe.configure({ mode: 'serial' })

  test('guest is redirected to auth when opening intake route', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await page.goto(probe.intakePath)

    await expect(page).toHaveURL(/\/auth$/)
  })

  test('guided intake sections and progress container are visible', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath)

    await expect(page).toHaveURL(/\/workspace\/intake$/)
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.progress)).toBeVisible()
    for (const section of INTAKE_ATDD_SECTIONS) {
      await expect(page.getByText(new RegExp(section, 'i')).first()).toBeVisible()
    }
  })

  test('save action persists draft and shows immediate confirmation', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createIntakeDraftPayload()
    let sawPostRequest = false

    await page.route('**/api/intake/draft**', async (route) => {
      if (route.request().method() === 'POST') {
        sawPostRequest = true
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: route.request().method() === 'POST' ? 'saved' : 'ok',
          savedAt: new Date().toISOString(),
          currentSection: 'personal',
          values: payload.fieldValues,
        }),
      })
    })

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath)
    await waitForIntakeHydration(page)
    await page.getByLabel('First name').fill(String(payload.fieldValues.personal?.firstName || 'Ada'))
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton).click()
    await expect.poll(() => sawPostRequest).toBe(true)
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveFeedback)).toBeVisible()
  })

  test('returning user resumes at saved section with previous values', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const resumeFixture = createResumeDraftFixture({ currentSection: 'work' })

    await page.route('**/api/intake/draft**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }

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

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath)
    await waitForIntakeHydration(page)

    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.sectionHeading)).toContainText(/work/i)
    await expect(page.getByLabel('First name')).toHaveValue(
      String(resumeFixture.draft.fieldValues.personal?.firstName || ''),
    )
  })

  test('invalid required fields show inline accessible guidance', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath)
    await waitForIntakeHydration(page)
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton).click()

    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.validationSummary)).toBeVisible()
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError)).toBeVisible()
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError).focus()
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError)).toBeFocused()
  })

  test('keyboard navigation works across section controls', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await page.route('**/api/intake/draft**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'saved',
          savedAt: new Date().toISOString(),
          currentSection: 'personal',
          values: {
            personal: {},
          },
        }),
      })
    })

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath)
    await waitForIntakeHydration(page)

    const previousButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.previousButton)
    const nextButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton)
    const saveButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton)

    await previousButton.focus()
    await expect(previousButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(nextButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(saveButton).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveFeedback)).toBeVisible()
  })
})
