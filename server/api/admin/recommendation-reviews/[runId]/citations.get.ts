import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { getRecommendationReviewDetail } from '../../../../utils/recommendations/recommendationReviewService'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const runId = getRouterParam(event, 'runId')?.trim() || ''

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'runId is required',
    })
  }

  const detail = await getRecommendationReviewDetail(event, runId)

  if (!detail) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation review citations not found',
    })
  }

  return {
    ok: true,
    items: detail.citations,
    totalCount: detail.citations.length,
  }
})
