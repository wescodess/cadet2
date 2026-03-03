import type { H3Event } from 'h3'
import { createError, requireUserSession as requireBetterAuthUserSession } from '#imports'

type BetterAuthSession = Awaited<ReturnType<typeof requireBetterAuthUserSession>>

export async function requireWorkspaceUserSession(event: H3Event) {
  const session = await requireBetterAuthUserSession(event)
  const userId = typeof session.user.id === 'string' ? session.user.id.trim() : ''

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  return {
    session: session as BetterAuthSession,
    userId,
  }
}
