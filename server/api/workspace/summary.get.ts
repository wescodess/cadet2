import { requireWorkspaceUserSession } from '../../utils/auth/requireUserSession'
import { buildWorkspaceSummary } from '../../utils/workspace/buildWorkspaceSummary'

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)

  return await buildWorkspaceSummary({ userId })
})
