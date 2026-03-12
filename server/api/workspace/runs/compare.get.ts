import type { RecommendationRunComparisonRunMeta, RecommendationRunComparisonStatus } from '~~/shared/types/recommendation-run-comparison'

import { anyApi } from 'convex/server'
import { getQuery } from 'h3'

import { requireWorkspaceUserSession } from '../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../utils/convex-admin-client'
import { buildRunComparison } from '../../../utils/recommendations/buildRunComparison'
import { loadRecommendationProfileSnapshotRecordMap, toRecommendationRunHistoryStatus } from '../../../utils/recommendations/recommendationRunHistory'
import { readRecommendationResultsForUser } from '../../../utils/recommendations/readRecommendationResultsForUser'

type RecommendationRunRecord = {
  hasRankedPayload?: boolean
  recommendationCount?: number
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

function toIsoString(value: number | string | Date) {
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function normalizeRunMeta(run: RecommendationRunRecord): RecommendationRunComparisonRunMeta {
  return {
    id: run.runId,
    createdAt: toIsoString(run.createdAt),
    status: (toRecommendationRunHistoryStatus(run.status) || 'completed') as RecommendationRunComparisonStatus,
    profileSnapshotId: run.profileSnapshotId,
    recommendationCount: run.recommendationCount || 0,
  }
}

function buildUnavailablePayload(input: {
  baselineMeta: RecommendationRunComparisonRunMeta
  currentMeta: RecommendationRunComparisonRunMeta
  reason: string
}) {
  return {
    runs: {
      baseline: input.baselineMeta,
      current: input.currentMeta,
    },
    summary: {
      added: 0,
      removed: 0,
      changed: 0,
      overallConfidenceChange: 0,
      newEvidenceCount: 0,
    },
    pathwayChanges: [],
    trustChanges: [],
    caveatChanges: {
      added: [],
      removed: [],
    },
    profileDelta: null,
    comparisonAvailable: false,
    unavailableReason: input.reason,
  }
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const query = getQuery(event)
  const runA = typeof query.runA === 'string' ? query.runA.trim() : ''
  const runB = typeof query.runB === 'string' ? query.runB.trim() : ''

  if (!runA || !runB) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Both runA and runB query parameters are required.',
    })
  }

  const convex = await createConvexAdminClient()
  const runs = await convex.query(
    (anyApi as any).recommendationRuns.listForUser,
    { userId },
  ) as RecommendationRunRecord[]

  const firstRun = runs.find(run => run.runId === runA) || null
  const secondRun = runs.find(run => run.runId === runB) || null

  if (!firstRun || !secondRun) {
    const fallbackMeta = normalizeRunMeta({
      runId: runA || 'unknown-run-a',
      profileSnapshotId: firstRun?.profileSnapshotId || '',
      status: 'failed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recommendationCount: 0,
    })
    const currentMeta = normalizeRunMeta({
      runId: runB || 'unknown-run-b',
      profileSnapshotId: secondRun?.profileSnapshotId || '',
      status: 'failed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      recommendationCount: 0,
    })

    return buildUnavailablePayload({
      baselineMeta: fallbackMeta,
      currentMeta,
      reason: 'One or both runs are unavailable for comparison in this workspace.',
    })
  }

  const [baselineRun, currentRun] = new Date(firstRun.createdAt).getTime() <= new Date(secondRun.createdAt).getTime()
    ? [firstRun, secondRun]
    : [secondRun, firstRun]
  const baselineMeta = normalizeRunMeta(baselineRun)
  const currentMeta = normalizeRunMeta(currentRun)

  if (!baselineRun.hasRankedPayload || !currentRun.hasRankedPayload) {
    return buildUnavailablePayload({
      baselineMeta,
      currentMeta,
      reason: 'Comparison data is unavailable because one or both preserved runs no longer have ranked recommendation payloads.',
    })
  }

  const [baselineLookup, currentLookup] = await Promise.all([
    readRecommendationResultsForUser({
      userId,
      runId: baselineRun.runId,
    }),
    readRecommendationResultsForUser({
      userId,
      runId: currentRun.runId,
    }),
  ])

  if (
    baselineLookup.state !== 'ready'
    || currentLookup.state !== 'ready'
    || !baselineLookup.hasRankedPayload
    || !currentLookup.hasRankedPayload
  ) {
    return buildUnavailablePayload({
      baselineMeta,
      currentMeta,
      reason: 'Comparison data could not be generated for the selected runs.',
    })
  }

  const snapshotMap = await loadRecommendationProfileSnapshotRecordMap({
    userId,
    snapshotIds: [baselineRun.profileSnapshotId, currentRun.profileSnapshotId],
  })

  return buildRunComparison({
    baseline: baselineLookup.record,
    current: currentLookup.record,
    baselineMeta,
    currentMeta,
    baselineSnapshot: snapshotMap.get(baselineRun.profileSnapshotId)?.submittedPayload,
    currentSnapshot: snapshotMap.get(currentRun.profileSnapshotId)?.submittedPayload,
  })
})
