import { test, expect } from '../support/fixtures'
import {
    RECOMMENDATION_TRUST_BOUNDARY_VALUES,
} from '../support/fixtures/test-data'

/**
 * Unit tests for server/utils/recommendations/classifyTrustBoundary.ts
 *
 * These tests validate the trust-boundary classification utility that determines
 * whether each recommendation claim is source-backed, inferred, or system-generated
 * based on evidence linkage and confidence metadata.
 */

test.describe('Story 3.4 classifyTrustBoundary Unit Tests', () => {
    test('[P0] classifies as source-backed when strong evidence linkage and high confidence are present', async () => {
        const { classifyTrustBoundary } = await import(
            '../../server/utils/recommendations/classifyTrustBoundary'
        )

        const result = classifyTrustBoundary({
            evidenceReferences: [
                {
                    claim: 'Supported claim',
                    source: { title: 'Regulation', url: 'https://example.com', type: 'regulation' },
                },
            ],
            confidence: 'high',
            qualification: 'supported',
        })

        expect(result).toBe('source-backed')
    })

    test('[P0] classifies as inferred when evidence is partial or confidence is medium/low', async () => {
        const { classifyTrustBoundary } = await import(
            '../../server/utils/recommendations/classifyTrustBoundary'
        )

        const result = classifyTrustBoundary({
            evidenceReferences: [
                {
                    claim: 'Partially supported claim',
                    source: { title: 'Policy Bulletin', url: 'https://example.com', type: 'policy-bulletin' },
                },
            ],
            confidence: 'medium',
            qualification: 'low-confidence',
        })

        expect(result).toBe('inferred')
    })

    test('[P0] classifies as system-generated when no evidence references are provided', async () => {
        const { classifyTrustBoundary } = await import(
            '../../server/utils/recommendations/classifyTrustBoundary'
        )

        const result = classifyTrustBoundary({
            evidenceReferences: [],
            confidence: 'low',
            qualification: 'withheld',
        })

        expect(result).toBe('system-generated')
    })

    test('[P1] always returns a value from the canonical trust-boundary set', async () => {
        const { classifyTrustBoundary } = await import(
            '../../server/utils/recommendations/classifyTrustBoundary'
        )

        const testInputs = [
            { evidenceReferences: [], confidence: 'withheld', qualification: 'withheld' },
            { evidenceReferences: [{ claim: 'x', source: null }], confidence: 'high', qualification: 'supported' },
            { evidenceReferences: null, confidence: 'low', qualification: 'low-confidence' },
        ]

        for (const input of testInputs) {
            const result = classifyTrustBoundary(input as Parameters<typeof classifyTrustBoundary>[0])
            expect(RECOMMENDATION_TRUST_BOUNDARY_VALUES).toContain(result)
        }
    })

    test('[P1] classifies withheld confidence as system-generated regardless of evidence', async () => {
        const { classifyTrustBoundary } = await import(
            '../../server/utils/recommendations/classifyTrustBoundary'
        )

        const withEvidence = classifyTrustBoundary({
            evidenceReferences: [
                {
                    claim: 'Some claim',
                    source: { title: 'Source', url: 'https://example.com', type: 'regulation' },
                },
            ],
            confidence: 'withheld',
            qualification: 'withheld',
        })

        expect(withEvidence).toBe('system-generated')
    })
})
