export type RecommendationRunHistoryStatus = 'completed' | 'degraded' | 'failed'
export type RecommendationRunHistoryResultType = 'direct' | 'blocked' | 'composed'
export type RecommendationRunHistoryTrustBoundary = 'source-backed' | 'inferred' | 'system-generated'
export type RecommendationRunHistoryCitationSourceType = 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
export type RecommendationRunHistoryFreshness = 'fresh' | 'stale' | 'unknown'

export type RecommendationRunHistorySummary = {
  id: string
  status: RecommendationRunHistoryStatus
  recommendationCount: number
  profileSnapshotSummary: string
  createdAt: string
  isLatest: boolean
  isAvailable: boolean
  unavailableReason?: string
}

export type RecommendationRunHistoryCitation = {
  citationId: string
  claimText: string
  sourceTitle: string
  sourceUrl: string
  sourceType: RecommendationRunHistoryCitationSourceType
  excerpt: string
  retrievalDate: string
  freshness: RecommendationRunHistoryFreshness
}

export type RecommendationRunHistoryStep = {
  sequence: number
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
}

export type RecommendationRunHistoryCandidate = {
  pathwayId: string
  title: string
  type: RecommendationRunHistoryResultType
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  qualification: 'supported' | 'low-confidence' | 'withheld'
  summary: string
  trustBoundary: RecommendationRunHistoryTrustBoundary
  caveat: string
  citations: RecommendationRunHistoryCitation[]
  nextStepPlan: {
    summary: string
    steps: RecommendationRunHistoryStep[]
    limitation: string
  }
}

export type RecommendationRunHistoryDetailResponse =
  | {
      available: false
      reason: string
    }
  | {
      available: true
      run: RecommendationRunHistorySummary & {
        profileSnapshotId: string
      }
      profileSnapshot: {
        id: string
        summary: string
        capturedAt: string
        keyFactors: string[]
      }
      results: {
        direct: RecommendationRunHistoryCandidate[]
        blocked: RecommendationRunHistoryCandidate[]
        composed: RecommendationRunHistoryCandidate[]
      }
      comparison: {
        mode: 'workspace'
        summary: string
        groups: Array<{
          key: RecommendationRunHistoryResultType
          label: string
          description: string
          count: number
        }>
        visibleGroupCount: number
        totalCandidateCount: number
      }
    }

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export function createRecommendationRunHistoryRouteProbe(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return {
    historyPath: `${normalizedBaseUrl}/workspace/history`,
    historyApiPath: `${normalizedBaseUrl}/api/workspace/runs`,
    historyApiPathWithStatus: (status: RecommendationRunHistoryStatus) =>
      `${normalizedBaseUrl}/api/workspace/runs?status=${encodeURIComponent(status)}`,
    historyRunApiPath: (runId: string) =>
      `${normalizedBaseUrl}/api/workspace/runs/${encodeURIComponent(runId)}`,
    recommendationReviewPath: (runId: string) =>
      `${normalizedBaseUrl}/workspace/recommendations/${encodeURIComponent(runId)}`,
    intakePath: `${normalizedBaseUrl}/workspace/intake`,
    authPath: `${normalizedBaseUrl}/auth`,
  }
}

export function createRecommendationRunHistorySummary(
  overrides: Partial<RecommendationRunHistorySummary> = {},
): RecommendationRunHistorySummary {
  return {
    id: overrides.id || 'run_story42_history_latest',
    status: overrides.status || 'completed',
    recommendationCount: overrides.recommendationCount ?? 3,
    profileSnapshotSummary: overrides.profileSnapshotSummary || 'CLB 9, software engineer, Ontario preference, 18-month target.',
    createdAt: overrides.createdAt || new Date('2026-03-08T15:00:00.000Z').toISOString(),
    isLatest: overrides.isLatest ?? true,
    isAvailable: overrides.isAvailable ?? true,
    unavailableReason: overrides.unavailableReason,
  }
}

export function createRecommendationRunHistoryCitation(
  overrides: Partial<RecommendationRunHistoryCitation> = {},
): RecommendationRunHistoryCitation {
  return {
    citationId: overrides.citationId || 'citation_story42_001',
    claimText: overrides.claimText || 'CLB 9 aligns with current federal skilled worker language thresholds.',
    sourceTitle: overrides.sourceTitle || 'IRCC language requirement reference',
    sourceUrl: overrides.sourceUrl || 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html',
    sourceType: overrides.sourceType || 'regulation',
    excerpt: overrides.excerpt || 'Applicants must demonstrate language ability at the required benchmark before submission.',
    retrievalDate: overrides.retrievalDate || '2026-03-05',
    freshness: overrides.freshness || 'fresh',
  }
}

