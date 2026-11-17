import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'

export default defineEventHandler(async (event) => {
  const { convex, authorizationSource } = await requireAdminSession(event)

  const result = await convex.query((anyApi as any).ragSources.getAdminStatus, {})

  return {
    ok: true,
    authorizationSource,
    ...result,
  }
})
