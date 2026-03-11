import type { APIRequestContext } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
    createRecommendationCitationIds,
    createCitationEvaluationPayload,
    createDegradedCitationEvaluationPayload,
    type RecommendationCitationsResultsResponse,
    type RecommendationCandidateWithCitations,
} from '../support/fixtures/factories/recommendation-citations-factory'
import {
    RECOMMENDATION_TRUST_BOUNDARY_VALUES,
    RECOMMENDATION_CITATION_SOURCE_TYPES,
} from '../support/fixtures/test-data'
import { getTestEnvironment } from '../support/helpers/env'

function uniqueAuthEmail() {
    const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    return `playwright-${getTestEnvironment()}-recommendation-citations-api-red-${seed}@example.com`
}

async function describeAuthFailure(response: Awaited<ReturnType<APIRequestContext['post']>>) {
    const text = (await response.text()).trim().replace(/\s+/g, ' ')
    return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureAuthenticatedRequest(request: APIRequestContext, appBaseUrl: string) {
    const email = uniqueAuthEmail()
    const password = 'PlaywrightPass123!'

    const signInResponse = await request.post(`${appBaseUrl}/api/auth/sign-in/email`, {
        headers: {
            origin: appBaseUrl,
        },
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
        headers: {
            origin: appBaseUrl,
        },
        data: {
            email,
            password,
            name: 'Recommendation Citations API Red-Phase Test User',
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
            `Could not establish authenticated session for recommendation citations API red-phase tests. sign-in: ${signInFailure}; sign-up: ${signUpFailure}`,
        )
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
    return await response.json() as { runId: string; profileSnapshotId: string; status: string }
}

async function startRecommendationRun(request: APIRequestContext, appBaseUrl: string, runId: string) {
    const response = await request.post(`${appBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/start`, {
        failOnStatusCode: false,
    })

    expect(response.status()).toBe(200)
}

async function readRecommendationResults(request: APIRequestContext, appBaseUrl: string, runId: string) {
    const response = await request.get(`${appBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/results`, {
        failOnStatusCode: false,
    })

    expect(response.status()).toBe(200)
    return await response.json() as RecommendationCitationsResultsResponse
}

function allCandidates(body: RecommendationCitationsResultsResponse): RecommendationCandidateWithCitations[] {
    return [...body.results.direct, ...body.results.blocked, ...body.results.composed]
}

test.describe('Story 3.4 Recommendation Citations & Trust Boundaries API RED ATDD', () => {
    test.skip('[P0][AC1] recommendation results include citation arrays attached to each candidate with valid citation structure', async ({
        request,
        appBaseUrl,
    }) => {
        const ids = createRecommendationCitationIds('story34-api-citations-red')

        await ensureAuthenticatedRequest(request, appBaseUrl)
        await resetRecommendationRuns(request, appBaseUrl)
        const seededRun = await seedRecommendationRun(request, appBaseUrl, {
            runId: ids.runId,
            profileSnapshotId: ids.profileSnapshotId,
            submittedPayload: createCitationEvaluationPayload(),
        })

        await startRecommendationRun(request, appBaseUrl, seededRun.runId)
        const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

        const candidates = allCandidates(results)
        expect(candidates.length).toBeGreaterThan(0)

        for (const candidate of candidates) {
            expect(Array.isArray(candidate.citations)).toBe(true)

            for (const citation of candidate.citations) {
                expect(citation.citationId.trim().length).toBeGreaterThan(0)
                expect(citation.claimText.trim().length).toBeGreaterThan(0)
                expect(citation.sourceTitle.trim().length).toBeGreaterThan(0)
                expect(citation.sourceUrl.trim().length).toBeGreaterThan(0)
                expect(RECOMMENDATION_CITATION_SOURCE_TYPES).toContain(citation.sourceType)
                expect(citation.excerpt.trim().length).toBeGreaterThan(0)
                expect(citation.retrievalDate.trim().length).toBeGreaterThan(0)
                expect(['fresh', 'stale', 'unknown']).toContain(citation.freshness)
            }
        }
    })

    test.skip('[P0][AC2] recommendation results expose a trust-boundary classification for each candidate', async ({
        request,
        appBaseUrl,
    }) => {
        const ids = createRecommendationCitationIds('story34-api-trust-boundary-red')

        await ensureAuthenticatedRequest(request, appBaseUrl)
        await resetRecommendationRuns(request, appBaseUrl)
        const seededRun = await seedRecommendationRun(request, appBaseUrl, {
            runId: ids.runId,
            profileSnapshotId: ids.profileSnapshotId,
            submittedPayload: createCitationEvaluationPayload(),
        })

        await startRecommendationRun(request, appBaseUrl, seededRun.runId)
        const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

        const candidates = allCandidates(results)
        expect(candidates.length).toBeGreaterThan(0)

        for (const candidate of candidates) {
            expect(RECOMMENDATION_TRUST_BOUNDARY_VALUES).toContain(candidate.trustBoundary)
        }

        const sourceBacked = candidates.filter(c => c.trustBoundary === 'source-backed')
        for (const candidate of sourceBacked) {
            expect(candidate.citations.length).toBeGreaterThan(0)
        }
    })

    test.skip('[P0][AC2] source-backed and inferred trust boundaries are semantically distinct on the response', async ({
        request,
        appBaseUrl,
    }) => {
        const ids = createRecommendationCitationIds('story34-api-trust-distinct-red')

        await ensureAuthenticatedRequest(request, appBaseUrl)
        await resetRecommendationRuns(request, appBaseUrl)
        const seededRun = await seedRecommendationRun(request, appBaseUrl, {
            runId: ids.runId,
            profileSnapshotId: ids.profileSnapshotId,
            submittedPayload: createCitationEvaluationPayload(),
        })

        await startRecommendationRun(request, appBaseUrl, seededRun.runId)
        const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

        const candidates = allCandidates(results)
        expect(candidates.length).toBeGreaterThan(0)

        const trustValues = new Set(candidates.map(c => c.trustBoundary))

        for (const value of trustValues) {
            expect(RECOMMENDATION_TRUST_BOUNDARY_VALUES).toContain(value)
        }

        if (trustValues.has('source-backed') && trustValues.has('inferred')) {
            expect(trustValues.size).toBeGreaterThanOrEqual(2)
        }

        expect(trustValues.size).toBeGreaterThanOrEqual(1)

        const inferred = candidates.filter(c => c.trustBoundary === 'inferred')
        for (const candidate of inferred) {
            expect(candidate.caveat.trim().length).toBeGreaterThan(0)
        }
    })

    test.skip('[P1][AC3] failed or degraded recommendation runs return empty citation arrays and appropriate trust-boundary defaults', async ({
        request,
        appBaseUrl,
    }) => {
        const ids = createRecommendationCitationIds('story34-api-fallback-red')

        await ensureAuthenticatedRequest(request, appBaseUrl)
        await resetRecommendationRuns(request, appBaseUrl)
        const seededRun = await seedRecommendationRun(request, appBaseUrl, {
            runId: ids.runId,
            profileSnapshotId: ids.profileSnapshotId,
            submittedPayload: createDegradedCitationEvaluationPayload(),
        })

        await startRecommendationRun(request, appBaseUrl, seededRun.runId)
        const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

        const candidates = allCandidates(results)

        for (const candidate of candidates) {
            expect(Array.isArray(candidate.citations)).toBe(true)
            expect(RECOMMENDATION_TRUST_BOUNDARY_VALUES).toContain(candidate.trustBoundary)
        }
    })

    test.skip('[P1][AC3] citation data does not regress existing comparison, blocker, or tradeoff modules', async ({
        request,
        appBaseUrl,
    }) => {
        const ids = createRecommendationCitationIds('story34-api-no-regression-red')

        await ensureAuthenticatedRequest(request, appBaseUrl)
        await resetRecommendationRuns(request, appBaseUrl)
        const seededRun = await seedRecommendationRun(request, appBaseUrl, {
            runId: ids.runId,
            profileSnapshotId: ids.profileSnapshotId,
            submittedPayload: createCitationEvaluationPayload(),
        })

        await startRecommendationRun(request, appBaseUrl, seededRun.runId)
        const results = await readRecommendationResults(request, appBaseUrl, seededRun.runId)

        expect(results.comparison).toBeDefined()

        const candidates = allCandidates(results)
        expect(candidates.length).toBeGreaterThan(0)

        for (const candidate of candidates) {
            expect(Array.isArray(candidate.blockers)).toBe(true)
            expect(Array.isArray(candidate.tradeoffs)).toBe(true)
            expect(Array.isArray(candidate.improvementActions)).toBe(true)
            expect(candidate.qualification).toBeDefined()
            expect(candidate.confidence).toBeDefined()
            expect(candidate.freshness).toBeDefined()
            expect(Array.isArray(candidate.citations)).toBe(true)
            expect(candidate.trustBoundary).toBeDefined()
        }
    })
})
