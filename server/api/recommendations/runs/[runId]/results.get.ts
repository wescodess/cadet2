import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../../utils/auth/requireUserSession'
import { readRecommendationResultsForUser } from '../../../../utils/recommendations/readRecommendationResultsForUser'

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const runId = getRouterParam(event, 'runId')?.trim() || ''

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid run identifier',
    })
  }

  const lookup = await readRecommendationResultsForUser({
    userId,
    runId,
  })

  if (lookup.state === 'missing') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation run not found',
    })
  }

  if (lookup.state === 'not-ready') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Recommendation ranking not ready',
    })
  }

  return lookup.record
})
