import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../../../utils/auth/requireAdminSession'
import { recommendationReviewCitationFlagInputSchema } from '../../../../../../utils/recommendations/recommendationReviewSchema'
import { getRecommendationReviewDetail } from '../../../../../../utils/recommendations/recommendationReviewService'
import { setRecommendationCitationReviewState } from '../../../../../../utils/recommendations/recommendationReviewStateService'

export default defineEventHandler(async (event) => {
  const { session, userId } = await requireAdminSession(event)
  const runId = getRouterParam(event, 'runId')?.trim() || ''
  const citationId = getRouterParam(event, 'citationId')?.trim() || ''

  if (!runId || !citationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'runId and citationId are required',
    })
  }

  const body = await readBody<unknown>(event)
  const parsed = recommendationReviewCitationFlagInputSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid reason: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const detail = await getRecommendationReviewDetail(event, runId)

  if (!detail) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation review run not found',
    })
  }

  const citation = detail.citations.find((item) => item.citationId === citationId)
  if (!citation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Citation not found',
    })
  }

  const review = await setRecommendationCitationReviewState({
    runId,
    citationId,
    sourceId: citation.sourceId,
    reviewState: 'flagged',
    reason: parsed.data.reason,
    actor: {
      userId,
      email: session.user.email,
    },
  })

  return {
    ok: true,
    runId,
    citationId,
    reviewState: review?.reviewState || 'flagged',
    reason: review?.reason || parsed.data.reason,
    updatedAt: review?.updatedAt || new Date().toISOString(),
  }
})
