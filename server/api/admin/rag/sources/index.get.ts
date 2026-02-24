import { anyApi } from 'convex/server'
import { requireRagAdminSession } from '../../../../utils/rag-admin'
import { createConvexAdminClientActingAs } from '../../../../utils/convex-admin-client'

type SourceStatus = 'pending_approval' | 'approved' | 'rejected' | 'paused'
type SourceType = 'website' | 'youtube_channel'

export default defineEventHandler(async (event) => {
  const { session } = await requireRagAdminSession(event)

  const query = getQuery(event) as {
    showOnlyMine?: string
    status?: string
    type?: string
    tenantId?: string
  }

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
    ...result,
  }
})
