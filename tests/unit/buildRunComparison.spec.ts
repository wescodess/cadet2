import { describe, expect, it } from 'vitest'

import { buildRunComparison } from '../../server/utils/recommendations/buildRunComparison'

function createCandidate(overrides: Record<string, unknown> = {}) {
  return {
    pathwayId: 'mvp-skilled-worker',
    type: 'direct',
    rank: 1,
    tier: 'strong-fit',
    score: 88,
    rationale: 'Strong near-term option.',
    fitSignals: [],
    qualification: 'supported',
    confidence: 'high',
    freshness: 'fresh',
    caveat: 'Review current draw thresholds before filing.',
    blockers: [],
    tradeoffs: [],
    improvementActions: [],
    citations: [
      {
        citationId: 'citation-skilled-worker',
        claimText: 'Language readiness supports near-term action.',
        sourceTitle: 'IRCC',
        sourceUrl: 'https://www.canada.ca',
        sourceType: 'regulation',
        excerpt: 'Current language evidence is sufficient.',
        retrievalDate: '2026-03-01T00:00:00.000Z',
        freshness: 'fresh',
      },
    ],
    trustBoundary: 'source-backed',
    nextStepPlan: {
      summary: 'Prepare filing evidence.',
      steps: [],
      limitation: 'Monitor recent threshold shifts.',
    },
    pathwayType: {
      key: 'available-now',
      label: 'Available now',
      description: 'Current profile evidence supports action in the near term.',
    },
    ...overrides,
  }
}

function createRecord(input: {
  runId: string
  profileSnapshotId: string
  status?: 'completed' | 'degraded' | 'failed'
  direct?: Array<Record<string, unknown>>
  blocked?: Array<Record<string, unknown>>
  composed?: Array<Record<string, unknown>>
}) {
  return {
    runId: input.runId,
    profileSnapshotId: input.profileSnapshotId,
    status: input.status || 'completed',
    results: {
      direct: (input.direct || []).map(candidate => createCandidate(candidate)),
      blocked: (input.blocked || []).map(candidate => createCandidate({
        type: 'blocked',
        tier: 'conditional-fit',
        pathwayType: {
          key: 'blocked-but-close',
          label: 'Blocked but close',
          description: 'One or more blockers still need attention.',
        },
        ...candidate,
      })),
      composed: (input.composed || []).map(candidate => createCandidate({
        type: 'composed',
        tier: 'lower-confidence',
        pathwayType: {
          key: 'strategic-multi-step',
          label: 'Strategic multi-step',
          description: 'A staged route that trades immediate action for a longer-horizon plan.',
        },
        ...candidate,
      })),
    },
    comparison: {
      mode: 'workspace',
      summary: 'Existing comparison payload.',
      groups: [],
      visibleGroupCount: 0,
      totalCandidateCount: 0,
    },
  }
}

