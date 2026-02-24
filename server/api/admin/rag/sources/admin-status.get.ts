import { anyApi } from 'convex/server'
import { requireRagAdminSession } from '../../../../utils/rag-admin'
import { createConvexAdminClientActingAs } from '../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  const { session } = await requireRagAdminSession(event)
  const convex = await createConvexAdminClientActingAs(event, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })

  const result = await convex.query(
    (anyApi as any).ragSources.getAdminStatus,
    {},
  )

  return {
    ok: true,
    ...result,
  }
})
