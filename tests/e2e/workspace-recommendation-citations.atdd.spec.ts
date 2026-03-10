import type { Page } from '@playwright/test'

import { test, expect } from '../support/fixtures'
import {
    createCandidateWithCitations,
    createCandidateWithInferredTrust,
    createCandidateWithSystemGeneratedTrust,
    createRecommendationCitation,
    type RecommendationCandidateWithCitations,
} from '../support/fixtures/factories/recommendation-citations-factory'
import {
    createRecommendationLifecycleRecord,
    createRecommendationLifecycleRouteProbe,
    createRecommendationStatusPayload,
} from '../support/fixtures/factories/recommendation-lifecycle-factory'
import { getTestEnvironment } from '../support/helpers/env'
import {
    RECOMMENDATION_CITATIONS_ATDD_TEST_IDS,
    RECOMMENDATION_TRUST_BOUNDARY_LABELS,
} from '../support/fixtures/test-data'

// ── Helpers ──────────────────────────────────────────────────────────────

async function mockRecommendationCitationData(
    page: Page,
    appBaseUrl: string,
    candidates: {
        direct: RecommendationCandidateWithCitations[]
        blocked: RecommendationCandidateWithCitations[]
        composed: RecommendationCandidateWithCitations[]
    },
) {
    const routeProbe = createRecommendationLifecycleRouteProbe(appBaseUrl)
    const completedRun = createRecommendationLifecycleRecord({
        runId: `story34-e2e-run-${Date.now().toString(36)}`,
        profileSnapshotId: `story34-e2e-snapshot-${Math.random().toString(36).slice(2, 8)}`,
        status: 'completed',
    })
    const statusPayload = createRecommendationStatusPayload(completedRun, {
        status: 'completed',
        statusMessage: 'Recommendation evaluation completed.',
    })

    await page.route('**/api/workspace/recommendation-runs**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([completedRun]),
        })
    })

    await page.route('**/api/recommendations/runs/*/status**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(statusPayload),
        })
    })

    await page.route('**/api/recommendations/runs/*/start**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(statusPayload),
        })
    })

    await page.route('**/api/recommendations/runs/*/results**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                runId: completedRun.runId,
                profileSnapshotId: completedRun.profileSnapshotId,
                status: 'completed',
                results: {
                    direct: candidates.direct,
                    blocked: candidates.blocked,
                    composed: candidates.composed,
                },
                comparison: {
                    mode: 'workspace',
                    summary: 'Compare with citation and trust detail.',
                    groups: [
                        { key: 'direct', label: 'Available now', description: 'Routes you can act on soonest.', count: candidates.direct.length },
                        { key: 'blocked', label: 'Blocked but close', description: 'Routes that need fixes.', count: candidates.blocked.length },
                        { key: 'composed', label: 'Longer-horizon', description: 'Multi-step routes.', count: candidates.composed.length },
                    ],
                    visibleGroupCount: 3,
                    totalCandidateCount: candidates.direct.length + candidates.blocked.length + candidates.composed.length,
                },
            }),
        })
    })

    return routeProbe
}

function uniqueAuthEmail() {
    const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    return `playwright-${getTestEnvironment()}-recommendation-citations-e2e-${seed}@example.com`
}

async function describeAuthFailure(response: Awaited<ReturnType<Page['request']['post']>>) {
    const text = (await response.text()).trim().replace(/\s+/g, ' ')
    return text ? `HTTP ${response.status()}: ${text.slice(0, 240)}` : `HTTP ${response.status()}`
}

async function ensureAuthenticatedPage(page: Page, appBaseUrl: string) {
    const email = uniqueAuthEmail()
    const password = 'PlaywrightPass123!'

    const signUpResponse = await page.request.post(`${appBaseUrl}/api/auth/sign-up/email`, {
        data: {
            email,
            password,
            name: 'Recommendation Citations E2E Test User',
            rememberMe: true,
        },
        failOnStatusCode: false,
    })

    if (!signUpResponse.ok()) {
        const signUpFailure = await describeAuthFailure(signUpResponse)
        throw new Error(`Could not establish authenticated browser session for recommendation citations E2E tests. sign-up: ${signUpFailure}`)
    }

    const storageState = await page.request.storageState()
    if (storageState.cookies.length === 0) {
        throw new Error('Sign-up succeeded but no auth cookies were returned in storage state for recommendation citations E2E tests.')
    }

    await page.context().addCookies(storageState.cookies)
}

