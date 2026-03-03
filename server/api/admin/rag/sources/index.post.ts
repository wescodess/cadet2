import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClientActingAs } from '../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  const { session } = await requireAdminSession(event)
  const body = await readBody<Record<string, unknown>>(event)
  const convex = await createConvexAdminClientActingAs(event, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })

  const result = await convex.mutation(
    (anyApi as any).ragSources.createSourceSubmission,
    body,
  )

  return {
    ok: true,
    ...result,
  }
})
