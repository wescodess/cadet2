import type { H3Event } from 'h3'
import { createError, getHeader, isError, setResponseHeader } from 'h3'
import { ConvexHttpClient } from 'convex/browser'
import { ConvexError } from 'convex/values'
import { makeFunctionReference } from 'convex/server'
import { z } from 'zod'
import { adminRequestTransport } from './adminRequestTransport'

export async function requireAdminSession(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const url = process.env.CONVEX_URL?.trim()
  if (!url) throw createError({ statusCode: 503, statusMessage: 'Admin authority unavailable' })

  try {
    const origin = z.string().url().parse(useRuntimeConfig(event).public.siteUrl)
    const transport = adminRequestTransport(event)
    const headers = { accept: 'application/json', cookie: getHeader(event, 'cookie') ?? '' }
    // Use the configured auth origin, never a caller-controlled Host header. Both auth
    // reads share the Convex deadline and cancel their HTTP reads on disconnect.
    const sessionResponse = await transport(new URL('/api/auth/get-session', origin), { headers })
    if (!sessionResponse.ok) throw new Error('User session unavailable')
    const sessionBody: unknown = await sessionResponse.json()
    if (sessionBody === null) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }
    const session = z
      .object({
        user: z
          .object({ id: z.string().trim().min(1), email: z.string(), name: z.string() })
          .passthrough(),
        session: z.record(z.string(), z.unknown()),
      })
      .passthrough()
      .parse(sessionBody)
    const userId = session.user.id
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(event.method) &&
      getHeader(event, 'origin') !== new URL(origin).origin
    ) {
      throw new ConvexError('Admin access required')
    }
    const response = await transport(new URL('/api/auth/convex/token', origin), { headers })
    if (!response.ok) throw new Error('User token unavailable')
    const body: unknown = await response.json()
    const { token } = z
      .object({ token: z.string().min(1) })
      .strict()
      .parse(body)
    const convex = new ConvexHttpClient(url, { logger: false, fetch: transport })
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
    event.context.admittedAdmin = true
    return { session, userId, convex, authorizationSource: 'rag_admins' as const }
  } catch (error) {
    if (isError(error) && error.statusCode === 401) throw error
    if (error instanceof ConvexError && error.data === 'Admin access required') {
      throw createError({ statusCode: 403, statusMessage: 'Admin access denied' })
    }
    throw createError({ statusCode: 503, statusMessage: 'Admin authority unavailable' })
  }
}
