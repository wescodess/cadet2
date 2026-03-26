import { getRouterParam } from 'h3'

import { recordGovernanceAction } from '../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  recommendationReviewActionInputSchema,
} from '../../../../utils/recommendations/recommendationReviewSchema'
import {
  loadRecommendationRunReviewStateMap,
  setRecommendationRunReviewState,
} from '../../../../utils/recommendations/recommendationReviewStateService'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
  const { session, userId } = adminSession
  const runId = getRouterParam(event, 'runId')?.trim() || ''

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'runId is required',
    })
  }

  const body = await readBody<unknown>(event)
  const parsed = recommendationReviewActionInputSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid reason: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const before = (await loadRecommendationRunReviewStateMap([runId])).get(runId) || null
  const review = await setRecommendationRunReviewState({
    runId,
    reviewState: 'flagged',
    reason: parsed.data.reason,
    actor: {
      userId,
      email: session.user.email,
    },
  })

  await recordGovernanceAction(event, {
    actionType: 'RECOMMENDATION_FLAGGED',
    entityType: 'RECOMMENDATION_RUN',
    entityId: runId,
    entityLabel: `Recommendation run ${runId}`,
    changeContext: {
      before,
      after: review ? {
        reviewState: review.reviewState,
        reason: review.reason,
        actorUserId: review.actorUserId,
        actorEmail: review.actorEmail,
        updatedAt: review.updatedAt,
      } : null,
    },
    reason: parsed.data.reason,
  }, adminSession)

  return {
    ok: true,
    runId,
    reviewState: review?.reviewState || 'flagged',
    reason: review?.reason || parsed.data.reason,
    updatedAt: review?.updatedAt || new Date().toISOString(),
  }
})
