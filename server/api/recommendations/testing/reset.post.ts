import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'

import { requireWorkspaceUserSession } from '../../../utils/auth/requireUserSession'
import { createConvexUserHttpClientForEvent } from '../../../utils/convex-admin-client'
import { resetFallbackRecommendationRunsForUser } from '../../../utils/recommendations/testRecommendationRunFallback'
import { assertRecommendationTestModeEnabled } from '../../../utils/recommendations/testMode'

export default defineEventHandler(async (event) => {
  assertRecommendationTestModeEnabled()

  const { userId } = await requireWorkspaceUserSession(event)
  let deletedCount = 0

  try {
    const convex = await createConvexUserHttpClientForEvent(event)
    const result = await convex.mutation(
      (anyApi as any).recommendationRuns.resetRunsForUser,
      { userId },
    ) as { deletedCount: number }
    deletedCount = result.deletedCount
  }
  catch {
    deletedCount = resetFallbackRecommendationRunsForUser(userId)
  }

  await db.execute(sql`
    DELETE FROM "recommendation_profiles"
    WHERE "userId" = ${userId};
  `)

  return {
    deletedCount,
  }
})
