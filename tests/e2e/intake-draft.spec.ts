import { test, expect } from '../support/fixtures'
import {
  createIntakeDraftPayload,
  createIntakeRouteProbe,
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

  let storageState = await page.request.storageState()

  if (!signInResponse.ok() || storageState.cookies.length === 0) {
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

    storageState = await page.request.storageState()
  }

  if (storageState.cookies.length > 0) {
    await page.context().addCookies(storageState.cookies)
  }

  await page.goto(`${appBaseUrl}/workspace`, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/\/workspace(?:\/.*)?$/, { timeout: 20_000 })
}

async function waitForIntakeHydration(page: import('@playwright/test').Page) {
  await expect(page.getByText('Restoring your saved draft...')).toBeHidden({ timeout: 20_000 })
  await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton)).toBeEnabled({ timeout: 20_000 })
}

test.describe('Guided intake draft save and resume', () => {
  test.describe.configure({ mode: 'serial' })

  test('guest is redirected to auth when opening intake route', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/auth$/)
  })

  test('guided intake sections and progress container are visible', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/workspace\/intake$/)
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.progress)).toBeVisible()
    for (const section of INTAKE_ATDD_SECTIONS) {
      await expect(page.getByText(new RegExp(section, 'i')).first()).toBeVisible()
    }
  })

  test('save action persists draft and shows immediate confirmation', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createIntakeDraftPayload()

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
    await waitForIntakeHydration(page)
    await page.getByLabel('First name').fill(String(payload.fieldValues.personal?.firstName || 'Ada'))

    // Expect the API call to complete successfully after clicking save
    const saveResponsePromise = page.waitForResponse(response =>
      response.url().includes('/api/intake/draft') && response.request().method() === 'POST'
    )
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton).click()
    const saveResponse = await saveResponsePromise
    const saveResponseBody = await saveResponse.text()

    expect(saveResponse.status(), saveResponseBody).toBe(200)

    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveFeedback)).toBeVisible()
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveFeedback)).toContainText(/Draft saved/)
  })

  test('returning user resumes at saved section with previous values', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    // Use the API to actually set up real state
    await ensureAuthenticatedPage(page, appBaseUrl)

    // We can interact with the app via the UI to avoid manual cookie parsing
    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
    await waitForIntakeHydration(page)

    // Set up the state using page.evaluate to call the endpoint natively from the context!
    // Or we can just use page.request since the auth cookies are attached to the page Context
    const setupResponse = await page.request.post(`${appBaseUrl}/api/intake/draft`, {
      data: {
        currentSection: 'work',
        sectionProgress: {
          personal: true,
          education: true,
          work: false,
          immigration: false,
          goals: false,
        },
        fieldValues: {
          personal: {
            firstName: 'Ada Resume Test',
            lastName: 'Okafor',
            email: 'ada.resume@example.com',
          },
        },
      },
    })

    // Verify our test setup succeeded
    expect(setupResponse.ok()).toBeTruthy()

    // Now reload the app to let it hydrate from the newly saved state
    await page.reload({ waitUntil: 'networkidle' })
    await waitForIntakeHydration(page)

    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.sectionHeading)).toContainText(/work/i)

    // Go back to personal section to check values
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.previousButton).click()
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.previousButton).click()
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.sectionHeading)).toContainText(/personal/i)
    await expect(page.getByLabel('First name')).toHaveValue('Ada Resume Test')
  })

  test('invalid required fields show inline accessible guidance', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
    await waitForIntakeHydration(page)
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton).click()

    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.validationSummary)).toBeVisible()
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError)).toBeVisible()
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError).focus()
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.firstNameError)).toBeFocused()
  })

  test('advancing to education shows education fields instead of personal fields', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
    await waitForIntakeHydration(page)

    await page.getByLabel('First name').fill('Ada')
    await page.getByLabel('Last name').fill('Okafor')
    await page.getByLabel('Email address').fill('ada.transition@example.com')
    await page.getByLabel('Date of birth').fill('1995-06-15')
    await page.getByLabel('Country of citizenship').fill('Nigeria')
    await page.getByLabel('Marital status').selectOption('single')
    await page.getByLabel('Number of dependants').fill('0')

    await page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton).click()

    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.sectionHeading)).toContainText(/education/i)
    await expect(page.getByLabel('Highest completed level')).toBeVisible()
    await expect(page.getByLabel('First name')).toBeHidden()
  })

  test('keyboard navigation works across section controls', async ({ page, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await ensureAuthenticatedPage(page, appBaseUrl)
    await page.goto(probe.intakePath, { waitUntil: 'domcontentloaded' })
    await waitForIntakeHydration(page)

    await page.getByLabel('First name').fill('Ada')
    await page.getByLabel('Last name').fill('Okafor')
    await page.getByLabel('Email address').fill('ada.keyboard@example.com')
    await page.getByLabel('Date of birth').fill('1995-06-15')
    await page.getByLabel('Country of citizenship').fill('Nigeria')
    await page.getByLabel('Marital status').selectOption('single')
    await page.getByLabel('Number of dependants').fill('0')
    await page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton).click()
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.sectionHeading)).toContainText(/education/i)

    const previousButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.previousButton)
    const nextButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.nextButton)
    const saveButton = page.getByTestId(INTAKE_ATDD_TEST_IDS.saveButton)

    await previousButton.focus()
    await expect(previousButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(saveButton).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(nextButton).toBeFocused()

    await saveButton.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByTestId(INTAKE_ATDD_TEST_IDS.saveFeedback)).toBeVisible()
  })
})
