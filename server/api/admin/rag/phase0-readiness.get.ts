import { getRagPhase0Readiness } from '../../../utils/rag-foundation'
import { requireRagAdminSession } from '../../../utils/rag-admin'

export default defineEventHandler(async (event) => {
  const { session, adminMatch } = await requireRagAdminSession(event)
  const readiness = getRagPhase0Readiness(event)

  return {
    ok: true,
    phase: 'phase-0',
    viewer: {
      userId: session.user.id,
      email: session.user.email,
      matchedBy: adminMatch.matchedBy,
    },
    readiness,
    docs: [
      'docs/rag-v1-phase-0-checklist.md',
      'docs/rag-v1-phase-0-api-contract-deltas.md',
    ],
  }
})
