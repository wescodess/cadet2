import type { H3Event } from 'h3'
import { createError, requireUserSession } from '#imports'
import { getRagFoundationConfig } from './rag-foundation'

function matchAdmin(event: H3Event, session: { user: { id: string, email: string } }) {
  const config = getRagFoundationConfig(event)
  const userId = session.user.id
  const email = session.user.email.toLowerCase()

  if (config.rag.adminUserIds.includes(userId)) {
    return { matchedBy: 'userId' as const, matchedValue: userId }
  }

  if (config.rag.adminEmails.includes(email)) {
    return { matchedBy: 'email' as const, matchedValue: email }
  }

  return null
}

export async function requireRagAdminSession(event: H3Event) {
  const session = await requireUserSession(event)
  const config = getRagFoundationConfig(event)

  if (config.rag.adminUserIds.length === 0 && config.rag.adminEmails.length === 0) {
    throw createError({
      statusCode: 503,
      statusMessage: 'RAG admin allowlist is not configured',
      data: {
        requiredEnvVars: [
          'NUXT_RAG_ADMIN_USER_IDS',
          'NUXT_RAG_ADMIN_EMAILS',
        ],
      },
    })
  }

  const adminMatch = matchAdmin(event, {
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  })

  if (!adminMatch) {
    throw createError({
      statusCode: 403,
      statusMessage: 'RAG admin access denied',
      data: {
        userId: session.user.id,
        email: session.user.email,
      },
    })
  }

  return {
    session,
    adminMatch,
  }
}
