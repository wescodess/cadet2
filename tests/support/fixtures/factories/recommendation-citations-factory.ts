// Factory types and builders for recommendation citation and trust-boundary test fixtures.
// See also: server/utils/recommendations/buildRecommendationCitations.ts
// See also: server/utils/recommendations/classifyTrustBoundary.ts

import { faker } from '@faker-js/faker'

// ── Citation types ──────────────────────────────────────────────────────

export type RecommendationCitationSourceType = 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'

export type RecommendationCitation = {
    citationId: string
    claimText: string
    sourceTitle: string
    sourceUrl: string
    sourceType: RecommendationCitationSourceType
    excerpt: string
    retrievalDate: string
    freshness: 'fresh' | 'stale' | 'unknown'
}

export type RecommendationSourceContext = {
    citationId: string
    fullExcerpt: string
    retrievalDate: string
    sourceTitle: string
    sourceUrl: string
    sourceType: RecommendationCitationSourceType
}

// ── Trust-boundary types ────────────────────────────────────────────────

export type RecommendationTrustBoundary = 'source-backed' | 'inferred' | 'system-generated'

// ── Extended candidate type with citations ──────────────────────────────

export type RecommendationCitationsResultsResponse = {
    runId: string
    profileSnapshotId: string
    status: 'completed' | 'degraded' | 'failed'
    results: {
        direct: RecommendationCandidateWithCitations[]
        blocked: RecommendationCandidateWithCitations[]
        composed: RecommendationCandidateWithCitations[]
    }
    comparison: unknown
    noComposedReason?: string
}

export type RecommendationCandidateWithCitations = {
    pathwayId: string
    type: 'direct' | 'blocked' | 'composed'
    rank: number
    tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
    score: number
    rationale: string
    fitSignals: Array<{
        id: string
        label: string
        detail: string
        state: 'strength' | 'watch' | 'gap'
    }>
    qualification: 'supported' | 'low-confidence' | 'withheld'
    confidence: 'high' | 'medium' | 'low' | 'withheld'
    freshness: 'fresh' | 'stale' | 'unknown'
    caveat: string
    blockers: unknown[]
    tradeoffs: unknown[]
    improvementActions: unknown[]
    composedSteps?: string[]
    pathwayType: {
        key: string
        label: string
        description: string
    }
    citations: RecommendationCitation[]
    trustBoundary: RecommendationTrustBoundary
}

// ── Factory functions ───────────────────────────────────────────────────

export function createRecommendationCitationIds(prefix: string) {
    const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    return {
        runId: `${prefix}-run-${seed}`,
        profileSnapshotId: `${prefix}-snapshot-${seed}`,
    }
}

export function createRecommendationCitation(
    overrides: Partial<RecommendationCitation> = {},
): RecommendationCitation {
    return {
        citationId: faker.string.uuid(),
        claimText: faker.lorem.sentence(),
        sourceTitle: `${faker.word.adjective()} Immigration Policy — ${faker.string.alphanumeric(6)}`,
        sourceUrl: faker.internet.url(),
        sourceType: 'regulation',
        excerpt: faker.lorem.paragraph(),
        retrievalDate: new Date().toISOString(),
        freshness: 'fresh',
        ...overrides,
    }
}

export function createRecommendationCitations(count: number): RecommendationCitation[] {
    return Array.from({ length: count }, () => createRecommendationCitation())
}

export function createRecommendationSourceContext(
    citation: RecommendationCitation,
): RecommendationSourceContext {
    return {
        citationId: citation.citationId,
        fullExcerpt: citation.excerpt,
        retrievalDate: citation.retrievalDate,
        sourceTitle: citation.sourceTitle,
        sourceUrl: citation.sourceUrl,
        sourceType: citation.sourceType,
    }
}

export function createCitationEvaluationPayload() {
    return {
        currentSection: 'goals',
        sectionProgress: {
            personal: true,
            education: true,
            work: true,
            immigration: true,
            goals: true,
        },
        fieldValues: {
            personal: {},
            education: {
                highestEducationLevel: 'bachelors',
            },
            work: {
                yearsSkilledExperience: 3,
                hasValidJobOffer: 'no',
            },
            immigration: {
                openToRelocation: 'yes',
                englishClb: 9,
                availableSettlementFundsCad: 30000,
            },
            goals: {
                targetTimelineMonths: 6,
                budgetCad: 12000,
                willingToStudyOrRetrain: 'yes',
            },
        },
    }
}

