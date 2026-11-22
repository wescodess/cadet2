import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createAdminAccessResponse,
  createPathwayDefinitionCreateInput,
  createPathwayDefinitionRecord,
  createPathwayInventoryListResponse,
  createPathwayInventoryRouteProbe,
  createSeededPathwayDefinitions,
  type PathwayDefinitionRecord,
} from '../support/fixtures/factories/pathway-inventory-factory'
import { PATHWAY_INVENTORY_ATDD_TEST_IDS } from '../support/fixtures/test-data'
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
      name: 'Admin Pathway Inventory E2E Test User',
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
        `Could not establish authenticated browser session for admin pathway inventory tests. sign-up: ${signUpFailure}; sign-in: ${signInFailure}`,
      )
    }
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error(
      'Authenticated browser session did not return Better Auth cookies for admin pathway inventory tests.',
    )
  }

  await page.context().addCookies(storageState.cookies)
  return { email }
}

async function mockAdminPathwayInventoryUi(
  page: Page,
  appBaseUrl: string,
  items: PathwayDefinitionRecord[],
) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  let latestStatusUpdate: { status?: string } | null = null

  await page.route('**/api/admin/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createAdminAccessResponse()),
    })
  })

  await page.route('**/api/admin/pathways**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(createPathwayDefinitionRecord(createPathwayDefinitionCreateInput())),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createPathwayInventoryListResponse(items)),
    })
  })

  await page.route('**/api/admin/pathways/*/status', async (route) => {
    latestStatusUpdate = route.request().postDataJSON() as { status?: string }
    const pathwayId = decodeURIComponent(route.request().url().split('/').slice(-2)[0] || '')
    const updatedItem = items.find((item) => item.pathwayId === pathwayId)
    const status =
      latestStatusUpdate.status === 'inactive' || latestStatusUpdate.status === 'draft'
        ? latestStatusUpdate.status
        : 'active'

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        createPathwayDefinitionRecord({
          ...updatedItem,
          pathwayId,
          status,
        }),
      ),
    })
  })

  return {
    routeProbe,
    latestStatusUpdate: () => latestStatusUpdate,
  }
}

test.describe('Story 5.1 Admin Pathway Inventory E2E ATDD', () => {
  test.describe.configure({ mode: 'serial' })

  test('[P0][AC1] guest users are redirected to auth when opening the admin pathway inventory route', async ({
    page,
    appBaseUrl,
  }) => {
    const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/auth$/)
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
  })

  test(
    '[P0][AC1] standard authenticated users are redirected away from the admin pathway inventory route',
    {
      annotation: [
        {
          type: 'skipNetworkMonitoring',
          description: 'Expected 403 from /api/admin/access for non-admin users.',
        },
      ],
    },
    async ({ page, appBaseUrl }) => {
      const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)

      await ensureAuthenticatedPage(page, appBaseUrl, 'admin-pathway-standard-user')
      await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

      await expect(page).not.toHaveURL(/\/admin\/pathways$/)

      await expect(page).toHaveURL(`${appBaseUrl}/`)
    },
  )

  test('[P0][AC1][AC3] admin users see the seeded pathway inventory table with search, filter, and add controls', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-pathway-admin-view')
    const items = createSeededPathwayDefinitions()
    const { routeProbe } = await mockAdminPathwayInventoryUi(page, appBaseUrl, items)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.page)).toBeVisible()
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.table)).toBeVisible()
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.row)).toHaveCount(items.length)
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.search)).toBeVisible()
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.statusFilter)).toBeVisible()
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.addButton)).toBeVisible()
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.table)).toContainText(
      'Pathway ID',
    )
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.table)).toContainText(
      'Display name',
    )
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.table)).toContainText('Status')
  })

  test('[P0][AC2][AC4] admin users can filter the inventory and confirm a live status change before saving it', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-pathway-admin-edit')
    const items = createSeededPathwayDefinitions()
    const targetItem = items[2]!
    const { routeProbe, latestStatusUpdate } = await mockAdminPathwayInventoryUi(
      page,
      appBaseUrl,
      items,
    )

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.search).fill('study')
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.row)).toHaveCount(1)

    const row = page.getByTestId(`admin-pathway-row-${targetItem.pathwayId}`)
    await expect(row).toContainText(targetItem.displayName)

    await row.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.actionsTrigger).click()
    await page.getByRole('menuitem', { name: 'Disable pathway' }).click()
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.confirmDialog)).toBeVisible()
    await page.getByRole('button', { name: 'Confirm status change' }).click()

    expect(latestStatusUpdate()).toEqual({ status: 'inactive' })
    await expect(row.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.statusBadge)).toContainText(
      'Inactive',
    )
  })

  test('[P1][AC1][AC2] mobile admin pathway inventory collapses into cards while preserving add and status controls', async ({
    page,
    appBaseUrl,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-pathway-admin-mobile')
    const items = createSeededPathwayDefinitions()
    const { routeProbe } = await mockAdminPathwayInventoryUi(page, appBaseUrl, items)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.mobileCard)).toHaveCount(
      items.length,
    )
    await expect(page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.addButton)).toBeVisible()
    await expect(
      page.getByTestId(PATHWAY_INVENTORY_ATDD_TEST_IDS.mobileCard).first(),
    ).toContainText('Skilled Worker pathway')
  })
})
