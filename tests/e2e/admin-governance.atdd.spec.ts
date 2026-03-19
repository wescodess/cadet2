import type { APIResponse, Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import { createAdminAccessResponse, createSeededPathwayDefinitions } from '../support/fixtures/factories/pathway-inventory-factory'
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
      name: 'Admin Governance E2E Test User',
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
        `Could not establish authenticated browser session for admin governance E2E tests. sign-up: ${signUpFailure}; sign-in: ${signInFailure}`,
      )
    }
  }

  const storageState = await page.request.storageState()
  if (storageState.cookies.length === 0) {
    throw new Error('Authenticated browser session did not return Better Auth cookies for admin governance E2E tests.')
  }

  await page.context().addCookies(storageState.cookies)
}

async function mockAdminAccess(page: Page) {
  await page.route('**/api/admin/access', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createAdminAccessResponse()),
    })
  })
}

test.describe('Story 5.2 Admin Governance E2E ATDD', () => {
  test.describe.configure({ mode: 'serial' })

  test('[P1][AC1] admin pathway rules surface renders the accordion editor and save controls', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-governance-rules')
    await mockAdminAccess(page)

    const pathways = createSeededPathwayDefinitions()
    const rulesByPathway = {
      'mvp-skilled-worker': [{
        id: 'rule-skilled-1',
        pathwayId: 'mvp-skilled-worker',
        unmetConditionId: 'minimum-english-clb-8',
        fieldPath: 'englishClb',
        operator: '>=',
        comparisonValue: 8,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      'mvp-provincial-nominee': [{
        id: 'rule-pnp-1',
        pathwayId: 'mvp-provincial-nominee',
        unmetConditionId: 'requires-valid-job-offer',
        fieldPath: 'hasValidJobOffer',
        operator: '==',
        comparisonValue: true,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      'mvp-study-to-work': [{
        id: 'rule-study-1',
        pathwayId: 'mvp-study-to-work',
        unmetConditionId: 'requires-study-or-retraining-intent',
        fieldPath: 'willingToStudyOrRetrain',
        operator: '==',
        comparisonValue: true,
        displayOrder: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    } as const

    await page.route('**/api/admin/pathways', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          items: pathways,
          totalCount: pathways.length,
        }),
      })
    })

    await page.route('**/api/admin/pathways/*/rules', async (route) => {
      const pathwayId = decodeURIComponent(route.request().url().split('/').slice(-2)[0] || '')

      if (route.request().method() === 'PUT') {
        const requestBody = route.request().postDataJSON() as { rules: unknown[] }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            items: requestBody.rules,
            totalCount: requestBody.rules.length,
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          items: rulesByPathway[pathwayId as keyof typeof rulesByPathway] || [],
          totalCount: (rulesByPathway[pathwayId as keyof typeof rulesByPathway] || []).length,
        }),
      })
    })

    await page.route('**/api/admin/pathways/*', async (route) => {
      const pathwayId = decodeURIComponent(route.request().url().split('/').slice(-1)[0] || '')
      const pathway = pathways.find(item => item.pathwayId === pathwayId) || pathways[0]!
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pathway),
      })
    })

    await page.goto(`${appBaseUrl}/admin/pathway-rules`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Declarative eligibility editor' })).toBeVisible()
    await expect(page.getByTestId('admin-pathway-rules-accordion')).toHaveCount(pathways.length, { timeout: 15000 })
    await expect(page.getByTestId('admin-rule-save-button')).toHaveCount(pathways.length)

    await page.getByTestId('admin-rule-save-button').first().click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText(/rules were saved through the admin workflow/i)).toBeVisible()

    const ruleRows = page.getByTestId('admin-rule-form-row')
    await expect(ruleRows).toHaveCount(3)
    await page.getByTestId('admin-rule-add-button').first().click()
    await expect(ruleRows).toHaveCount(4)
  })

  test('[P1][AC2] admin evidence sources surface renders the master-detail curation workflow', async ({
    page,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedPage(page, appBaseUrl, 'admin-governance-evidence')
    await mockAdminAccess(page)

    const pathways = createSeededPathwayDefinitions()
    const sources = [{
      id: 'source-ircc',
      createdAt: Date.now(),
      type: 'website',
      status: 'approved',
      lifecycleStatus: 'active',
      freshness: 'fresh',
      name: 'IRCC source',
      description: 'Official source',
      tenantId: 'default',
      tags: ['official'],
      linkedPathwayIds: ['mvp-skilled-worker'],
      trustScore: 92,
      createdByUserId: 'user-1',
      createdByEmail: 'ops@example.com',
      approvedAt: Date.now(),
      rejectedAt: null,
      rejectionReason: null,
      enabled: true,
      schedule: { frequency: 'manual' },
      crawlConfig: {
        seedUrls: ['https://www.canada.ca/en.html'],
        allowedDomains: ['canada.ca'],
        includePatterns: [],
        excludePatterns: [],
        maxDepth: 2,
        maxPagesPerRun: 20,
        renderMode: 'static',
        respectRobots: true,
      },
      lastRunAt: null,
      lastSuccessAt: Date.now(),
      lastFailureAt: null,
      lastFailureReason: null,
      nextRunAt: null,
    }]

    await page.route('**/api/admin/pathways', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          items: pathways,
          totalCount: pathways.length,
        }),
      })
    })

    await page.route('**/api/admin/rag/sources', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            sourceId: 'source-created',
            status: 'pending_approval',
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          currentUserIsAdmin: true,
          items: sources,
        }),
      })
    })

    await page.route('**/api/admin/rag/sources/*', async (route) => {
      const requestMethod = route.request().method()

      if (requestMethod === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            sourceId: 'source-ircc',
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          currentUserIsAdmin: true,
          source: sources[0],
          audit: [],
        }),
      })
    })

    await page.route('**/api/admin/rag/sources/*/pause', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'paused' }),
      })
    })

    await page.route('**/api/admin/rag/ingestion/run', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'completed' }),
      })
    })

    await page.goto(`${appBaseUrl}/admin/evidence-sources`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: 'Master-detail source curation' })).toBeVisible()
    await expect(page.getByTestId('admin-evidence-source-list')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('admin-evidence-source-add-button')).toBeVisible()
    await page.getByText('IRCC source').click()
    await expect(page.getByTestId('admin-evidence-source-detail')).toContainText('IRCC source')
    await expect(page.getByTestId('admin-evidence-source-pause-button')).toBeVisible()
    await page.getByTestId('admin-evidence-source-pause-button').click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText(/paused successfully/i)).toBeVisible()
  })
})
