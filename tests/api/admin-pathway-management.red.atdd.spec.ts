import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createPathwayDefinitionCreateInput,
  createPathwayDefinitionUpdateInput,
  createPathwayInventoryEvaluationPayload,
  createPathwayInventoryRouteProbe,
  createPathwayStatusUpdateInput,
  PATHWAY_INVENTORY_EXPECTED_MINIMUM_FIELDS,
  type PathwayDefinitionRecord,
  type PathwayDefinitionStatus,
} from '../support/fixtures/factories/pathway-inventory-factory'
import {
  PATHWAY_INVENTORY_STATUS_VALUES,
  RECOMMENDATION_PATHWAY_SUPPORTED_IDS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

type RecommendationPathwayResponse = {
  runId: string
  profileSnapshotId: string
  direct: Array<{
    pathwayId: string
    status: 'direct'
  }>
  blocked: Array<{
    pathwayId: string
    status: 'blocked'
    unmetConditions: string[]
  }>
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
    return { email: input.email, password }
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
      `Could not establish authenticated session for Story 5.1 API red-phase tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }

  return { email: input.email, password }
}

async function ensureAuthenticatedRequest(request: APIRequestContext, appBaseUrl: string) {
  return await ensureSession(request, appBaseUrl, {
    email: uniqueAuthEmail('admin-pathway-standard-user-red'),
    name: 'Admin Pathway Inventory Standard User RED',
  })
}

async function ensureAdminRequest(request: APIRequestContext, appBaseUrl: string) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  await ensureSession(request, appBaseUrl, {
    email: resolveAdminAllowlistEmail(),
    name: 'Admin Pathway Inventory Ops User RED',
  })

  const syncResponse = await request.post(routeProbe.adminSyncPath, {
    failOnStatusCode: false,
  })

  if (!syncResponse.ok()) {
    const failure = (await syncResponse.text()).trim().replace(/\s+/g, ' ')
    throw new Error(
      `Admin bootstrap sync failed for Story 5.1 API red-phase tests. Configure TEST_ADMIN_EMAIL or NUXT_RAG_ADMIN_EMAILS with an allowlisted address. ${failure}`,
    )
  }

  const accessResponse = await request.get(routeProbe.adminAccessPath, {
    failOnStatusCode: false,
  })

  expect(accessResponse.status()).toBe(200)
}

async function listPathwayDefinitions(request: APIRequestContext, appBaseUrl: string, status?: PathwayDefinitionStatus) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  const response = await request.get(routeProbe.listPath, {
    params: status ? { status } : undefined,
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as {
      ok: boolean
      items: PathwayDefinitionRecord[]
      totalCount: number
    },
  }
}

async function createPathwayDefinition(request: APIRequestContext, appBaseUrl: string, payload: ReturnType<typeof createPathwayDefinitionCreateInput>) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  const response = await request.post(routeProbe.listPath, {
    data: payload,
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as PathwayDefinitionRecord,
  }
}

async function updatePathwayDefinition(
  request: APIRequestContext,
  appBaseUrl: string,
  pathwayId: string,
  payload: ReturnType<typeof createPathwayDefinitionUpdateInput>,
) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  const response = await request.patch(routeProbe.detailPath(pathwayId), {
    data: payload,
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as PathwayDefinitionRecord,
  }
}

async function updatePathwayStatus(
  request: APIRequestContext,
  appBaseUrl: string,
  pathwayId: string,
  status: PathwayDefinitionStatus,
) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  const response = await request.patch(routeProbe.statusPath(pathwayId), {
    data: createPathwayStatusUpdateInput(status),
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as PathwayDefinitionRecord,
  }
}

async function resetRecommendationRuns(request: APIRequestContext, appBaseUrl: string) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/reset`, {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function seedRecommendationRun(
  request: APIRequestContext,
  appBaseUrl: string,
  input: {
    runId: string
    profileSnapshotId: string
    submittedPayload: unknown
  },
) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: {
      runId: input.runId,
      profileSnapshotId: input.profileSnapshotId,
      status: 'queued',
      resetExisting: true,
      submittedPayload: input.submittedPayload,
    },
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
  return await response.json() as { runId: string, profileSnapshotId: string, status: string }
}

async function startRecommendationRun(request: APIRequestContext, appBaseUrl: string, runId: string) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  const response = await request.post(routeProbe.recommendationRunStartPath(runId), {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function readPathwaysForRun(request: APIRequestContext, appBaseUrl: string, runId: string) {
  const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)
  const response = await request.get(routeProbe.recommendationRunPathwaysPath(runId), {
    failOnStatusCode: false,
  })

  return {
    response,
    body: await response.json() as RecommendationPathwayResponse,
  }
}

function outcomeIds(body: RecommendationPathwayResponse) {
  return [...body.direct, ...body.blocked].map(pathway => pathway.pathwayId)
}

test.describe('Story 5.1 Admin Pathway Inventory API RED ATDD', () => {
  test.describe.configure({ mode: 'serial' })

  test.skip('[P0][AC1] unauthenticated callers cannot read the admin pathway inventory', async ({ request, appBaseUrl }) => {
    const routeProbe = createPathwayInventoryRouteProbe(appBaseUrl)

    const response = await request.get(routeProbe.listPath, {
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(401)
  })

  test.skip('[P0][AC1] standard authenticated users are denied the admin pathway inventory endpoints', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAuthenticatedRequest(request, appBaseUrl)

    const { response } = await listPathwayDefinitions(request, appBaseUrl)
    expect(response.status()).toBe(403)
  })

  test.skip('[P0][AC1][AC3] synced admin users can list the seeded MVP pathways and only receive the minimum governance fields', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAdminRequest(request, appBaseUrl)

    const { response, body } = await listPathwayDefinitions(request, appBaseUrl)

    expect(response.status()).toBe(200)
    expect(body.items).toHaveLength(RECOMMENDATION_PATHWAY_SUPPORTED_IDS.length)
    expect(body.items.map(item => item.pathwayId)).toEqual([...RECOMMENDATION_PATHWAY_SUPPORTED_IDS])

    for (const item of body.items) {
      expect(Object.keys(item).sort()).toEqual([...PATHWAY_INVENTORY_EXPECTED_MINIMUM_FIELDS].sort())
      expect(PATHWAY_INVENTORY_STATUS_VALUES).toContain(item.status)
      expect(item.displayName.trim().length).toBeGreaterThan(0)
      expect(item.createdAt.trim().length).toBeGreaterThan(0)
      expect(item.updatedAt.trim().length).toBeGreaterThan(0)
      expect(item).not.toHaveProperty('rules')
      expect(item).not.toHaveProperty('citations')
      expect(item).not.toHaveProperty('auditLog')
    }
  })

  test.skip('[P0][AC2][AC3] admin create, update, and status-change routes stay scoped to minimum inventory fields', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAdminRequest(request, appBaseUrl)

    const createInput = createPathwayDefinitionCreateInput({
      pathwayId: uniqueId('mvp-admin-managed-red'),
      displayName: 'Atlantic employer pathway',
      description: 'Employer-driven pathway entering MVP scope under admin control.',
      status: 'draft',
    })

    const created = await createPathwayDefinition(request, appBaseUrl, createInput)
    expect(created.response.status()).toBe(201)
    expect(created.body).toMatchObject(createInput)
    expect(Object.keys(created.body).sort()).toEqual([...PATHWAY_INVENTORY_EXPECTED_MINIMUM_FIELDS].sort())

    const updateInput = createPathwayDefinitionUpdateInput({
      displayName: 'Atlantic employer pathway (pilot)',
      description: 'Updated description for pilot rollout.',
    })
    const updated = await updatePathwayDefinition(request, appBaseUrl, createInput.pathwayId, updateInput)

    expect(updated.response.status()).toBe(200)
    expect(updated.body.displayName).toBe(updateInput.displayName)
    expect(updated.body.description).toBe(updateInput.description)
    expect(updated.body).not.toHaveProperty('rules')
    expect(updated.body).not.toHaveProperty('evidenceSources')

    const inactive = await updatePathwayStatus(request, appBaseUrl, createInput.pathwayId, 'inactive')
    expect(inactive.response.status()).toBe(200)
    expect(inactive.body.status).toBe('inactive')

    const activeItems = await listPathwayDefinitions(request, appBaseUrl, 'active')
    expect(activeItems.response.status()).toBe(200)
    expect(activeItems.body.items.every(item => item.status === 'active')).toBe(true)
  })

  test.skip('[P0][AC2][AC4] disabling a supported pathway only changes the targeted inventory entry and excludes it from future recommendation outputs', async ({
    request,
    appBaseUrl,
  }) => {
    await ensureAdminRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)

    const targetPathwayId = RECOMMENDATION_PATHWAY_SUPPORTED_IDS[1]

    const before = await listPathwayDefinitions(request, appBaseUrl)
    expect(before.response.status()).toBe(200)
    const initiallyActiveIds = before.body.items
      .filter(item => item.status === 'active')
      .map(item => item.pathwayId)

    expect(initiallyActiveIds).toContain(targetPathwayId)

    const statusUpdate = await updatePathwayStatus(request, appBaseUrl, targetPathwayId, 'inactive')
    expect(statusUpdate.response.status()).toBe(200)
    expect(statusUpdate.body.pathwayId).toBe(targetPathwayId)
    expect(statusUpdate.body.status).toBe('inactive')

    const after = await listPathwayDefinitions(request, appBaseUrl)
    expect(after.response.status()).toBe(200)

    const activeIds = after.body.items
      .filter(item => item.status === 'active')
      .map(item => item.pathwayId)

    expect(activeIds).not.toContain(targetPathwayId)
    expect(
      initiallyActiveIds
        .filter(pathwayId => pathwayId !== targetPathwayId)
        .every(pathwayId => activeIds.includes(pathwayId)),
    ).toBe(true)

    await ensureAuthenticatedRequest(request, appBaseUrl)
    const seededRun = await seedRecommendationRun(request, appBaseUrl, {
      runId: uniqueId('run-story51-inventory-scope-red'),
      profileSnapshotId: uniqueId('snapshot-story51-inventory-scope-red'),
      submittedPayload: createPathwayInventoryEvaluationPayload(),
    })

    await startRecommendationRun(request, appBaseUrl, seededRun.runId)
    const { response, body } = await readPathwaysForRun(request, appBaseUrl, seededRun.runId)

    expect(response.status()).toBe(200)
    expect(outcomeIds(body)).not.toContain(targetPathwayId)
    expect(outcomeIds(body).every(pathwayId => activeIds.includes(pathwayId))).toBe(true)
  })
})
