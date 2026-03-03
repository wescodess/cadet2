import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClientActingAs } from '../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  const { session, authorizationSource } = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
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
    authorizationSource,
    ...result,
  }
})
