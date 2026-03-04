import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'

import { requireWorkspaceUserSession } from '../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../utils/convex-admin-client'
import { assertRecommendationTestModeEnabled } from '../../../utils/recommendations/testMode'

export default defineEventHandler(async (event) => {
  assertRecommendationTestModeEnabled()

  const { userId } = await requireWorkspaceUserSession(event)
  const convex = await createConvexAdminClient()

  const result = await convex.mutation(
    (anyApi as any).recommendationRuns.resetRunsForUser,
    { userId },
  ) as { deletedCount: number }

  await db.execute(sql`
    DELETE FROM "recommendation_profiles"
    WHERE "userId" = ${userId};
  `)

  return {
    deletedCount: result.deletedCount,
  }
})
