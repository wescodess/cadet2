import { anyApi } from 'convex/server'
import { requireRagAdminSession } from '../../../../utils/rag-admin'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  const { session } = await requireRagAdminSession(event)
  const convex = await createConvexAdminClient()

  const result = await convex.mutation(
    (anyApi as any).ragSourcesInternal.syncAdminFromNuxtAllowlist,
    {
      userId: session.user.id,
      email: session.user.email,
      grantedByUserId: session.user.id,
    },
  )

  return {
    ok: true,
    synced: true,
    result,
  }
})