export function createDegradedCitationEvaluationPayload() {
    return {
        currentSection: 'goals',
        sectionProgress: {
            personal: true,
            education: true,
            work: true,
            immigration: true,
            goals: true,
        },
        fieldValues: {
            personal: {},
            education: {
                highestEducationLevel: 'high-school',
            },
            work: {
                yearsSkilledExperience: 0,
                hasValidJobOffer: 'no',
            },
            immigration: {
                openToRelocation: 'no',
                englishClb: 4,
                availableSettlementFundsCad: 1500,
            },
            goals: {
                targetTimelineMonths: 3,
                budgetCad: 2000,
                willingToStudyOrRetrain: 'no',
            },
        },
    }
}

export function createCandidateWithCitations(
    overrides: Partial<RecommendationCandidateWithCitations> = {},
): RecommendationCandidateWithCitations {
    return {
        pathwayId: 'mvp-skilled-worker',
        type: 'direct',
        rank: 1,
        tier: 'strong-fit',
        score: 88,
        rationale: 'Skilled Worker is ready sooner and still benefits from a small language uplift.',
        fitSignals: [
            {
                id: 'language-readiness',
                label: 'Language readiness',
                detail: 'CLB 9 already clears the current benchmark.',
                state: 'strength',
            },
        ],
        qualification: 'supported',
        confidence: 'high',
        freshness: 'fresh',
        caveat: 'Recheck evidence freshness before final submission.',
        blockers: [],
        tradeoffs: [
            {
                id: 'tradeoff-effort',
                dimension: 'effort',
                summary: 'Requires moderate document assembly and timeline discipline.',
                impact: 'medium',
            },
        ],
        improvementActions: [],
        composedSteps: [],
        pathwayType: {
            key: 'available-now',
            label: 'Available now',
            description: 'Current profile evidence supports action in the near term.',
        },
        citations: [
            createRecommendationCitation({
                claimText: 'CLB 9 already clears the current benchmark.',
                sourceTitle: 'Express Entry Language Requirements — IRCC R-2025',
                sourceType: 'regulation',
                freshness: 'fresh',
            }),
            createRecommendationCitation({
                claimText: 'Skilled Worker pathway accepts 3+ years of experience.',
                sourceTitle: 'Federal Skilled Worker Eligibility Criteria — IRCC P-2024',
                sourceType: 'policy-bulletin',
                freshness: 'fresh',
            }),
        ],
        trustBoundary: 'source-backed',
        ...overrides,
    }
}

export function createCandidateWithInferredTrust(
    overrides: Partial<RecommendationCandidateWithCitations> = {},
): RecommendationCandidateWithCitations {
    return createCandidateWithCitations({
        pathwayId: 'mvp-provincial-nominee',
        type: 'blocked',
        rank: 2,
        tier: 'conditional-fit',
        score: 64,
        qualification: 'low-confidence',
        confidence: 'medium',
        rationale: 'A nomination route is close, but a valid job offer still blocks near-term action.',
        citations: [
            createRecommendationCitation({
                claimText: 'Provincial Nominee Programs may require employer support.',
                sourceTitle: 'PNP General Requirements — IRCC P-2024',
                sourceType: 'policy-bulletin',
                freshness: 'stale',
            }),
        ],
        trustBoundary: 'inferred',
        caveat: 'This pathway ranking includes inferred strategic guidance. Verify current PNP requirements directly.',
        pathwayType: {
            key: 'blocked-but-close',
            label: 'Blocked but close',
            description: 'Needs one or more concrete fixes before it becomes actionable.',
        },
        blockers: [
            {
                id: 'job-offer',
                label: 'Valid job offer requirement',
                detail: 'A valid job offer is still missing for this route.',
                severity: 'critical',
            },
        ],
        ...overrides,
    })
}

export function createCandidateWithSystemGeneratedTrust(
    overrides: Partial<RecommendationCandidateWithCitations> = {},
): RecommendationCandidateWithCitations {
    return createCandidateWithCitations({
        pathwayId: 'mvp-study-to-work',
        type: 'composed',
        rank: 3,
        tier: 'lower-confidence',
        score: 52,
        qualification: 'withheld',
        confidence: 'low',
        rationale: 'A study-first route works as a staged plan when immediate options are constrained.',
        citations: [],
        trustBoundary: 'system-generated',
        caveat: 'This recommendation is system-generated. No specific regulatory citations are available.',
        composedSteps: ['mvp-skilled-worker', 'build-study-budget'],
        pathwayType: {
            key: 'strategic-multi-step',
            label: 'Strategic multi-step',
            description: 'Requires staged milestones instead of immediate execution.',
        },
        ...overrides,
    })
}

export function createCitationsResultsPayload(): {
    direct: RecommendationCandidateWithCitations[]
    blocked: RecommendationCandidateWithCitations[]
    composed: RecommendationCandidateWithCitations[]
} {
    return {
        direct: [createCandidateWithCitations()],
        blocked: [createCandidateWithInferredTrust()],
        composed: [createCandidateWithSystemGeneratedTrust()],
    }
}
