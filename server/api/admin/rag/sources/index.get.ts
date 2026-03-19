import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClientActingAs } from '../../../../utils/convex-admin-client'
import {
  evidenceSourceListQuerySchema,
  toEvidenceSourceRecord,
} from '../../../../utils/admin/evidenceSourceSchema'

type SourceStatus = 'pending_approval' | 'approved' | 'rejected' | 'paused'
type SourceType = 'website' | 'youtube_channel'

export default defineEventHandler(async (event) => {
  const { session } = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
  const parsedQuery = evidenceSourceListQuerySchema.safeParse(getQuery(event))

  if (!parsedQuery.success) {
    const issue = parsedQuery.error.issues[0]

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid query: ${issue?.message || 'Request query is invalid'}`,
    })
  }

  const query = parsedQuery.data

  const status = query.status && ['pending_approval', 'approved', 'rejected', 'paused'].includes(query.status)
    ? query.status as SourceStatus
    : undefined

  const type = query.type && ['website', 'youtube_channel'].includes(query.type)
    ? query.type as SourceType
    : undefined

  const tenantId = typeof query.tenantId === 'string' && query.tenantId.trim()
    ? query.tenantId.trim()
    : undefined

  const showOnlyMine = query.showOnlyMine === '1' || query.showOnlyMine === 'true'

  const convex = await createConvexAdminClientActingAs(event, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })
  const result = await convex.query(
    (anyApi as any).ragSources.listSources,
    {
      includeAllForAdmin: !showOnlyMine,
      status,
      type,
      tenantId,
    },
  )

  return {
    ok: true,
    currentUserIsAdmin: result.currentUserIsAdmin,
    items: result.items.map(item => ({
      ...item,
      ...toEvidenceSourceRecord(item as never),
    })),
  }
})