// ── Tests ────────────────────────────────────────────────────────────────

test.describe('Story 3.4 Recommendation Citations & Trust Boundaries E2E ATDD', () => {
    test('[P0][AC1] workspace renders a citation list for each recommendation candidate with inspectable source context', async ({
        page,
        appBaseUrl,
    }) => {
        await ensureAuthenticatedPage(page, appBaseUrl)

        const citationA = createRecommendationCitation({
            claimText: 'CLB 9 already clears the current benchmark.',
            sourceTitle: 'Express Entry Language Requirements — IRCC R-2025',
            sourceType: 'regulation',
        })
        const citationB = createRecommendationCitation({
            claimText: 'Skilled Worker pathway accepts 3+ years of experience.',
            sourceTitle: 'Federal Skilled Worker Eligibility Criteria — IRCC P-2024',
            sourceType: 'policy-bulletin',
        })

        const routeProbe = await mockRecommendationCitationData(page, appBaseUrl, {
            direct: [
                createCandidateWithCitations({
                    citations: [citationA, citationB],
                    trustBoundary: 'source-backed',
                }),
            ],
            blocked: [],
            composed: [],
        })

        await page.goto(routeProbe.workspacePath)

        // Citation list should be visible
        const citationList = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.citationList)
        await expect(citationList).toBeVisible()

        // Should render both citations
        const citationItems = citationList.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.citationItem)
        await expect(citationItems).toHaveCount(2)

        // Each citation should show the claim text and source title
        await expect(citationList).toContainText('CLB 9 already clears the current benchmark.')
        await expect(citationList).toContainText('Express Entry Language Requirements')
        await expect(citationList).toContainText('Skilled Worker pathway accepts 3+ years')
        await expect(citationList).toContainText('Federal Skilled Worker Eligibility Criteria')
    })

    test('[P0][AC2] workspace distinguishes source-backed, inferred, and system-generated trust boundaries with visible disclosure', async ({
        page,
        appBaseUrl,
    }) => {
        await ensureAuthenticatedPage(page, appBaseUrl)

        const routeProbe = await mockRecommendationCitationData(page, appBaseUrl, {
            direct: [createCandidateWithCitations()],
            blocked: [createCandidateWithInferredTrust()],
            composed: [createCandidateWithSystemGeneratedTrust()],
        })

        await page.goto(routeProbe.workspacePath)

        // Trust boundary badges should be visible for all candidates
        const trustBadges = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.trustBoundaryBadge)
        await expect(trustBadges).toHaveCount(3)

        // Labels should reflect correct trust classification
        await expect(page.getByText(RECOMMENDATION_TRUST_BOUNDARY_LABELS['source-backed'], { exact: true })).toBeVisible()
        await expect(page.getByText(RECOMMENDATION_TRUST_BOUNDARY_LABELS['inferred'], { exact: true })).toBeVisible()
        await expect(page.getByText(RECOMMENDATION_TRUST_BOUNDARY_LABELS['system-generated'], { exact: true })).toBeVisible()
    })

    test('[P0][AC2] inferred and system-generated candidates display visible caveat warnings', async ({
        page,
        appBaseUrl,
    }) => {
        await ensureAuthenticatedPage(page, appBaseUrl)

        const inferredCandidate = createCandidateWithInferredTrust({
            caveat: 'This pathway ranking includes inferred strategic guidance. Verify current PNP requirements directly.',
        })
        const systemCandidate = createCandidateWithSystemGeneratedTrust({
            caveat: 'This recommendation is system-generated. No specific regulatory citations are available.',
        })

        const routeProbe = await mockRecommendationCitationData(page, appBaseUrl, {
            direct: [],
            blocked: [inferredCandidate],
            composed: [systemCandidate],
        })

        await page.goto(routeProbe.workspacePath)

        // Caveat warnings should be visible as text
        const caveatWarnings = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.caveatWarning)
        await expect(caveatWarnings).toHaveCount(2)

        await expect(page.getByText(/inferred strategic guidance/i)).toBeVisible()
        await expect(page.getByText(/system-generated.*no specific regulatory citations/i)).toBeVisible()
    })

    test('[P0][AC3] trust information and citations are exposed as visible text, not color-only', async ({
        page,
        appBaseUrl,
    }) => {
        await ensureAuthenticatedPage(page, appBaseUrl)

        const routeProbe = await mockRecommendationCitationData(page, appBaseUrl, {
            direct: [createCandidateWithCitations()],
            blocked: [createCandidateWithInferredTrust()],
            composed: [createCandidateWithSystemGeneratedTrust()],
        })

        await page.goto(routeProbe.workspacePath)

        // Trust boundary labels must be visible text, not just color indicators
        for (const label of Object.values(RECOMMENDATION_TRUST_BOUNDARY_LABELS)) {
            await expect(page.getByText(label, { exact: true })).toBeVisible()
        }

        // Evidence panel should render source context as text
        const evidencePanel = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.evidencePanel).first()
        await expect(evidencePanel).toBeVisible()
        await expect(evidencePanel).toContainText('Express Entry Language Requirements')
    })

    test('[P1][AC3] citation controls are keyboard-navigable', async ({
        page,
        appBaseUrl,
    }) => {
        await ensureAuthenticatedPage(page, appBaseUrl)

        const routeProbe = await mockRecommendationCitationData(page, appBaseUrl, {
            direct: [createCandidateWithCitations()],
            blocked: [],
            composed: [],
        })

        await page.goto(routeProbe.workspacePath)

        const citationList = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.citationList)
        await expect(citationList).toBeVisible()

        const firstCitation = citationList.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.citationItem).first()
        await firstCitation.focus()

        // Citation should be focusable
        await expect(firstCitation).toBeFocused()

        // Enter/Space should open source context
        await page.keyboard.press('Enter')
        const evidencePanel = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.evidencePanel)
        await expect(evidencePanel).toBeVisible()
    })

    test('[P1][AC1][AC3] citation list is visible and navigable on mobile viewport', async ({
        page,
        appBaseUrl,
    }) => {
        await page.setViewportSize({ width: 375, height: 812 })

        await ensureAuthenticatedPage(page, appBaseUrl)

        const routeProbe = await mockRecommendationCitationData(page, appBaseUrl, {
            direct: [createCandidateWithCitations()],
            blocked: [],
            composed: [],
        })

        await page.goto(routeProbe.workspacePath)

        const citationList = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.citationList)
        await expect(citationList).toBeVisible()

        const citationItems = citationList.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.citationItem)
        await expect(citationItems).toHaveCount(2)

        // Trust badge should be visible on mobile
        const trustBadge = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.trustBoundaryBadge)
        await expect(trustBadge).toBeVisible()
        await expect(trustBadge).toContainText(RECOMMENDATION_TRUST_BOUNDARY_LABELS['source-backed'])
    })

    test('[P2][AC1] citation items link to the source URL', async ({
        page,
        appBaseUrl,
    }) => {
        await ensureAuthenticatedPage(page, appBaseUrl)

        const citation = createRecommendationCitation({
            sourceUrl: 'https://www.canada.ca/en/immigration/express-entry.html',
        })

        const routeProbe = await mockRecommendationCitationData(page, appBaseUrl, {
            direct: [
                createCandidateWithCitations({ citations: [citation] }),
            ],
            blocked: [],
            composed: [],
        })

        await page.goto(routeProbe.workspacePath)

        // The citation-item testid is on the disclosure button; the "Open source"
        // link is a sibling <a> inside the same per-citation <section>.  Query from
        // the citation list container and locate the first link.
        const citationList = page.getByTestId(RECOMMENDATION_CITATIONS_ATDD_TEST_IDS.citationList)
        const sourceLink = citationList.getByRole('link', { name: /open source/i }).first()
        await expect(sourceLink).toBeVisible()
        await expect(sourceLink).toHaveAttribute('href', citation.sourceUrl)
        await expect(sourceLink).toHaveAttribute('target', '_blank')
        await expect(sourceLink).toHaveAttribute('rel', /noopener/)
    })
})
