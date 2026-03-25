import { readFileSync } from 'node:fs'
import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
  createRecommendationReviewCitationFlagInput,
  createRecommendationReviewRouteProbe,
  createRecommendationReviewRunActionInput,
  type RecommendationReviewListResponse,
  type RecommendationReviewRunDetailResponse,
} from '../support/fixtures/factories/recommendation-review-factory'
import {
  RECOMMENDATION_CONFIDENCE_LEVELS,
  RECOMMENDATION_REVIEW_FRESHNESS_LABELS,
  RECOMMENDATION_REVIEW_STATES,
  RECOMMENDATION_REVIEW_SUPPORT_STRENGTHS,
  RECOMMENDATION_REVIEW_TRUST_SCORES,
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
      `Could not establish authenticated session for Story 5.3 recommendation review API red-phase tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
    )
  }
}

async function ensureNonAdminRequest(request: APIRequestContext, appBaseUrl: string, label: string) {
  await ensureSession(request, appBaseUrl, {
    email: uniqueAuthEmail(label),
    name: 'Non Admin Recommendation Review User',
  })
}

async function ensureAdminRequest(request: APIRequestContext, appBaseUrl: string) {
  const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

  await ensureSession(request, appBaseUrl, {
    email: resolveAdminAllowlistEmail(),
    name: 'Admin Recommendation Review Ops User',
  })

  const syncResponse = await request.post(routeProbe.adminSyncPath, {
    failOnStatusCode: false,
  })

  if (!syncResponse.ok()) {
    const failure = (await syncResponse.text()).trim().replace(/\s+/g, ' ')
    throw new Error(
      `Admin bootstrap sync failed for Story 5.3 API red-phase tests. Configure TEST_ADMIN_EMAIL or NUXT_RAG_ADMIN_EMAILS with an allowlisted address. ${failure}`,
    )
  }
}

async function resetRecommendationRuns(request: APIRequestContext, appBaseUrl: string) {
  const response = await request.post(`${appBaseUrl}/api/recommendations/testing/reset`, {
    failOnStatusCode: false,
  })

  expect(response.status()).toBe(200)
}

async function seedRecommendationReviewRun(request: APIRequestContext, appBaseUrl: string) {
  const runId = `review-run-${Date.now().toString(36)}`
  const profileSnapshotId = `review-snapshot-${Date.now().toString(36)}`
  const seedResponse = await request.post(`${appBaseUrl}/api/recommendations/testing/seed`, {
    data: {
      runId,
      profileSnapshotId,
      status: 'queued',
      resetExisting: true,
    },
    failOnStatusCode: false,
  })

  expect(seedResponse.status()).toBe(200)

  const startResponse = await request.post(`${appBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/start`, {
    failOnStatusCode: false,
  })

  expect(startResponse.status()).toBe(200)

  return {
    runId,
    profileSnapshotId,
  }
}

async function createEvidenceSourceForReview(request: APIRequestContext, appBaseUrl: string) {
  const response = await request.post(`${appBaseUrl}/api/admin/rag/sources`, {
    data: {
      type: 'website',
      name: `Recommendation review source ${Date.now().toString(36)}`,
      description: 'ATDD recommendation review evidence source.',
      trustScore: 88,
      linkedPathwayIds: [
        'mvp-skilled-worker',
        'mvp-provincial-nominee',
        'mvp-study-to-work',
      ],
      tenantId: 'default',
      tags: ['atdd', 'recommendation-review'],
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

  expect(response.status()).toBe(200)
}

test.describe('Story 5.3 Admin Recommendation Review API RED ATDD', () => {
  test('[P0][AC1] recommendation review endpoints reject unauthenticated and non-admin callers', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    const unauthenticatedList = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(unauthenticatedList.status()).toBe(401)

    await ensureNonAdminRequest(request, appBaseUrl, 'admin-recommendation-review-non-admin-red')

    const nonAdminList = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(nonAdminList.status()).toBe(403)

    const nonAdminDetail = await request.get(routeProbe.detailPath('run-redacted-1'), { failOnStatusCode: false })
    expect(nonAdminDetail.status()).toBe(403)
  })

  test('[P0][AC1][AC3] admin can list recommendation review runs with anonymized trust metadata only', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    await createEvidenceSourceForReview(request, appBaseUrl)
    const seededRun = await seedRecommendationReviewRun(request, appBaseUrl)

    const response = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(response.status()).toBe(200)

    const body = await response.json() as RecommendationReviewListResponse
    expect(body.ok).toBe(true)
    expect(body.totalCount).toBeGreaterThan(0)
    expect(body.items.length).toBeGreaterThan(0)

    for (const item of body.items) {
      expect(item.runId.trim().length).toBeGreaterThan(0)
      expect(item.profileSnapshotId.trim().length).toBeGreaterThan(0)
      expect(item.anonymizedSubject.trim().length).toBeGreaterThan(0)
      expect(RECOMMENDATION_REVIEW_TRUST_SCORES).toContain(item.trustScore)
      expect(RECOMMENDATION_CONFIDENCE_LEVELS).toContain(item.confidence)
      expect(RECOMMENDATION_REVIEW_FRESHNESS_LABELS).toContain(item.freshness)
      expect(RECOMMENDATION_REVIEW_STATES).toContain(item.reviewState)
      expect(item.citationCount).toBeGreaterThanOrEqual(0)
      expect(item.flaggedCitationCount).toBeGreaterThanOrEqual(0)
      expect(item.caveatCount).toBeGreaterThanOrEqual(0)
    }

    const seededItem = body.items.find(item => item.runId === seededRun.runId)
    expect(seededItem).toBeDefined()

    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('"fieldValues"')
    expect(serialized).not.toContain('"submittedPayload"')
    expect(serialized).not.toContain('"additionalContext"')
    expect(serialized).not.toContain('"email"')
    expect(serialized).not.toContain('"phone"')
  })

  test('[P0][AC1][AC3] admin can inspect a run detail with citation integrity data and no raw profile leakage', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    await createEvidenceSourceForReview(request, appBaseUrl)
    const seededRun = await seedRecommendationReviewRun(request, appBaseUrl)

    const listResponse = await request.get(routeProbe.listPath, { failOnStatusCode: false })
    expect(listResponse.status()).toBe(200)

    const listBody = await listResponse.json() as RecommendationReviewListResponse
    const selectedRun = listBody.items.find(item => item.runId === seededRun.runId) || listBody.items[0]
    expect(selectedRun).toBeDefined()

    const detailResponse = await request.get(routeProbe.detailPath(selectedRun!.runId), { failOnStatusCode: false })
    expect(detailResponse.status()).toBe(200)

    const detailBody = await detailResponse.json() as RecommendationReviewRunDetailResponse
    expect(detailBody.ok).toBe(true)
    expect(detailBody.run.runId).toBe(selectedRun!.runId)
    expect(detailBody.run.subjectReference.label.trim().length).toBeGreaterThan(0)
    expect(detailBody.run.subjectReference.profileSnapshotId).toBe(selectedRun!.profileSnapshotId)
    expect(detailBody.citations.length).toBeGreaterThan(0)

    for (const citation of detailBody.citations) {
      expect(citation.citationId.trim().length).toBeGreaterThan(0)
      expect(citation.sourceId.trim().length).toBeGreaterThan(0)
      expect(citation.sourceName.trim().length).toBeGreaterThan(0)
      expect(citation.sourceUrl.trim().length).toBeGreaterThan(0)
      expect(citation.claimSnippet.trim().length).toBeGreaterThan(0)
      expect(citation.pathwayId.trim().length).toBeGreaterThan(0)
      expect(citation.pathwayLabel.trim().length).toBeGreaterThan(0)
      expect(citation.matchContext.trim().length).toBeGreaterThan(0)
      expect(RECOMMENDATION_REVIEW_FRESHNESS_LABELS).toContain(citation.freshness)
      expect(RECOMMENDATION_REVIEW_SUPPORT_STRENGTHS).toContain(citation.supportStrength)
      expect(RECOMMENDATION_REVIEW_STATES).toContain(citation.reviewState)
    }

    const serialized = JSON.stringify(detailBody)
    expect(serialized).not.toContain('"fieldValues"')
    expect(serialized).not.toContain('"submittedPayload"')
    expect(serialized).not.toContain('"dateOfBirth"')
    expect(serialized).not.toContain('"passportNumber"')
    expect(serialized).not.toContain('"email"')
  })

  test('[P0][AC2] admin can flag, resolve, and dismiss a recommendation review concern', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    await createEvidenceSourceForReview(request, appBaseUrl)
    const seededRun = await seedRecommendationReviewRun(request, appBaseUrl)

    const flagResponse = await request.post(routeProbe.flagRunPath(seededRun.runId), {
      data: createRecommendationReviewRunActionInput('Trust support needs admin follow-up before more reuse.'),
      failOnStatusCode: false,
    })
    expect(flagResponse.status()).toBe(200)

    const resolveResponse = await request.post(routeProbe.resolveRunPath(seededRun.runId), {
      data: createRecommendationReviewRunActionInput('Citations revalidated against current evidence sources.'),
      failOnStatusCode: false,
    })
    expect(resolveResponse.status()).toBe(200)

    const dismissResponse = await request.post(routeProbe.dismissRunPath(seededRun.runId), {
      data: createRecommendationReviewRunActionInput('Issue accepted as informational-only for this run.'),
      failOnStatusCode: false,
    })
    expect(dismissResponse.status()).toBe(200)
  })

  test('[P0][AC2][AC3] admin can flag a weak citation and pause its related source through the governed correction flow', async ({
    request,
    appBaseUrl,
  }) => {
    const routeProbe = createRecommendationReviewRouteProbe(appBaseUrl)

    await ensureAdminRequest(request, appBaseUrl)
    await resetRecommendationRuns(request, appBaseUrl)
    await createEvidenceSourceForReview(request, appBaseUrl)
    const seededRun = await seedRecommendationReviewRun(request, appBaseUrl)

    const detailResponse = await request.get(routeProbe.detailPath(seededRun.runId), { failOnStatusCode: false })
    expect(detailResponse.status()).toBe(200)
    const detailBody = await detailResponse.json() as RecommendationReviewRunDetailResponse
    const targetCitation = detailBody.citations.find(citation => citation.supportStrength === 'weak' || citation.supportStrength === 'unsupported')
      || detailBody.citations[0]
    expect(targetCitation).toBeDefined()

    const flagCitationResponse = await request.post(routeProbe.flagCitationPath(seededRun.runId, targetCitation!.citationId), {
      data: createRecommendationReviewCitationFlagInput('Citation support is stale and should be reviewed before reuse.'),
      failOnStatusCode: false,
    })
    expect(flagCitationResponse.status()).toBe(200)

    const pauseSourceResponse = await request.post(routeProbe.pauseSourcePath(targetCitation!.sourceId), {
      data: { note: 'Paused from recommendation review workflow because citation support is weak.' },
      failOnStatusCode: false,
    })
    expect(pauseSourceResponse.status()).toBe(200)
  })
})