describe('buildRunComparison', () => {
  it('detects additions, removals, tier shifts, and profile changes between runs', () => {
    const baseline = createRecord({
      runId: 'run-older',
      profileSnapshotId: 'snapshot-older',
      direct: [
        {
          pathwayId: 'mvp-skilled-worker',
          tier: 'conditional-fit',
          score: 79,
          confidence: 'medium',
          caveat: 'Confirm language score validity.',
        },
      ],
      blocked: [
        {
          pathwayId: 'mvp-provincial-nominee',
          rank: 2,
          score: 62,
          citations: [],
          confidence: 'medium',
          freshness: 'stale',
          trustBoundary: 'inferred',
          caveat: 'Employer letter is still pending.',
        },
      ],
    })

    const current = createRecord({
      runId: 'run-latest',
      profileSnapshotId: 'snapshot-latest',
      direct: [
        {
          pathwayId: 'mvp-skilled-worker',
          rank: 1,
          score: 91,
          confidence: 'high',
          caveat: 'Language evidence is now current.',
          citations: [
            {
              citationId: 'citation-skilled-worker',
              claimText: 'Language readiness supports near-term action.',
              sourceTitle: 'IRCC',
              sourceUrl: 'https://www.canada.ca',
              sourceType: 'regulation',
              excerpt: 'Current language evidence is sufficient.',
              retrievalDate: '2026-03-01T00:00:00.000Z',
              freshness: 'fresh',
            },
            {
              citationId: 'citation-skilled-worker-update',
              claimText: 'Updated language benchmark confirms the stronger fit.',
              sourceTitle: 'IRCC',
              sourceUrl: 'https://www.canada.ca/language-update',
              sourceType: 'policy-bulletin',
              excerpt: 'Updated language benchmark excerpt.',
              retrievalDate: '2026-03-09T00:00:00.000Z',
              freshness: 'fresh',
            },
          ],
        },
        {
          pathwayId: 'mvp-study-to-work',
          rank: 2,
          score: 66,
          confidence: 'medium',
          type: 'direct',
          pathwayType: {
            key: 'available-now',
            label: 'Available now',
            description: 'New route opened after profile changes.',
          },
        },
      ],
    })

    const result = buildRunComparison({
      baseline,
      current,
      baselineMeta: {
        id: baseline.runId,
        createdAt: '2026-03-01T12:00:00.000Z',
        status: 'completed',
        profileSnapshotId: baseline.profileSnapshotId,
        recommendationCount: 2,
      },
      currentMeta: {
        id: current.runId,
        createdAt: '2026-03-09T12:00:00.000Z',
        status: 'completed',
        profileSnapshotId: current.profileSnapshotId,
        recommendationCount: 2,
      },
      baselineSnapshot: {
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
          education: {},
          work: {
            yearsSkilledExperience: 3,
            hasValidJobOffer: 'no',
          },
          immigration: {
            englishClb: 8,
          },
          goals: {
            targetTimelineMonths: 12,
          },
        },
      },
      currentSnapshot: {
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
          education: {},
          work: {
            yearsSkilledExperience: 4,
            hasValidJobOffer: 'yes',
          },
          immigration: {
            englishClb: 9,
          },
          goals: {
            targetTimelineMonths: 6,
          },
        },
      },
    })

    expect(result.comparisonAvailable).toBe(true)
    expect(result.summary.added).toBe(1)
    expect(result.summary.removed).toBe(1)
    expect(result.summary.changed).toBe(3)
    expect(result.pathwayChanges.find(change => change.pathwayId === 'mvp-skilled-worker')?.changeType).toBe('tier-changed')
    expect(result.pathwayChanges.find(change => change.pathwayId === 'mvp-study-to-work')?.changeType).toBe('added')
    expect(result.pathwayChanges.find(change => change.pathwayId === 'mvp-provincial-nominee')?.changeType).toBe('removed')
    expect(result.trustChanges).toHaveLength(1)
    expect(result.trustChanges[0]?.addedEvidence).toHaveLength(1)
    expect(result.trustChanges[0]?.addedEvidence[0]?.sourceTitle).toBe('IRCC')
    expect(result.caveatChanges.added.length + result.caveatChanges.removed.length).toBeGreaterThan(0)
    expect(result.profileDelta?.changedFieldCount).toBeGreaterThan(0)
  })

  it('returns unchanged comparisons when both runs are identical', () => {
    const baseline = createRecord({
      runId: 'run-same-a',
      profileSnapshotId: 'snapshot-a',
      direct: [
        {
          pathwayId: 'mvp-skilled-worker',
        },
      ],
    })

    const current = createRecord({
      runId: 'run-same-b',
      profileSnapshotId: 'snapshot-b',
      direct: [
        {
          pathwayId: 'mvp-skilled-worker',
        },
      ],
    })

    const result = buildRunComparison({
      baseline,
      current,
      baselineMeta: {
        id: baseline.runId,
        createdAt: '2026-03-01T12:00:00.000Z',
        status: 'completed',
        profileSnapshotId: baseline.profileSnapshotId,
        recommendationCount: 1,
      },
      currentMeta: {
        id: current.runId,
        createdAt: '2026-03-09T12:00:00.000Z',
        status: 'completed',
        profileSnapshotId: current.profileSnapshotId,
        recommendationCount: 1,
      },
    })

    expect(result.comparisonAvailable).toBe(true)
    expect(result.summary.changed).toBe(0)
    expect(result.pathwayChanges).toHaveLength(1)
    expect(result.pathwayChanges[0]?.changeType).toBe('unchanged')
    expect(result.trustChanges).toHaveLength(0)
    expect(result.profileDelta?.changedFieldCount || 0).toBe(0)
  })

  it('returns comparison-unavailable when the same run is compared against itself', () => {
    const record = createRecord({
      runId: 'run-identical',
      profileSnapshotId: 'snapshot-identical',
      direct: [
        {
          pathwayId: 'mvp-skilled-worker',
        },
      ],
    })

    const result = buildRunComparison({
      baseline: record,
      current: record,
      baselineMeta: {
        id: record.runId,
        createdAt: '2026-03-01T12:00:00.000Z',
        status: 'completed',
        profileSnapshotId: record.profileSnapshotId,
        recommendationCount: 1,
      },
      currentMeta: {
        id: record.runId,
        createdAt: '2026-03-01T12:00:00.000Z',
        status: 'completed',
        profileSnapshotId: record.profileSnapshotId,
        recommendationCount: 1,
      },
    })

    expect(result.comparisonAvailable).toBe(false)
    expect(result.unavailableReason).toMatch(/same run/i)
    expect(result.pathwayChanges).toHaveLength(0)
  })
})
