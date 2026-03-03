import { requireWorkspaceUserSession } from '../../utils/auth/requireUserSession'

export default defineEventHandler(async (event) => {
  const { session, userId } = await requireWorkspaceUserSession(event)

  return {
    userId,
    email: session.user.email,
    name: session.user.name ?? null,
  }
})
