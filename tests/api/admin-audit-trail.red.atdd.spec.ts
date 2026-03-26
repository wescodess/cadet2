import { readFileSync } from 'node:fs'
import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createAuditTrailRouteProbe,
  type AuditTrailEventDetailResponse,
  type AuditTrailListResponse,
  type AuditTrailSummaryResponse,
} from '../support/fixtures/factories/audit-trail-factory'
import { createPathwayDefinitionCreateInput } from '../support/fixtures/factories/pathway-inventory-factory'
import {
  AUDIT_TRAIL_ACTION_TYPES,
  AUDIT_TRAIL_ENTITY_TYPES,
} from '../support/fixtures/test-data'
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
    const signUpBody = (await signUpResponse.text()).trim()

    if (signUpResponse.status() === 422 && signUpBody.includes('USER_ALREADY_EXISTS')) {
      const retrySignInResponse = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
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

      if (retrySignInResponse.ok()) {
        return
      }
    }

    const [signInFailure, signUpFailure] = await Promise.all([
      describeAuthFailure(signInResponse),
      Promise.resolve(signUpBody ? `HTTP ${signUpResponse.status()}: ${signUpBody.slice(0, 240)}` : `HTTP ${signUpResponse.status()}`),
    ])

    throw new Error(
      `Could not establish authenticated session for Story 5.4 audit trail API red-phase tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function ensureNonAdminRequest(request: APIRequestContext, appBaseUrl: string, label: string) {
  await ensureSession(request, appBaseUrl, {
    email: uniqueAuthEmail(label),
    name: 'Non Admin Audit Trail User',
  })
}

async function ensureAdminRequest(request: APIRequestContext, appBaseUrl: string) {
  const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

  await ensureSession(request, appBaseUrl, {
    email: resolveAdminAllowlistEmail(),
    name: 'Admin Audit Trail Ops User',
  })

  const syncResponse = await request.post(routeProbe.adminSyncPath, {
    failOnStatusCode: false,
  })

  if (!syncResponse.ok()) {
    const failure = (await syncResponse.text()).trim().replace(/\s+/g, ' ')
    throw new Error(
      `Admin bootstrap sync failed for Story 5.4 API red-phase tests. Configure TEST_ADMIN_EMAIL or NUXT_RAG_ADMIN_EMAILS with an allowlisted address. ${failure}`,
    )
  }

  const accessResponse = await request.get(routeProbe.adminAccessPath, {
    failOnStatusCode: false,
  })

  expect(accessResponse.status()).toBe(200)
}

async function createPathwayAuditEvents(request: APIRequestContext, appBaseUrl: string) {
  const pathwayInput = createPathwayDefinitionCreateInput({
    pathwayId: uniqueId('mvp-audit-trail-pathway'),
    displayName: 'Audit Trail Candidate Pathway',
    description: 'Temporary pathway created to validate governance audit ingestion.',
    status: 'draft',
  })

  const createResponse = await request.post(`${appBaseUrl}/api/admin/pathways`, {
    data: pathwayInput,
    failOnStatusCode: false,
  })
  expect(createResponse.ok(), `${createResponse.status()} ${(await createResponse.text()).slice(0, 400)}`).toBe(true)

  const statusResponse = await request.patch(`${appBaseUrl}/api/admin/pathways/${encodeURIComponent(pathwayInput.pathwayId)}/status`, {
    data: { status: 'inactive' },
    failOnStatusCode: false,
  })
  expect(statusResponse.ok(), `${statusResponse.status()} ${(await statusResponse.text()).slice(0, 400)}`).toBe(true)

  return pathwayInput
}

test.describe('Story 5.4 Admin Audit Trail API RED ATDD', () => {
  test('[P0][AC3] audit trail endpoints reject unauthenticated and non-admin callers', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

    const unauthenticatedList = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(unauthenticatedList.status()).toBe(401)

    const unauthenticatedSummary = await request.get(routeProbe.summaryPath, { failOnStatusCode: false })
    expect(unauthenticatedSummary.status()).toBe(401)

    await ensureNonAdminRequest(request, appBaseUrl, 'admin-audit-trail-non-admin-red')

    const nonAdminList = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(nonAdminList.status()).toBe(403)

    const nonAdminDetail = await request.get(routeProbe.detailPath('audit-event-redacted-1'), { failOnStatusCode: false })
    expect(nonAdminDetail.status()).toBe(403)
  })

  test('[P0][AC1][AC2] admin can list audit events with minimal governed fields and stable filters', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)
    const pathwayInput = await createPathwayAuditEvents(request, appBaseUrl)

    const response = await request.get(routeProbe.listPath, {
      params: {
        entityType: 'PATHWAY',
        search: pathwayInput.pathwayId,
      },
      failOnStatusCode: false,
    })
    expect(response.status()).toBe(200)

    const body = await response.json() as AuditTrailListResponse
    expect(body.ok).toBe(true)
    expect(body.totalCount).toBeGreaterThan(0)
    expect(body.items.length).toBeGreaterThan(0)

    for (const item of body.items) {
      expect(item.eventId.trim().length).toBeGreaterThan(0)
      expect(item.entityId.trim().length).toBeGreaterThan(0)
      expect(item.entityLabel.trim().length).toBeGreaterThan(0)
      expect(item.actorUserId.trim().length).toBeGreaterThan(0)
      expect((item.actorEmail || '').trim().length).toBeGreaterThan(0)
      expect(item.changeSummary.trim().length).toBeGreaterThan(0)
      expect(AUDIT_TRAIL_ACTION_TYPES).toContain(item.actionType)
      expect(AUDIT_TRAIL_ENTITY_TYPES).toContain(item.entityType)
      expect(Number.isNaN(Date.parse(item.timestamp))).toBe(false)
    }

    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('"trendScore"')
    expect(serialized).not.toContain('"historicalReplay"')
    expect(serialized).not.toContain('"analyticsDashboard"')
  })

  test('[P0][AC1][AC4] admin can inspect a single audit event with before and after change context', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)
    const pathwayInput = await createPathwayAuditEvents(request, appBaseUrl)

    const listResponse = await request.get(routeProbe.listPath, {
      params: {
        entityType: 'PATHWAY',
        search: pathwayInput.pathwayId,
      },
      failOnStatusCode: false,
    })
    expect(listResponse.status()).toBe(200)

    const listBody = await listResponse.json() as AuditTrailListResponse
    const selectedEvent = listBody.items[0]
    expect(selectedEvent).toBeDefined()

    const detailResponse = await request.get(routeProbe.detailPath(selectedEvent!.eventId), { failOnStatusCode: false })
    expect(detailResponse.status()).toBe(200)

    const detailBody = await detailResponse.json() as AuditTrailEventDetailResponse
    expect(detailBody.ok).toBe(true)
    expect(detailBody.event.eventId).toBe(selectedEvent!.eventId)
    expect(detailBody.event.entityLabel).toBe(selectedEvent!.entityLabel)
    expect(detailBody.event.changeContext.before === null || typeof detailBody.event.changeContext.before === 'object').toBe(true)
    expect(detailBody.event.changeContext.after === null || typeof detailBody.event.changeContext.after === 'object').toBe(true)
    expect(detailBody.event.relatedEvents.length).toBeGreaterThan(0)

    const serialized = JSON.stringify(detailBody)
    expect(serialized).not.toContain('"fieldValues"')
    expect(serialized).not.toContain('"submittedPayload"')
    expect(serialized).not.toContain('"passportNumber"')
    expect(serialized).not.toContain('"dateOfBirth"')
  })

  test('[P1][AC2][AC5] admin summary endpoint returns bounded governance statistics without analytics creep', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)
    await createPathwayAuditEvents(request, appBaseUrl)

    const response = await request.get(routeProbe.summaryPath, { failOnStatusCode: false })
    expect(response.status()).toBe(200)

    const body = await response.json() as AuditTrailSummaryResponse
    expect(body.ok).toBe(true)
    expect(body.eventsToday).toBeGreaterThanOrEqual(0)
    expect(body.eventsThisWeek).toBeGreaterThanOrEqual(body.eventsToday)
    expect(body.mostActiveActor).not.toBeNull()
    expect(body.mostActiveActor?.userId.trim().length).toBeGreaterThan(0)
    expect(body.mostActiveActor?.email.trim().length).toBeGreaterThan(0)
    expect(body.mostActiveActor?.eventCount).toBeGreaterThan(0)
    expect(AUDIT_TRAIL_ENTITY_TYPES).toContain(body.mostChangedEntityType)

    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('"trendline"')
    expect(serialized).not.toContain('"heatmap"')
    expect(serialized).not.toContain('"forecast"')
  })

  test('[P1][AC1][AC5] trust-sensitive admin mutations appear in the audit trail with scoped entity metadata', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createAuditTrailRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)

    const pathwayInput = createPathwayDefinitionCreateInput({
      pathwayId: uniqueId('mvp-audit-trail-pathway'),
      displayName: 'Audit Trail Candidate Pathway',
      description: 'Temporary pathway created to validate governance audit ingestion.',
      status: 'draft',
    })

    const createResponse = await request.post(`${appBaseUrl}/api/admin/pathways`, {
      data: pathwayInput,
      failOnStatusCode: false,
    })
    expect(createResponse.ok(), `${createResponse.status()} ${(await createResponse.text()).slice(0, 400)}`).toBe(true)

    const statusResponse = await request.patch(`${appBaseUrl}/api/admin/pathways/${encodeURIComponent(pathwayInput.pathwayId)}/status`, {
      data: { status: 'inactive' },
      failOnStatusCode: false,
    })
    expect(statusResponse.ok(), `${statusResponse.status()} ${(await statusResponse.text()).slice(0, 400)}`).toBe(true)

    const auditResponse = await request.get(routeProbe.listPath, {
      params: {
        entityType: 'PATHWAY',
        search: pathwayInput.pathwayId,
      },
      failOnStatusCode: false,
    })
    expect(auditResponse.status()).toBe(200)

    const auditBody = await auditResponse.json() as AuditTrailListResponse
    const matchingEvents = auditBody.items.filter(item => item.entityId === pathwayInput.pathwayId)

    expect(matchingEvents.length).toBeGreaterThanOrEqual(2)
    expect(matchingEvents.map(item => item.actionType)).toEqual(expect.arrayContaining([
      'PATHWAY_CREATED',
      'PATHWAY_STATUS_CHANGED',
    ]))
  })
})
