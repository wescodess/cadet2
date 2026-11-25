import { ConvexError } from 'convex/values'
import { createError } from 'h3'

export function throwSourceError(error: unknown): never {
  const data: unknown = error instanceof ConvexError ? error.data : null
  if (typeof data === 'object' && data !== null && 'code' in data) {
    if (data.code === 'YOUTUBE_FROZEN') {
      throw createError({
        statusCode: 409,
        statusMessage: 'YouTube source actions are frozen',
        data: { code: 'YOUTUBE_FROZEN' },
      })
    }
    if (data.code === 'IDEMPOTENCY_CONFLICT') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Idempotency key was already used with a different payload',
      })
    }
  }
  throw error
}
