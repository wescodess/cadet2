import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { getAuditTrailSummary } from '../../../utils/audit/auditTrailService'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  return await getAuditTrailSummary()
})
