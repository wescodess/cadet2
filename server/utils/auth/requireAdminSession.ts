import type { H3Event } from 'h3'
import { anyApi } from 'convex/server'
import { createError } from '#imports'
import { createConvexUserHttpClientForEvent } from '../convex-admin-client'
import { getRagFoundationConfig } from '../rag-foundation'
import { requireWorkspaceUserSession } from './requireUserSession'

type RequireAdminSessionOptions = {
  allowBootstrapFromAllowlist?: boolean
}

function isAllowlistedAdmin(event: H3Event, userId: string, email: string) {
  const config = getRagFoundationConfig(event)
  const normalizedEmail = email.trim().toLowerCase()

  return config.rag.adminUserIds.includes(userId) || config.rag.adminEmails.includes(normalizedEmail)
}

async function isRagAdmin(event: H3Event) {
  try {
    const convex = await createConvexUserHttpClientForEvent(event)
    const result = await convex.query(
      (anyApi as any).ragSources.getAdminStatus,
      {},
    ) as {
      currentUserIsAdmin?: boolean
    }

    return Boolean(result.currentUserIsAdmin)
  }
  catch {
    return false
  }
}

export async function requireAdminSession(
  event: H3Event,
  options: RequireAdminSessionOptions = {},
) {
  const { session, userId } = await requireWorkspaceUserSession(event)

  if (await isRagAdmin(event)) {
    return {
      session,
      userId,
      authorizationSource: 'rag_admins' as const,
    }
  }

  if (options.allowBootstrapFromAllowlist && isAllowlistedAdmin(event, userId, session.user.email)) {
    return {
      session,
      userId,
      authorizationSource: 'allowlist' as const,
    }
  }

  throw createError({
    statusCode: 403,
    statusMessage: 'Admin access denied',
    data: {
      userId,
      email: session.user.email,
    },
  })
}
