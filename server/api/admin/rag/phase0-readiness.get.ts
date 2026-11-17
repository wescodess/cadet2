import { getRagPhase0Readiness } from '../../../utils/rag-foundation'
import { requireAdminSession } from '../../../utils/auth/requireAdminSession'

export default defineEventHandler(async (event) => {
  const { session, authorizationSource } = await requireAdminSession(event)
  const readiness = getRagPhase0Readiness(event)

  return {
    ok: true,
    phase: 'phase-0',
    viewer: {
      userId: session.user.id,
      email: session.user.email,
      authorizationSource,
    },
    readiness,
    docs: ['docs/rag-v1-phase-0-checklist.md', 'docs/rag-v1-phase-0-api-contract-deltas.md'],
  }
})
