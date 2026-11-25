import { ConvexError } from 'convex/values'
import type { QueryCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'

export function isReviewedRagAdminGrant(grant: Doc<'rag_admins'> | null, issuer: string) {
  const binding = grant?.subjectBinding
  return Boolean(
    binding &&
    binding.issuer === issuer &&
    binding.reviewedAt > 0 &&
    binding.reviewedAt <= Date.now() &&
    binding.operatorEvidence.trim(),
  )
}

export async function requireRagAdmin(ctx: Pick<QueryCtx, 'auth' | 'db'>) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity?.subject) throw new ConvexError('Authentication required')
  const grant = await ctx.db
    .query('rag_admins')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .unique()
  if (!grant || !isReviewedRagAdminGrant(grant, identity.issuer))
    throw new ConvexError('Admin access required')
  return {
    userId: grant.userId,
    email: identity.email?.trim().toLowerCase(),
    issuer: identity.issuer,
  }
}
