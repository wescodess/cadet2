import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'

import type {
  WorkspaceContinuityState,
  WorkspaceSummary,
  WorkspaceSummaryActionKey,
  WorkspaceSummaryActivity,
  WorkspaceSummaryComparison,
  WorkspaceSummaryDraft,
  WorkspaceSummaryRun,
  WorkspaceSummaryRunStatus,
} from '~~/shared/types/workspace-summary'

import { createConvexAdminClient } from '../convex-admin-client'
import {
  buildRecommendationRunHistorySummary,
  loadRecommendationProfileSnapshotMap,
  toRecommendationRunHistoryStatus,
  type RecommendationProfileSnapshotPresentation,
} from '../recommendations/recommendationRunHistory'
import {
  getDefaultStatusMessage,
  isCanonicalRecommendationStatus,
  isInProgressStatus,
  normalizeStatusResponse,
  toIsoString,
} from '../recommendations/lifecycle'
import { readRecommendationResultsForUser } from '../recommendations/readRecommendationResultsForUser'

type WorkspaceRunRecord = {
  hasRankedPayload?: boolean
  recommendationCount?: number
  runId: string
  profileSnapshotId: string
  refreshedFromRunId?: string
  previousProfileSnapshotId?: string
  refreshRootRunId?: string
  refreshSequence?: number
  status: string
  statusMessage?: string
  resumable?: boolean
  processingHeartbeatAt?: number | string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

type IntakeDraftRow = {
  updatedAt: Date | string
  currentSection: string
}

const intakeSectionLabels: Record<string, string> = {
  personal: 'Personal profile',
  education: 'Education history',
  work: 'Work experience',
  immigration: 'Immigration profile',
  goals: 'Planning goals',
}

function toTimestamp(value: string | null) {
  if (!value) {
    return 0
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function sortRunsNewestFirst(runs: WorkspaceRunRecord[]) {
  return [...runs].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

function resolveRunStatus(value: string): WorkspaceSummaryRunStatus {
  return isCanonicalRecommendationStatus(value) ? value : 'queued'
}

function buildDefaultProfileSnapshotSummary(
  snapshot: RecommendationProfileSnapshotPresentation | null | undefined,
) {
  return snapshot?.summary || 'Profile snapshot preserved for this planning cycle.'
}

function buildWorkspaceRunSummary(input: {
  run: WorkspaceRunRecord
  snapshot: RecommendationProfileSnapshotPresentation | null | undefined
}): WorkspaceSummaryRun {
  const status = resolveRunStatus(input.run.status)
  const normalizedStatus = normalizeStatusResponse({
    runId: input.run.runId,
    profileSnapshotId: input.run.profileSnapshotId,
    refreshedFromRunId: input.run.refreshedFromRunId,
    previousProfileSnapshotId: input.run.previousProfileSnapshotId,
    refreshRootRunId: input.run.refreshRootRunId,
    refreshSequence: input.run.refreshSequence,
    status,
    statusMessage: input.run.statusMessage || getDefaultStatusMessage(status),
    resumable: typeof input.run.resumable === 'boolean'
      ? input.run.resumable
      : isInProgressStatus(status),
    processingHeartbeatAt: input.run.processingHeartbeatAt,
    createdAt: input.run.createdAt,
    updatedAt: input.run.updatedAt,
  })

  return {
    id: normalizedStatus.runId,
    profileSnapshotId: normalizedStatus.profileSnapshotId,
    status: normalizedStatus.status,
    statusMessage: normalizedStatus.statusMessage,
    resumable: normalizedStatus.resumable,
    createdAt: normalizedStatus.createdAt,
    updatedAt: normalizedStatus.updatedAt,
    recommendationCount: input.run.recommendationCount || 0,
    isAvailable: Boolean(input.run.hasRankedPayload),
    profileSnapshotSummary: buildDefaultProfileSnapshotSummary(input.snapshot),
    refreshedFromRunId: normalizedStatus.refreshedFromRunId,
    previousProfileSnapshotId: normalizedStatus.previousProfileSnapshotId,
    refreshRootRunId: normalizedStatus.refreshRootRunId,
    refreshSequence: normalizedStatus.refreshSequence,
  }
}

function buildReviewRunSummary(input: {
  run: WorkspaceRunRecord
  snapshot: RecommendationProfileSnapshotPresentation | null | undefined
  isLatest: boolean
}) {
  const historySummary = buildRecommendationRunHistorySummary({
    run: input.run,
    recommendationCount: input.run.recommendationCount || 0,
    isLatest: input.isLatest,
    isAvailable: Boolean(input.run.hasRankedPayload),
    profileSnapshot: input.snapshot,
  })

  const baseSummary = buildWorkspaceRunSummary({
    run: input.run,
    snapshot: input.snapshot,
  })

  return {
    ...baseSummary,
    createdAt: historySummary.createdAt,
    recommendationCount: historySummary.recommendationCount,
    isAvailable: historySummary.isAvailable,
    profileSnapshotSummary: historySummary.profileSnapshotSummary,
  }
}

async function loadDraftSummary(userId: string): Promise<WorkspaceSummaryDraft> {
  const result = await db.execute(sql`
    SELECT
      "updatedAt",
      "currentSection"
    FROM "intake_draft"
    WHERE "userId" = ${userId}
    LIMIT 1;
  `)

  const row = ((result as { rows?: IntakeDraftRow[] }).rows || [])[0]
  if (!row) {
    return {
      exists: false,
      savedAt: null,
      currentSection: null,
      currentSectionLabel: null,
    }
  }

  return {
    exists: true,
    savedAt: toIsoString(row.updatedAt),
    currentSection: row.currentSection,
    currentSectionLabel: intakeSectionLabels[row.currentSection] || 'Saved intake draft',
  }
}

async function loadNextStepPlanAvailability(input: {
  userId: string
  latestReviewRun: WorkspaceSummaryRun | null
}) {
  if (!input.latestReviewRun?.isAvailable) {
    return false
  }

  const result = await readRecommendationResultsForUser({
    runId: input.latestReviewRun.id,
    userId: input.userId,
  })

  if (result.state !== 'ready' || !result.hasRankedPayload) {
    return false
  }

  const candidates = [
    ...result.record.results.direct,
    ...result.record.results.blocked,
    ...result.record.results.composed,
  ]

  return candidates.some(candidate =>
    candidate.nextStepPlan.summary.trim().length > 0
    || candidate.nextStepPlan.steps.length > 0,
  )
}

function buildArchiveSummary(runs: WorkspaceRunRecord[]) {
  const archiveRuns = runs.filter(run => Boolean(toRecommendationRunHistoryStatus(run.status)))

  return {
    totalRuns: archiveRuns.length,
    availableRuns: archiveRuns.filter(run => Boolean(run.hasRankedPayload)).length,
    completedCount: archiveRuns.filter(run => run.status === 'completed').length,
    degradedCount: archiveRuns.filter(run => run.status === 'degraded').length,
    failedCount: archiveRuns.filter(run => run.status === 'failed').length,
  }
}

function resolveComparisonSummary(input: {
  latestRun: WorkspaceSummaryRun | null
  reviewRuns: WorkspaceSummaryRun[]
}): WorkspaceSummaryComparison {
  const current = input.reviewRuns[0] || null
  const baseline = input.reviewRuns[1] || null
  const latestRunIsCurrentReviewRun = Boolean(
    input.latestRun
    && current
    && input.latestRun.id === current.id,
  )

  if (!latestRunIsCurrentReviewRun) {
    return {
      available: false,
      baselineRunId: null,
      currentRunId: null,
      comparableRunCount: input.reviewRuns.length,
    }
  }

  return {
    available: Boolean(current && baseline),
    baselineRunId: baseline?.id || null,
    currentRunId: current?.id || null,
    comparableRunCount: input.reviewRuns.length,
  }
}

function resolveWorkspaceState(input: {
  draft: WorkspaceSummaryDraft
  latestRun: WorkspaceSummaryRun | null
  latestReviewRun: WorkspaceSummaryRun | null
  comparison: WorkspaceSummaryComparison
}) {
  if (!input.latestRun) {
    return input.draft.exists ? 'resume-intake' : 'first-run'
  }

  if (input.draft.exists && toTimestamp(input.draft.savedAt) > toTimestamp(input.latestRun.updatedAt)) {
    return 'resume-intake'
  }

  if (input.comparison.available) {
    return 'compare-latest-runs'
  }

  if (input.latestRun) {
    return 'review-latest-run'
  }

  return 'refresh-plan'
}

function buildNextAction(input: {
  state: WorkspaceContinuityState
  latestRun: WorkspaceSummaryRun | null
  latestReviewRun: WorkspaceSummaryRun | null
}): {
  actionKey: WorkspaceSummaryActionKey
  state: WorkspaceContinuityState
  reason: string
} {
  if (
    (input.state === 'review-latest-run' || input.state === 'refresh-plan')
    && input.latestRun
    && (!input.latestReviewRun || input.latestRun.id !== input.latestReviewRun.id)
  ) {
    return {
      actionKey: 'review-latest-run',
      state: input.state,
      reason: 'Your latest planning cycle is newer than the preserved review set, so reopen it from the workspace to track the current status safely.',
    }
  }

  switch (input.state) {
    case 'first-run':
      return {
        actionKey: 'start-intake',
        state: input.state,
        reason: 'Start your first guided intake to establish a reusable planning workspace.',
      }
    case 'resume-intake':
      return {
        actionKey: 'resume-intake',
        state: input.state,
        reason: 'A saved intake draft exists, so the most direct next step is to continue refining it.',
      }
    case 'compare-latest-runs':
      return {
        actionKey: 'compare-latest-runs',
        state: input.state,
        reason: 'Two preserved reviewable runs are available, so you can inspect what changed before acting.',
      }
    case 'review-latest-run':
      return {
        actionKey: 'review-latest-run',
        state: input.state,
        reason: 'Your latest reviewable recommendation run is ready to reopen from the workspace.',
      }
    case 'refresh-plan':
      return {
        actionKey: 'refresh-plan',
        state: input.state,
        reason: 'Your workspace has history but needs a fresh planning cycle to move forward safely.',
      }
  }
}

function buildLastActivity(input: {
  state: WorkspaceContinuityState
  draft: WorkspaceSummaryDraft
  latestRun: WorkspaceSummaryRun | null
  comparison: WorkspaceSummaryComparison
}): WorkspaceSummaryActivity {
  if (input.draft.exists && toTimestamp(input.draft.savedAt) >= toTimestamp(input.latestRun?.updatedAt || null)) {
    return {
      label: 'Draft updated',
      detail: input.draft.currentSectionLabel
        ? `Saved progress is waiting in ${input.draft.currentSectionLabel}.`
        : 'Saved intake progress is ready to resume.',
      occurredAt: input.draft.savedAt,
    }
  }

  if (input.comparison.available && input.latestRun) {
    return {
      label: 'Comparison ready',
      detail: 'The latest preserved planning runs can now be compared side-by-side.',
      occurredAt: input.latestRun.updatedAt,
    }
  }

  if (input.latestRun) {
    return {
      label: 'Latest run updated',
      detail: input.latestRun.statusMessage,
      occurredAt: input.latestRun.updatedAt,
    }
  }

  return {
    label: 'Workspace ready',
    detail: 'Start a planning cycle to create your first reusable workspace record.',
    occurredAt: null,
  }
}

export async function buildWorkspaceSummary(input: { userId: string }): Promise<WorkspaceSummary> {
  const convex = await createConvexAdminClient()
  const runs = sortRunsNewestFirst(
    await convex.query(
      (anyApi as any).recommendationRuns.listForUser,
      { userId: input.userId },
    ) as WorkspaceRunRecord[],
  )

  const draft = await loadDraftSummary(input.userId)
  const snapshotMap = await loadRecommendationProfileSnapshotMap({
    userId: input.userId,
    snapshotIds: runs.map(run => run.profileSnapshotId),
  })

  const latestRunRecord = runs[0] || null
  const reviewableRunRecords = runs.filter((run) => {
    return (run.status === 'completed' || run.status === 'degraded') && Boolean(run.hasRankedPayload)
  })

  const latestRun = latestRunRecord
    ? buildWorkspaceRunSummary({
        run: latestRunRecord,
        snapshot: snapshotMap.get(latestRunRecord.profileSnapshotId),
      })
    : null

  const latestReviewRun = reviewableRunRecords[0]
    ? buildReviewRunSummary({
        run: reviewableRunRecords[0],
        snapshot: snapshotMap.get(reviewableRunRecords[0].profileSnapshotId),
        isLatest: reviewableRunRecords[0].runId === latestRunRecord?.runId,
      })
    : null

  const reviewRunSummaries = reviewableRunRecords.map((run, index) =>
    buildReviewRunSummary({
      run,
      snapshot: snapshotMap.get(run.profileSnapshotId),
      isLatest: index === 0,
    }),
  )

  const comparison = resolveComparisonSummary({
    latestRun,
    reviewRuns: reviewRunSummaries,
  })
  const state = resolveWorkspaceState({
    draft,
    latestRun,
    latestReviewRun,
    comparison,
  })

  const timeline = {
    intakeSaved: draft.exists,
    latestRunGenerated: Boolean(latestRun),
    latestComparisonAvailable: comparison.available,
    nextStepPlanAvailable: await loadNextStepPlanAvailability({
      userId: input.userId,
      latestReviewRun,
    }),
  }

  return {
    state,
    draft,
    latestRun,
    latestReviewRun,
    archive: buildArchiveSummary(runs),
    comparison,
    timeline,
    nextAction: buildNextAction({
      state,
      latestRun,
      latestReviewRun,
    }),
    lastActivity: buildLastActivity({
      state,
      draft,
      latestRun,
      comparison,
    }),
  }
}
