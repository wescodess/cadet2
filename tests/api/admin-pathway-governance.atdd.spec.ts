import { readFileSync } from 'node:fs'
import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import { getTestEnvironment } from '../support/helpers/env'

function loadRepoEnvFromFile() {
  try {
    const content = readFileSync('.env', 'utf8')

    for (const rawLine of content.split(/\r?\n/g)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) {
        continue
      }

      const separatorIndex = line.indexOf('=')
      if (separatorIndex <= 0) {
        continue
      }

      const key = line.slice(0, separatorIndex).trim()
      const rawValue = line.slice(separatorIndex + 1).trim()
      const normalizedValue = rawValue.replace(/^['"]|['"]$/g, '')

      if (!process.env[key]) {
        process.env[key] = normalizedValue
      }
    }
  }
  catch {
    // Local env is optional for CI environments.
  }
}

loadRepoEnvFromFile()

type PathwayRuleRecord = {
  id: string
  pathwayId: string
  unmetConditionId: string
  fieldPath: string
  operator: string
  comparisonValue: string | number | boolean
}

function uniqueAuthEmail(label: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-${label}-${seed}@example.com`
}

function uniqueId(prefix: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${prefix}-${seed}`
}

function resolveAdminAllowlistEmail() {
  const configured = process.env.TEST_ADMIN_EMAIL
    || process.env.NUXT_RAG_ADMIN_EMAILS
      ?.split(/[\n,]/g)
      .map(value => value.trim())
      .find(Boolean)

  return configured || 'ops-admin@example.com'
}

async function describeAuthFailure(response: Awaited<ReturnType<APIRequestContext['post']>>) {
  const text = (await response.text()).trim().replace(/\s+/g, ' ')
  return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureSession(
  request: APIRequestContext,
  appBaseUrl: string,
  input: { email: string, name: string },
) {
  const password = 'PlaywrightPass123!'

  const signInResponse = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email: input.email,
      password,
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (signInResponse.ok()) {
    return
  }

  const signUpResponse = await request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    headers: {
      origin: appBaseUrl,
    },
    data: {
      email: input.email,
      password,
      name: input.name,
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
      `Could not establish authenticated session for admin governance API tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function ensureNonAdminRequest(request: APIRequestContext, appBaseUrl: string, label: string) {
  await ensureSession(request, appBaseUrl, {
    email: uniqueAuthEmail(label),
    name: 'Non Admin Governance User',
  })
}

async function ensureAdminRequest(request: APIRequestContext, appBaseUrl: string) {
  await ensureSession(request, appBaseUrl, {
    email: resolveAdminAllowlistEmail(),
    name: 'Admin Governance Ops User',
  })

  const syncResponse = await request.post(`${appBaseUrl}/api/admin/rag/convex-admin/sync-current-user`, {
    failOnStatusCode: false,
  })

  if (!syncResponse.ok()) {
    const failure = (await syncResponse.text()).trim().replace(/\s+/g, ' ')
    throw new Error(
      `Admin bootstrap sync failed for governance API tests. Configure TEST_ADMIN_EMAIL or NUXT_RAG_ADMIN_EMAILS with an allowlisted address. ${failure}`,
    )
  }
}

test.describe('Story 5.2 Admin Governance API ATDD', () => {
  test('[P0] pathway-rule endpoints reject unauthenticated and non-admin callers', async ({
    request,
    appBaseUrl,
  }) => {
    const rulesPath = `${appBaseUrl}/api/admin/pathways/mvp-skilled-worker/rules`

    const unauthenticatedResponse = await request.get(rulesPath, { failOnStatusCode: false })
    expect(unauthenticatedResponse.status()).toBe(401)

    await ensureNonAdminRequest(request, appBaseUrl, 'governance-non-admin')
    const nonAdminResponse = await request.get(rulesPath, { failOnStatusCode: false })
    expect(nonAdminResponse.status()).toBe(403)
  })

  test('[P0][AC1] admin can read and replace persisted pathway rules through the controlled rules endpoint', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAdminRequest(request, appBaseUrl)

    const rulesPath = `${appBaseUrl}/api/admin/pathways/mvp-skilled-worker/rules`
    const listResponse = await request.get(rulesPath, { failOnStatusCode: false })
    expect(listResponse.status()).toBe(200)

    const body = await listResponse.json() as {
      ok: boolean
      items: PathwayRuleRecord[]
    }

    expect(body.items.length).toBeGreaterThan(0)
    const originalRules = body.items.map(rule => ({
      id: rule.id,
      unmetConditionId: rule.unmetConditionId,
      fieldPath: rule.fieldPath,
      operator: rule.operator,
      comparisonValue: rule.comparisonValue,
    }))

    try {
      const createResponse = await request.post(rulesPath, {
        data: {
          unmetConditionId: uniqueId('minimum-english-clb-9'),
          fieldPath: 'englishClb',
          operator: '>=',
          comparisonValue: 9,
        },
        failOnStatusCode: false,
      })

      expect(createResponse.status()).toBe(200)
      const createdBody = await createResponse.json() as {
        item: PathwayRuleRecord
      }

      expect(createdBody.item.unmetConditionId).toContain('minimum-english-clb-9')

      const patchResponse = await request.patch(`${rulesPath}/${createdBody.item.id}`, {
        data: {
          unmetConditionId: createdBody.item.unmetConditionId,
          fieldPath: createdBody.item.fieldPath,
          operator: createdBody.item.operator,
          comparisonValue: 10,
        },
        failOnStatusCode: false,
      })

      expect(patchResponse.status()).toBe(200)
      const patchedBody = await patchResponse.json() as {
        item: PathwayRuleRecord
      }
      expect(patchedBody.item.comparisonValue).toBe(10)

      const deleteResponse = await request.delete(`${rulesPath}/${createdBody.item.id}`, {
        failOnStatusCode: false,
      })

      expect(deleteResponse.status()).toBe(200)

      const updatedRules = originalRules.map(rule => rule.unmetConditionId === 'minimum-english-clb-8'
        ? { ...rule, comparisonValue: 7 }
        : rule)

      const replaceResponse = await request.put(rulesPath, {
        data: {
          rules: updatedRules,
        },
        failOnStatusCode: false,
      })

      expect(replaceResponse.status()).toBe(200)
      const replacedBody = await replaceResponse.json() as {
        items: PathwayRuleRecord[]
      }
      const clbRule = replacedBody.items.find(rule => rule.unmetConditionId === 'minimum-english-clb-8')
      expect(clbRule?.comparisonValue).toBe(7)
    }
    finally {
      await request.put(rulesPath, {
        data: {
          rules: originalRules,
        },
        failOnStatusCode: false,
      })
    }
  })

  test('[P0][AC2][AC3] admin can create, edit, pause, resume, and remove a curated evidence source', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAdminRequest(request, appBaseUrl)

    const createResponse = await request.post(`${appBaseUrl}/api/admin/rag/sources`, {
      data: {
        type: 'website',
        name: uniqueId('IRCC governance source'),
        description: 'ATDD governance source for Story 5.2.',
        trustScore: 82,
        linkedPathwayIds: ['mvp-skilled-worker'],
        tenantId: 'default',
        tags: ['atdd', 'governance'],
        schedule: {
          frequency: 'manual',
        },
        websiteConfig: {
          seedUrls: ['https://www.canada.ca/en/immigration-refugees-citizenship.html'],
          allowedDomains: ['canada.ca'],
          includePatterns: ['**/immigration-refugees-citizenship/**'],
          excludePatterns: [],
          maxDepth: 2,
          maxPagesPerRun: 20,
          renderMode: 'static',
          respectRobots: true,
        },
        enabled: true,
      },
      failOnStatusCode: false,
    })

    expect(createResponse.status()).toBe(200)
    const created = await createResponse.json() as {
      sourceId: string
    }

    const detailPath = `${appBaseUrl}/api/admin/rag/sources/${created.sourceId}`

    const updateResponse = await request.patch(detailPath, {
      data: {
        name: uniqueId('Updated governance source'),
        description: 'Updated governance source details.',
        trustScore: 90,
        tenantId: 'default',
        linkedPathwayIds: ['mvp-skilled-worker', 'mvp-provincial-nominee'],
        tags: ['atdd', 'updated'],
        schedule: {
          frequency: 'manual',
        },
        websiteConfig: {
          seedUrls: ['https://www.canada.ca/en/services/immigration-citizenship.html'],
          allowedDomains: ['canada.ca'],
          includePatterns: ['**/immigration-citizenship/**'],
          excludePatterns: [],
          maxDepth: 2,
          maxPagesPerRun: 25,
          renderMode: 'static',
          respectRobots: true,
        },
        enabled: true,
      },
      failOnStatusCode: false,
    })

    expect(updateResponse.status()).toBe(200)

    const pauseResponse = await request.post(`${detailPath}/pause`, {
      failOnStatusCode: false,
    })
    expect(pauseResponse.status()).toBe(200)

    const resumeResponse = await request.post(`${detailPath}/resume`, {
      failOnStatusCode: false,
    })
    expect(resumeResponse.status()).toBe(200)

    const deleteResponse = await request.delete(detailPath, {
      failOnStatusCode: false,
    })
    expect(deleteResponse.status()).toBe(200)

    const fetchDeletedResponse = await request.get(detailPath, {
      failOnStatusCode: false,
    })
    expect(fetchDeletedResponse.status()).toBe(404)
  })
})
