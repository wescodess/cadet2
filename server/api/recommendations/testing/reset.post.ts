import { anyApi } from 'convex/server'

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

  return {
    deletedCount: result.deletedCount,
  }
})
