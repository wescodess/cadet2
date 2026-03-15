import type { WorkspaceSummary } from '../../../../shared/types/workspace-summary'

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export function createWorkspaceSummaryRouteProbe(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return {
    dashboardPath: `${normalizedBaseUrl}/workspace`,
    recommendationsPath: `${normalizedBaseUrl}/workspace/recommendations`,
    historyPath: `${normalizedBaseUrl}/workspace/history`,
    intakePath: `${normalizedBaseUrl}/workspace/intake`,
    comparePath: (runA: string, runB: string) =>
      `${normalizedBaseUrl}/workspace/compare?runA=${encodeURIComponent(runA)}&runB=${encodeURIComponent(runB)}`,
  }
}

export function createWorkspaceSummaryFixture(overrides: Partial<WorkspaceSummary> = {}): WorkspaceSummary {
  return {
    state: 'compare-latest-runs',
    draft: {
      exists: true,
      savedAt: '2026-03-11T16:30:00.000Z',
      currentSection: 'goals',
      currentSectionLabel: 'Planning goals',
    },
    latestRun: {
      id: 'run_story44_latest',
      profileSnapshotId: 'snapshot_story44_latest',
      status: 'completed',
      statusMessage: 'Recommendation evaluation completed.',
      resumable: false,
      createdAt: '2026-03-11T17:00:00.000Z',
      updatedAt: '2026-03-11T17:05:00.000Z',
      recommendationCount: 3,
      isAvailable: true,
      profileSnapshotSummary: 'CLB 9, software engineer, Ontario preference, 18-month target.',
      refreshedFromRunId: 'run_story44_previous',
      previousProfileSnapshotId: 'snapshot_story44_previous',
      refreshRootRunId: 'run_story44_previous',
      refreshSequence: 1,
    },
    latestReviewRun: {
      id: 'run_story44_latest',
      profileSnapshotId: 'snapshot_story44_latest',
      status: 'completed',
      statusMessage: 'Recommendation evaluation completed.',
      resumable: false,
      createdAt: '2026-03-11T17:00:00.000Z',
      updatedAt: '2026-03-11T17:05:00.000Z',
      recommendationCount: 3,
      isAvailable: true,
      profileSnapshotSummary: 'CLB 9, software engineer, Ontario preference, 18-month target.',
      refreshedFromRunId: 'run_story44_previous',
      previousProfileSnapshotId: 'snapshot_story44_previous',
      refreshRootRunId: 'run_story44_previous',
      refreshSequence: 1,
    },
    archive: {
      totalRuns: 4,
      availableRuns: 3,
      completedCount: 2,
      degradedCount: 1,
      failedCount: 1,
    },
    comparison: {
      available: true,
      baselineRunId: 'run_story44_previous',
      currentRunId: 'run_story44_latest',
      comparableRunCount: 3,
    },
    timeline: {
      intakeSaved: true,
      latestRunGenerated: true,
      latestComparisonAvailable: true,
      nextStepPlanAvailable: true,
    },
    nextAction: {
      actionKey: 'compare-latest-runs',
      state: 'compare-latest-runs',
      reason: 'Two preserved reviewable runs are available, so you can inspect what changed before acting.',
    },
    lastActivity: {
      label: 'Comparison ready',
      detail: 'The latest preserved planning runs can now be compared side-by-side.',
      occurredAt: '2026-03-11T17:05:00.000Z',
    },
    ...overrides,
  }
}
