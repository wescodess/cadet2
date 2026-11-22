import type { H3Event } from 'h3'
import { createError } from 'h3'

type BetterAuthSession = Awaited<ReturnType<typeof requireUserSession>>

export async function requireWorkspaceUserSession(event: H3Event) {
  const session = await requireUserSession(event)
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
