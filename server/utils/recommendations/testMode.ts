import { createError } from '#imports'

export function assertRecommendationTestModeEnabled() {
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }
}
