import type { H3Event } from 'h3'
import { createError, getHeader, setResponseHeader } from 'h3'
import { ConvexHttpClient } from 'convex/browser'
import { ConvexError } from 'convex/values'
import { makeFunctionReference } from 'convex/server'
import { z } from 'zod'
import { requireWorkspaceUserSession } from './requireUserSession'

export async function requireAdminSession(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const { session, userId } = await requireWorkspaceUserSession(event)
  const url = process.env.CONVEX_URL?.trim()
  if (!url) throw createError({ statusCode: 503, statusMessage: 'Admin authority unavailable' })

  try {
    const origin = z.string().url().parse(useRuntimeConfig(event).public.siteUrl)
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(event.method) &&
      getHeader(event, 'origin') !== new URL(origin).origin
    ) {
      throw new ConvexError('Admin access required')
    }
    const response = await serverAuth(event).handler(
      new Request(new URL('/api/auth/convex/token', origin), {
        headers: { accept: 'application/json', cookie: getHeader(event, 'cookie') ?? '' },
      }),
    )
    if (!response.ok) throw new Error('User token unavailable')
    const body: unknown = await response.json()
    const { token } = z
      .object({ token: z.string().min(1) })
      .strict()
      .parse(body)
    const convex = new ConvexHttpClient(url, { logger: false })
    convex.setAuth(token)
    const result: unknown = await convex.query(
      makeFunctionReference<'query'>('ragSources:getAdminStatus'),
      {},
    )
    const status = z
      .object({
        currentUserIsAdmin: z.literal(true),
        currentUser: z.object({ userId: z.string() }),
      })
      .parse(result)
    if (status.currentUser.userId !== userId) {
      throw new ConvexError('Admin access required')
    }
    return { session, userId, convex, authorizationSource: 'rag_admins' as const }
  } catch (error) {
    if (error instanceof ConvexError && error.data === 'Admin access required') {
      throw createError({ statusCode: 403, statusMessage: 'Admin access denied' })
    }
    throw createError({ statusCode: 503, statusMessage: 'Admin authority unavailable' })
  }
}
