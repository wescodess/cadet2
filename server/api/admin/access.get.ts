import { requireAdminSession } from '../../utils/auth/requireAdminSession'

export default defineEventHandler(async (event) => {
  const { session, authorizationSource } = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })

  return {
    ok: true,
    authorizationSource,
    user: {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  }
})
