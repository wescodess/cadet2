import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  const { session, authorizationSource } = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })

  try {
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
      authorizationSource,
      result,
    }
  }
  catch (error) {
    return {
      ok: true,
      synced: false,
      authorizationSource,
      result: null,
      warning: error instanceof Error ? error.message : 'Convex admin sync unavailable',
    }
  }
})
