import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  recommendationReviewActionInputSchema,
} from '../../../../utils/recommendations/recommendationReviewSchema'
import { setRecommendationRunReviewState } from '../../../../utils/recommendations/recommendationReviewStateService'

export default defineEventHandler(async (event) => {
  const { session, userId } = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
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

  const review = await setRecommendationRunReviewState({
    runId,
    reviewState: 'resolved',
    reason: parsed.data.reason,
    actor: {
      userId,
      email: session.user.email,
    },
  })

  return {
    ok: true,
    runId,
    reviewState: review?.reviewState || 'resolved',
    reason: review?.reason || parsed.data.reason,
    updatedAt: review?.updatedAt || new Date().toISOString(),
  }
})
