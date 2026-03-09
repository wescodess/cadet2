import { test, expect } from '@playwright/test'

import {
    buildRecommendationComparison,
    buildRecommendationPathwayType,
} from '../../server/utils/recommendations/buildRecommendationComparison'

test.describe('buildRecommendationComparison', () => {
    test('returns workspace mode when multiple groups each have at least one candidate', () => {
        const result = buildRecommendationComparison({
            directCount: 1,
            blockedCount: 1,
            composedCount: 1,
        })

        expect(result.mode).toBe('workspace')
        expect(result.visibleGroupCount).toBe(3)
        expect(result.totalCandidateCount).toBe(3)
        expect(result.groups.map(g => g.key)).toEqual(['direct', 'blocked', 'composed'])
        expect(result.limitation).toBeUndefined()
    })

    test('returns workspace mode with two groups when only direct and blocked exist', () => {
        const result = buildRecommendationComparison({
            directCount: 2,
            blockedCount: 1,
            composedCount: 0,
        })

        expect(result.mode).toBe('workspace')
        expect(result.visibleGroupCount).toBe(2)
        expect(result.totalCandidateCount).toBe(3)
        expect(result.groups.map(g => g.key)).toEqual(['direct', 'blocked'])
    })

    test('returns fallback mode when all candidates are in a single group', () => {
        const result = buildRecommendationComparison({
            directCount: 3,
            blockedCount: 0,
            composedCount: 0,
        })

        expect(result.mode).toBe('fallback')
        expect(result.visibleGroupCount).toBe(1)
        expect(result.totalCandidateCount).toBe(3)
        expect(result.limitation).toBeDefined()
        expect(result.limitation).toContain('available-now')
        expect(result.limitation).toContain('same category')
    })

    test('returns fallback mode when only one candidate exists', () => {
        const result = buildRecommendationComparison({
            directCount: 1,
            blockedCount: 0,
            composedCount: 0,
        })

        expect(result.mode).toBe('fallback')
        expect(result.totalCandidateCount).toBe(1)
        expect(result.limitation).toContain('Only one ranked pathway')
    })

    test('returns fallback with noComposedReason when zero candidates', () => {
        const result = buildRecommendationComparison({
            directCount: 0,
            blockedCount: 0,
            composedCount: 0,
            noComposedReason: 'Evaluation failed temporarily.',
        })

        expect(result.mode).toBe('fallback')
        expect(result.totalCandidateCount).toBe(0)
        expect(result.groups).toHaveLength(0)
        expect(result.limitation).toContain('Only one ranked pathway')
    })

    test('filters out empty groups from the groups array', () => {
        const result = buildRecommendationComparison({
            directCount: 2,
            blockedCount: 0,
            composedCount: 1,
        })

        expect(result.groups).toHaveLength(2)
        expect(result.groups.map(g => g.key)).toEqual(['direct', 'composed'])
    })

    test('workspace summary describes comparison capability', () => {
        const result = buildRecommendationComparison({
            directCount: 1,
            blockedCount: 1,
            composedCount: 1,
        })

        expect(result.summary).toContain('Compare')
    })

    test('fallback summary describes limited state', () => {
        const result = buildRecommendationComparison({
            directCount: 1,
            blockedCount: 0,
            composedCount: 0,
        })

        expect(result.summary).toContain('limited')
    })

    test('blocked-only fallback limitation mentions the blocked category', () => {
        const result = buildRecommendationComparison({
            directCount: 0,
            blockedCount: 2,
            composedCount: 0,
        })

        expect(result.mode).toBe('fallback')
        expect(result.limitation).toContain('blocked-but-close')
    })

    test('composed-only fallback limitation mentions the longer-horizon category', () => {
        const result = buildRecommendationComparison({
            directCount: 0,
            blockedCount: 0,
            composedCount: 2,
        })

        expect(result.mode).toBe('fallback')
        expect(result.limitation).toContain('longer-horizon')
    })
})

test.describe('buildRecommendationPathwayType', () => {
    test('maps direct to available-now', () => {
        const result = buildRecommendationPathwayType('direct')

        expect(result.key).toBe('available-now')
        expect(result.label).toBe('Available now')
        expect(result.description).toBeTruthy()
    })

    test('maps blocked to blocked-but-close', () => {
        const result = buildRecommendationPathwayType('blocked')

        expect(result.key).toBe('blocked-but-close')
        expect(result.label).toBe('Blocked but close')
        expect(result.description).toBeTruthy()
    })

    test('maps composed to strategic-multi-step', () => {
        const result = buildRecommendationPathwayType('composed')

        expect(result.key).toBe('strategic-multi-step')
        expect(result.label).toBe('Strategic multi-step')
        expect(result.description).toBeTruthy()
    })
})
