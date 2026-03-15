export type WorkspaceContinuityState =
  | 'first-run'
  | 'resume-intake'
  | 'review-latest-run'
  | 'compare-latest-runs'
  | 'refresh-plan'

export type WorkspaceSummaryActionKey =
  | 'start-intake'
  | 'resume-intake'
  | 'review-latest-run'
  | 'compare-latest-runs'
  | 'refresh-plan'
  | 'start-new-cycle'
  | 'open-history'

export type WorkspaceSummaryRunStatus = 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
export type WorkspaceSummaryArchiveStatus = 'completed' | 'degraded' | 'failed'

export type WorkspaceSummaryRun = {
  id: string
  profileSnapshotId: string
  status: WorkspaceSummaryRunStatus
  statusMessage: string
  resumable: boolean
  createdAt: string
  updatedAt: string
  recommendationCount: number
  isAvailable: boolean
  profileSnapshotSummary: string
  refreshedFromRunId?: string
  previousProfileSnapshotId?: string
  refreshRootRunId?: string
  refreshSequence?: number
}

export type WorkspaceSummaryDraft = {
  exists: boolean
  savedAt: string | null
  currentSection: string | null
  currentSectionLabel: string | null
}

export type WorkspaceSummaryArchive = {
  totalRuns: number
  availableRuns: number
  completedCount: number
  degradedCount: number
  failedCount: number
}

export type WorkspaceSummaryComparison = {
  available: boolean
  baselineRunId: string | null
  currentRunId: string | null
  comparableRunCount: number
}

export type WorkspaceSummaryTimeline = {
  intakeSaved: boolean
  latestRunGenerated: boolean
  latestComparisonAvailable: boolean
  nextStepPlanAvailable: boolean
}

export type WorkspaceSummaryNextAction = {
  actionKey: WorkspaceSummaryActionKey
  state: WorkspaceContinuityState
  reason: string
}

export type WorkspaceSummaryActivity = {
  label: string
  detail: string
  occurredAt: string | null
}

export type WorkspaceSummary = {
  state: WorkspaceContinuityState
  draft: WorkspaceSummaryDraft
  latestRun: WorkspaceSummaryRun | null
  latestReviewRun: WorkspaceSummaryRun | null
  archive: WorkspaceSummaryArchive
  comparison: WorkspaceSummaryComparison
  timeline: WorkspaceSummaryTimeline
  nextAction: WorkspaceSummaryNextAction
  lastActivity: WorkspaceSummaryActivity
}
