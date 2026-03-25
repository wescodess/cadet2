import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { listRecommendationReviews } from '../../../utils/recommendations/recommendationReviewService'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })

  return await listRecommendationReviews(event)
})