export function createRecommendationRunHistoryCandidate(
  overrides: Partial<RecommendationRunHistoryCandidate> = {},
): RecommendationRunHistoryCandidate {
  return {
    pathwayId: overrides.pathwayId || 'mvp-skilled-worker',
    title: overrides.title || 'Skilled Worker pathway',
    type: overrides.type || 'direct',
    confidence: overrides.confidence || 'high',
    qualification: overrides.qualification || 'supported',
    summary: overrides.summary || 'Direct pathway with enough language and work experience evidence to move forward soon.',
    trustBoundary: overrides.trustBoundary || 'source-backed',
    caveat: overrides.caveat || 'Confirm the most recent draw thresholds before filing.',
    citations: overrides.citations || [createRecommendationRunHistoryCitation()],
    nextStepPlan: overrides.nextStepPlan || {
      summary: 'Package the strongest evidence first, then validate current thresholds before submission prep.',
      steps: [
        {
          sequence: 1,
          title: 'Gather language proof',
          detail: 'Upload the latest CLB-aligned language report and keep the score report reference handy.',
          priority: 'now',
        },
        {
          sequence: 2,
          title: 'Review profile evidence',
          detail: 'Confirm work history dates and employer letters are aligned before the next recommendation refresh.',
          priority: 'next',
        },
      ],
      limitation: 'Monitor federal draw thresholds because they can shift between refreshes.',
    },
  }
}

export function createRecommendationRunHistoryListFixture() {
  return [
    createRecommendationRunHistorySummary(),
    createRecommendationRunHistorySummary({
      id: 'run_story42_history_degraded',
      status: 'degraded',
      createdAt: new Date('2026-02-19T14:15:00.000Z').toISOString(),
      isLatest: false,
      profileSnapshotSummary: 'CLB 8, operations manager, Alberta preference, immediate timeline.',
    }),
    createRecommendationRunHistorySummary({
      id: 'run_story42_history_unavailable',
      status: 'failed',
      createdAt: new Date('2026-01-24T09:45:00.000Z').toISOString(),
      isLatest: false,
      isAvailable: false,
      recommendationCount: 0,
      profileSnapshotSummary: 'CLB 7, project coordinator, broad location preference, 24-month target.',
      unavailableReason: 'Archived data expired after retention window.',
    }),
  ]
}

export function createRecommendationRunHistoryDetail(
  run: RecommendationRunHistorySummary = createRecommendationRunHistorySummary(),
  overrides: Partial<Extract<RecommendationRunHistoryDetailResponse, { available: true }>> = {},
): Extract<RecommendationRunHistoryDetailResponse, { available: true }> {
  const direct = overrides.results?.direct || [
    createRecommendationRunHistoryCandidate(),
  ]
  const blocked = overrides.results?.blocked || [
    createRecommendationRunHistoryCandidate({
      pathwayId: 'mvp-provincial-nominee',
      title: 'Provincial Nominee pathway',
      type: 'blocked',
      confidence: 'medium',
      qualification: 'low-confidence',
      summary: 'Potential route, but current employer evidence is not yet strong enough.',
      trustBoundary: 'inferred',
      caveat: 'Nominee criteria may change; verify with province-specific guidance.',
      nextStepPlan: {
        summary: 'Close the employer-evidence gap before relying on this route.',
        steps: [
          {
            sequence: 1,
            title: 'Request employer letter',
            detail: 'Ask for a detailed role letter that maps duties to the current NOC.',
            priority: 'now',
          },
        ],
        limitation: 'Do not treat this route as submission-ready until employer proof is complete.',
      },
    }),
  ]
  const composed = overrides.results?.composed || [
    createRecommendationRunHistoryCandidate({
      pathwayId: 'mvp-study-to-work',
      title: 'Study-to-Work pathway',
      type: 'composed',
      confidence: 'medium',
      qualification: 'supported',
      summary: 'Longer-horizon route that sequences study and work authorization milestones.',
      trustBoundary: 'system-generated',
      caveat: 'Program availability depends on school intake cycles and permit processing windows.',
      citations: [],
      nextStepPlan: {
        summary: 'Treat this as a staged option rather than an immediate application route.',
        steps: [
          {
            sequence: 1,
            title: 'Compare program options',
            detail: 'Shortlist programs with co-op alignment and monitor intake deadlines.',
            priority: 'later',
          },
        ],
        limitation: 'This scenario is strategic guidance and needs direct school/program validation.',
      },
    }),
  ]

  const groups = [
    {
      key: 'direct' as const,
      label: 'Available now',
      description: 'Routes you can act on soonest.',
      count: direct.length,
    },
    {
      key: 'blocked' as const,
      label: 'Blocked but close',
      description: 'Routes that need a blocker resolved first.',
      count: blocked.length,
    },
    {
      key: 'composed' as const,
      label: 'Longer-horizon',
      description: 'Routes that unfold in stages over time.',
      count: composed.length,
    },
  ]

  return {
    available: true,
    run: {
      ...run,
      profileSnapshotId: overrides.run?.profileSnapshotId || `${run.id}_snapshot`,
    },
    profileSnapshot: overrides.profileSnapshot || {
      id: `${run.id}_snapshot`,
      summary: run.profileSnapshotSummary,
      capturedAt: run.createdAt,
      keyFactors: ['language benchmark', 'occupation history', 'location preference'],
    },
    results: {
      direct,
      blocked,
      composed,
    },
    comparison: overrides.comparison || {
      mode: 'workspace',
      summary: 'Compare this archived recommendation set against the profile captured at that point in time.',
      groups,
      visibleGroupCount: groups.length,
      totalCandidateCount: direct.length + blocked.length + composed.length,
    },
  }
}

export function createUnavailableRecommendationRunHistoryDetail(
  reason = 'Archived recommendation payload is no longer available in the workspace retention window.',
): Extract<RecommendationRunHistoryDetailResponse, { available: false }> {
  return {
    available: false,
    reason,
  }
}
