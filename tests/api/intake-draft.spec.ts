import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import { createIntakeDraftPayload, createIntakeRouteProbe } from '../support/fixtures/factories/intake-draft-factory'
import {
  INTAKE_ATDD_REQUIRED_RESPONSE_KEYS,
  INTAKE_ATDD_REQUIRED_STORAGE_KEYS,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `playwright-${getTestEnvironment()}-intake-api-${seed}@example.com`
}

async function ensureAuthenticatedRequest(request: APIRequestContext, appBaseUrl: string) {
  const email = uniqueAuthEmail()
  const password = 'PlaywrightPass123!'

  const signInResponse = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
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

  const signUpResponse = await request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
    data: {
      email,
      password,
      name: 'Intake API Test User',
      rememberMe: true,
    },
    failOnStatusCode: false,
  })

  if (!signUpResponse.ok()) {
    throw new Error('Could not establish authenticated API session for intake tests')
  }
}

test.describe('Guided intake draft API', () => {
  test.describe.configure({ mode: 'serial' })

  test('unauthenticated intake draft read is denied', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const response = await request.get(probe.draftApiPath)

    expect(response.status()).toBe(401)
  })

  test('unauthenticated intake draft save is denied', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createIntakeDraftPayload()
    const response = await request.post(probe.draftApiPath, {
      data: payload,
    })

    expect(response.status()).toBe(401)
  })

  test('draft save returns minimal response shape', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createIntakeDraftPayload()

    await ensureAuthenticatedRequest(request, appBaseUrl)

    const response = await request.post(probe.draftApiPath, {
      data: payload,
    })
    const body = await response.json() as Record<string, unknown>

    expect(response.status()).toBe(200)
    expect(Object.keys(body).sort()).toEqual([...INTAKE_ATDD_REQUIRED_RESPONSE_KEYS].sort())
    expect(body.currentSection).toBe(payload.currentSection)
  })

  test('save payload is limited to required draft storage keys', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = {
      ...createIntakeDraftPayload(),
      recommendationRunId: 'run-should-not-be-accepted',
      auditTrail: [{ action: 'tamper' }],
    }

    await ensureAuthenticatedRequest(request, appBaseUrl)

    const response = await request.post(probe.draftApiPath, {
      data: payload,
    })

    expect(response.status()).toBe(400)
  })

  test('saved draft is restored with current section and values', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createIntakeDraftPayload({ currentSection: 'work' })

    await ensureAuthenticatedRequest(request, appBaseUrl)

    await request.post(probe.draftApiPath, {
      data: payload,
    })

    const response = await request.get(probe.draftApiPath)
    const body = await response.json() as {
      currentSection: string
      values: Record<string, Record<string, unknown>>
    }

    expect(response.status()).toBe(200)
    expect(body.currentSection).toBe(payload.currentSection)
    expect(body.values.personal?.firstName).toBe(payload.fieldValues.personal?.firstName)
  })

  test('saved draft restores persisted new-cycle lineage', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = createIntakeDraftPayload({
      currentSection: 'goals',
      sourceRunId: 'run_story44_source_cycle',
    })

    await ensureAuthenticatedRequest(request, appBaseUrl)

    await request.post(probe.draftApiPath, {
      data: payload,
    })

    const response = await request.get(probe.draftApiPath)
    const body = await response.json() as {
      currentSection: string
      sourceRunId?: string | null
    }

    expect(response.status()).toBe(200)
    expect(body.currentSection).toBe(payload.currentSection)
    expect(body.sourceRunId).toBe(payload.sourceRunId)
  })

  test('draft read payload excludes recommendation and audit entities', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)

    await ensureAuthenticatedRequest(request, appBaseUrl)

    const response = await request.get(probe.draftApiPath)
    const body = await response.json() as Record<string, unknown>

    expect(response.status()).toBe(200)
    for (const field of ['recommendationRunId', 'pathwayDefinitionId', 'auditTrail']) {
      expect(Object.prototype.hasOwnProperty.call(body, field)).toBe(false)
    }
    expect(INTAKE_ATDD_REQUIRED_STORAGE_KEYS.length).toBe(4)
  })

  test('invalid section identifiers are rejected with validation details', async ({ request, appBaseUrl }) => {
    const probe = createIntakeRouteProbe(appBaseUrl)
    const payload = {
      ...createIntakeDraftPayload(),
      currentSection: 'invalid-section',
    }

    await ensureAuthenticatedRequest(request, appBaseUrl)

    const response = await request.post(probe.draftApiPath, {
      data: payload,
    })
    const responseBody = await response.text()

    expect(response.status()).toBe(400)
    expect(responseBody.toLowerCase()).toContain('currentsection')
  })
})
