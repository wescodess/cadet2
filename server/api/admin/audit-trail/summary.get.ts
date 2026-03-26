import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { getAuditTrailSummary } from '../../../utils/audit/auditTrailService'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })

  return await getAuditTrailSummary()
})
