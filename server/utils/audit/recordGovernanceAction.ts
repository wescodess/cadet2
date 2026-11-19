import type { H3Event } from 'h3'
import type { SqlExecutor } from '../database'

import { requireAdminSession } from '../auth/requireAdminSession'
import { insertAuditLogEvent, normalizeOptionalString, normalizeJsonRecord } from './auditLogStore'
import type { GovernanceAuditEventInput } from './types'

export async function recordGovernanceAction(
  event: H3Event,
  input: GovernanceAuditEventInput,
  sessionContext?: Awaited<ReturnType<typeof requireAdminSession>>,
  database?: SqlExecutor,
) {
  const resolvedSession = sessionContext || (await requireAdminSession(event))

  return await insertAuditLogEvent(
    {
      actorId: resolvedSession.userId,
      actorEmail: normalizeOptionalString(resolvedSession.session.user.email) || undefined,
      actorRole: 'admin',
      actionType: input.actionType,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      changeContext: {
        before: normalizeJsonRecord(input.changeContext.before),
        after: normalizeJsonRecord(input.changeContext.after),
      },
      reason: normalizeOptionalString(input.reason) || undefined,
      timestamp:
        typeof input.timestamp === 'number' && Number.isFinite(input.timestamp)
          ? Math.round(input.timestamp)
          : Date.now(),
    },
    database,
  )
}
