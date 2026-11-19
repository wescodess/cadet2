import type { MutationCtx, QueryCtx } from '../_generated/server'
import {
  boundedChange,
  auditText,
  stateDigest,
  canonicalJson,
} from '../../shared/utils/governanceAudit'

const sourceActions = {
  submit: 'EVIDENCE_SOURCE_CREATED',
  edit: 'EVIDENCE_SOURCE_UPDATED',
  approve: 'EVIDENCE_SOURCE_APPROVED',
  reject: 'EVIDENCE_SOURCE_REJECTED',
  pause: 'EVIDENCE_SOURCE_PAUSED',
  resume: 'EVIDENCE_SOURCE_RESUMED',
} as const

export function sourceActionType(action: keyof typeof sourceActions) {
  return sourceActions[action]
}

export function orderKey(timestamp: number, eventId = '') {
  return `${String(timestamp).padStart(16, '0')}:${eventId}`
}

export function countKey(filters: { actionType?: string; actorId?: string; entityId?: string }) {
  return JSON.stringify([
    filters.actionType ?? null,
    filters.actorId ?? null,
    filters.entityId ?? null,
  ])
}

async function increment(ctx: MutationCtx, key: string, kind: string, email?: string) {
  const row = await ctx.db
    .query('rag_audit_counts')
    .withIndex('by_key', (q) => q.eq('key', key))
    .unique()
  if (row) await ctx.db.patch(row._id, { count: row.count + 1, ...(email ? { email } : {}) })
  else
    await ctx.db.insert('rag_audit_counts', {
      key,
      kind,
      count: 1,
      day: kind === 'day' ? Number(key) : undefined,
      ...(email ? { email } : {}),
    })
}

function eventCountKeys(event: { actionType: string; actorId: string; entityId: string }) {
  return Array.from({ length: 8 }, (_, mask) =>
    countKey({
      actionType: mask & 1 ? event.actionType : undefined,
      actorId: mask & 2 ? event.actorId : undefined,
      entityId: mask & 4 ? event.entityId : undefined,
    }),
  )
}

export async function writeSourceEvent(
  ctx: MutationCtx,
  event: {
    eventId: string
    actorId: string
    actorEmail?: string
    actionType: string
    entityId: string
    before: Record<string, unknown> | null
    after: Record<string, unknown> | null
    reason?: string
    timestamp?: number
  },
) {
  const existing = await ctx.db
    .query('rag_audit_events')
    .withIndex('by_eventId', (q) => q.eq('eventId', event.eventId))
    .unique()
  if (existing) return
  const clock = await ctx.db
    .query('rag_audit_counts')
    .withIndex('by_key', (q) => q.eq('key', 'clock'))
    .unique()
  const timestamp = event.timestamp ?? Math.max(Date.now(), (clock?.count ?? 0) + 1)
  if (clock) await ctx.db.patch(clock._id, { count: Math.max(timestamp, clock.count) })
  else await ctx.db.insert('rag_audit_counts', { key: 'clock', kind: 'clock', count: timestamp })
  if (!Number.isSafeInteger(timestamp) || timestamp < 0)
    throw new Error('Audit timestamp requires operator repair')
  const change = await boundedChange(event.before, event.after)
  const name = event.after?.name ?? event.before?.name
  const entityLabel = auditText(typeof name === 'string' && name.trim() ? name : event.entityId)
  const keys = [...new Set([...Object.keys(event.before ?? {}), ...Object.keys(event.after ?? {})])]
  const changed = keys.filter(
    (key) => canonicalJson(event.before?.[key]) !== canonicalJson(event.after?.[key]),
  )
  const changeSummary = auditText(
    `${event.before ? (event.after ? 'Changed' : 'Deleted') : 'Created'}: ${changed.join(', ')}`,
    512,
  )
  await ctx.db.insert('rag_audit_events', {
    eventId: event.eventId,
    actorId: event.actorId,
    ...(event.actorEmail ? { actorEmail: auditText(event.actorEmail) } : {}),
    actionType: event.actionType,
    entityType: 'EVIDENCE_SOURCE',
    entityId: event.entityId,
    entityLabel,
    timestamp,
    orderKey: orderKey(timestamp, event.eventId),
    changeSummary,
    ...(event.reason ? { reason: auditText(event.reason, 512) } : {}),
  })
  await ctx.db.insert('rag_audit_details', { eventId: event.eventId, ...change })
  for (const key of eventCountKeys(event)) await increment(ctx, key, 'filter')
  await increment(ctx, String(Math.floor(timestamp / 86400000)), 'day')
  await increment(ctx, `actor:${event.actorId}`, 'actor', event.actorEmail)
}

export async function requireSourceAuditProjection(ctx: QueryCtx) {
  const approval = await ctx.db
    .query('approval_audit_log')
    .withIndex('by_projected', (q) => q.eq('projected', undefined))
    .first()
  const deletion = await ctx.db
    .query('rag_source_deletions')
    .withIndex('by_projected', (q) => q.eq('projected', undefined))
    .first()
  if (approval || deletion) throw new Error('Audit projection requires the operator backfill')
}

export async function sourcePayloadDigest(payload: Record<string, unknown>) {
  return stateDigest(
    Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'idempotencyKey')),
  )
}
