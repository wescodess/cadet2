import { test, expect } from '../support/fixtures'
import type { RecommendationEvidenceReference } from '../../server/utils/recommendations/buildRecommendationCitations'
import {
    RECOMMENDATION_CITATION_SOURCE_TYPES,
} from '../support/fixtures/test-data'

/**
 * Unit tests for server/utils/recommendations/buildRecommendationCitations.ts
 *
 * These tests validate the citation assembly utility that maps raw recommendation
 * evidence references to the normalized RecommendationCitation shape.
 */

test.describe('Story 3.4 buildRecommendationCitations Unit Tests', () => {
    test('[P0] assembles citation array from raw recommendation evidence references', async () => {
        const { buildRecommendationCitations } = await import(
            '../../server/utils/recommendations/buildRecommendationCitations'
        )

        const rawEvidence = [
            {
                claim: 'CLB 9 clears the benchmark.',
                source: {
                    title: 'Express Entry Language Requirements — IRCC R-2025',
                    url: 'https://www.canada.ca/en/immigration/express-entry.html',
                    type: 'regulation',
                    excerpt: 'CLB 9 satisfies the minimum language requirement for Federal Skilled Worker.',
                    retrievedAt: '2026-01-15T00:00:00Z',
                },
            },
        ]

        const citations = buildRecommendationCitations(rawEvidence)

        expect(Array.isArray(citations)).toBe(true)
        expect(citations.length).toBe(1)
        expect(citations[0].citationId).toBeTruthy()
        expect(citations[0].claimText).toBe('CLB 9 clears the benchmark.')
        expect(citations[0].sourceTitle).toBe('Express Entry Language Requirements — IRCC R-2025')
        expect(citations[0].sourceUrl).toBe('https://www.canada.ca/en/immigration/express-entry.html')
        expect(citations[0].sourceType).toBe('regulation')
        expect(citations[0].excerpt.length).toBeGreaterThan(0)
        expect(citations[0].retrievalDate).toBe('2026-01-15T00:00:00Z')
        expect(['fresh', 'stale', 'unknown']).toContain(citations[0].freshness)
    })

    test('[P0] returns empty array when raw evidence is empty or undefined', async () => {
        const { buildRecommendationCitations } = await import(
            '../../server/utils/recommendations/buildRecommendationCitations'
        )

        const emptyResult = buildRecommendationCitations([])
        expect(emptyResult).toEqual([])

        const undefinedResult = buildRecommendationCitations(undefined as unknown as RecommendationEvidenceReference[])
        expect(undefinedResult).toEqual([])

        const nullResult = buildRecommendationCitations(null as unknown as RecommendationEvidenceReference[])
        expect(nullResult).toEqual([])
    })

    test('[P1] assigns correct freshness state based on retrieval date age', async () => {
        const { buildRecommendationCitations } = await import(
            '../../server/utils/recommendations/buildRecommendationCitations'
        )

        const recentEvidence = [
            {
                claim: 'Recent claim.',
                source: {
                    title: 'Recent Source',
                    url: 'https://example.com/recent',
                    type: 'regulation',
                    excerpt: 'Recent excerpt.',
                    retrievedAt: new Date().toISOString(), // today
                },
            },
        ]

        const staleEvidence = [
            {
                claim: 'Stale claim.',
                source: {
                    title: 'Stale Source',
                    url: 'https://example.com/stale',
                    type: 'regulation',
                    excerpt: 'Stale excerpt.',
                    retrievedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
                },
            },
        ]

        const recentCitations = buildRecommendationCitations(recentEvidence)
        expect(recentCitations[0].freshness).toBe('fresh')

        const staleCitations = buildRecommendationCitations(staleEvidence)
        expect(staleCitations[0].freshness).toBe('stale')
    })

    test('[P1] normalizes all source types to the canonical set', async () => {
        const { buildRecommendationCitations } = await import(
            '../../server/utils/recommendations/buildRecommendationCitations'
        )

        for (const sourceType of RECOMMENDATION_CITATION_SOURCE_TYPES) {
            const evidence = [
                {
                    claim: `Claim for ${sourceType}`,
                    source: {
                        title: `Source for ${sourceType}`,
                        url: 'https://example.com',
                        type: sourceType,
                        excerpt: `Excerpt for ${sourceType}`,
                        retrievedAt: new Date().toISOString(),
                    },
                },
            ]

            const citations = buildRecommendationCitations(evidence)
            expect(citations[0].sourceType).toBe(sourceType)
        }
    })

    test('[P2] handles malformed evidence entries gracefully without throwing', async () => {
        const { buildRecommendationCitations } = await import(
            '../../server/utils/recommendations/buildRecommendationCitations'
        )

        const malformedEvidence = [
            { claim: '', source: null },
            { claim: 'Valid claim', source: { title: '', url: '', type: '' } },
            null,
            undefined,
        ]

        // Should not throw, should filter out malformed entries
        const citations = buildRecommendationCitations(malformedEvidence as unknown as RecommendationEvidenceReference[])
        expect(Array.isArray(citations)).toBe(true)
    })
})
