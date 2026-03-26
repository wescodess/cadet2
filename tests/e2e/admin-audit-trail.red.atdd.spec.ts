import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createAuditTrailEventDetail,
  createAuditTrailEventSummary,
  createAuditTrailListResponse,
  createAuditTrailRouteProbe,
  createAuditTrailSummaryResponse,
  type AuditTrailEventSummary,
} from '../support/fixtures/factories/audit-trail-factory'
import { createAdminAccessResponse } from '../support/fixtures/factories/pathway-inventory-factory'
import {
  AUDIT_TRAIL_ATDD_TEST_IDS,
  AUDIT_TRAIL_FILTER_LABELS,
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
      name: 'Admin Audit Trail RED E2E Test User',
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
        `Could not establish authenticated browser session for Story 5.4 audit trail red-phase E2E tests. sign-up: ${signUpFailure}; sign-in: ${signInFailure}`,
      )
    }
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Authenticated browser session did not return Better Auth cookies for Story 5.4 audit trail red-phase E2E tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

async function mockAdminAuditTrailUi(
  page: Page,
  appBaseUrl: string,
  input: {
    events?: AuditTrailEventSummary[]
    selectedEventId?: string
  } = {},
) {
  const routeProbe = createAuditTrailRouteProbe(appBaseUrl)
  const events = input.events || createAuditTrailListResponse().items
  let latestListQuery = ''
  let selectedEventId = input.selectedEventId || events[0]?.eventId || createAuditTrailEventSummary().eventId

  await page.route('**/api/admin/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createAdminAccessResponse()),
    })
  })

  await page.route(/\/api\/admin\/audit-trail\/summary(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createAuditTrailSummaryResponse()),
    })
  })

  await page.route(/\/api\/admin\/audit-trail\/(?!summary(?:\?|$))[^/?]+(?:\?.*)?$/, async (route) => {
    selectedEventId = decodeURIComponent(route.request().url().split('/').slice(-1)[0] || selectedEventId)
    const event = events.find(item => item.eventId === selectedEventId) || events[0] || createAuditTrailEventSummary()

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createAuditTrailEventDetail(event)),
    })
  })

  await page.route(/\/api\/admin\/audit-trail(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url())
    latestListQuery = url.search

    const actionType = url.searchParams.get('actionType')
    const entityType = url.searchParams.get('entityType')
    const search = url.searchParams.get('search')?.toLowerCase() || ''

    const filteredEvents = events.filter((event) => {
      if (actionType && event.actionType !== actionType) {
        return false
      }

      if (entityType && event.entityType !== entityType) {
        return false
      }

      if (search) {
        const haystack = `${event.entityLabel} ${event.actorEmail} ${event.changeSummary}`.toLowerCase()
        return haystack.includes(search)
      }

      return true
    })

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createAuditTrailListResponse(filteredEvents)),
    })
  })

  return {
    routeProbe,
    latestListQuery: () => latestListQuery,
  }
}

test.describe('Story 5.4 Admin Audit Trail E2E RED ATDD', () => {
  test.describe.configure({ mode: 'serial' })

  test('[P0][AC3] guest users are redirected to auth when opening the admin audit trail route', async ({
    page,
    appBaseUrl,
  }) => {
    const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page).toHaveURL(/\/auth$/)
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible()
  })

  test(
    '[P0][AC3] standard authenticated users are redirected away from the admin audit trail route',
    { annotation: [{ type: 'skipNetworkMonitoring' }] },
    async ({
      page,
      appBaseUrl,
    }) => {
      const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

      await ensureAuthenticatedPage(page, appBaseUrl, 'admin-audit-trail-standard-user-red')
      await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

      await expect(page).not.toHaveURL(/\/admin\/audit-trail$/)

      if (/\/workspace$/.test(page.url())) {
        await expect(page.getByRole('navigation', { name: 'Workspace navigation' }).first()).toBeVisible()
      }
      else {
        await expect(page).toHaveURL(/\/auth/)
      }
    },
  )

  test('[P0][AC1][AC4] admin users see the audit queue, summary stats, and detail inspector with the required panel hook', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-audit-trail-admin-view-red')
    const { routeProbe } = await mockAdminAuditTrailUi(page, appBaseUrl)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.page)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.panel)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.summaryBar)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.filterRibbon)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.eventList)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.detailPanel)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.diffPanel)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Audit trail' })).toBeVisible()
  })

  test('[P1][AC1][AC2] admin users can filter the audit list and inspect the before and after diff context', async ({
    page,
    appBaseUrl,
  }) => {
    const events = [
      createAuditTrailEventSummary({
        actionType: 'PATHWAY_STATUS_CHANGED',
        entityType: 'PATHWAY',
        entityLabel: 'Skilled Worker pathway',
      }),
      createAuditTrailEventSummary({
        actionType: 'EVIDENCE_SOURCE_PAUSED',
        entityType: 'EVIDENCE_SOURCE',
        entityLabel: 'IRCC policy bulletin source',
      }),
    ]

    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-audit-trail-filter-red')
    const { routeProbe, latestListQuery } = await mockAdminAuditTrailUi(page, appBaseUrl, { events })

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('button', { name: AUDIT_TRAIL_FILTER_LABELS[2] })).toBeVisible()
    await page.getByRole('button', { name: AUDIT_TRAIL_FILTER_LABELS[2] }).click()

    await expect.poll(() => latestListQuery()).toContain('entityType=EVIDENCE_SOURCE')

    const eventRows = page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.eventRow)
    await expect(eventRows).toHaveCount(1)
    await eventRows.first().click()

    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.detailPanel)).toContainText('IRCC policy bulletin source')
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.diffPanel)).toContainText(/before|after/i)
  })

  test('[P1][AC4][AC5] mobile audit trail collapses into Events and Details tabs while preserving the summary strip', async ({
    page,
    appBaseUrl,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 })
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-audit-trail-mobile-red')
    const { routeProbe } = await mockAdminAuditTrailUi(page, appBaseUrl)

    await page.goto(routeProbe.adminPath, { waitUntil: 'domcontentloaded' })

    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.mobileTabs)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.mobileEventsTab)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.mobileDetailTab)).toBeVisible()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.summaryBar)).toBeVisible()

    await page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.mobileDetailTab).click()
    await expect(page.getByTestId(AUDIT_TRAIL_ATDD_TEST_IDS.detailPanel)).toBeVisible()
  })
})
