import type { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import { z } from 'zod'
import { normalizeJsonRecord, type StoredAuditEvent } from './auditLogStore'

const listDeletionEvents = makeFunctionReference<
  'query',
  { paginationOpts: { cursor: string | null; numItems: number } },
  unknown
>('ragSourceAudit:listDeletionEvents')

const listApprovalEvents = makeFunctionReference<
  'query',
  { paginationOpts: { cursor: string | null; numItems: number } },
  unknown
>('ragSourceAudit:listApprovalEvents')

const sourceActionTypes = {
  submit: 'EVIDENCE_SOURCE_CREATED',
  edit: 'EVIDENCE_SOURCE_UPDATED',
  approve: 'EVIDENCE_SOURCE_APPROVED',
  reject: 'EVIDENCE_SOURCE_REJECTED',
  pause: 'EVIDENCE_SOURCE_PAUSED',
  resume: 'EVIDENCE_SOURCE_RESUMED',
} as const

const approvalPage = z.object({
  page: z.array(
    z.object({
      _id: z.string(),
      sourceId: z.string(),
      actorUserId: z.string(),
      actorEmail: z.string().optional(),
      action: z.enum(['submit', 'edit', 'approve', 'reject', 'pause', 'resume']),
      timestamp: z.number(),
      reason: z.string().optional(),
      note: z.string().optional(),
      governance: z.object({ before: z.unknown(), after: z.unknown() }).optional(),
    }),
  ),
  isDone: z.boolean(),
  continueCursor: z.string(),
})

const deletionPage = z.object({
  page: z.array(
    z.object({
      _id: z.string(),
      sourceId: z.string(),
      source: z.unknown(),
      actorId: z.string(),
      actorEmail: z.string().optional(),
      timestamp: z.number(),
    }),
  ),
  isDone: z.boolean(),
  continueCursor: z.string(),
})

async function loadSourceDeletionEvents(convex: ConvexHttpClient) {
  const events: StoredAuditEvent[] = []
  let cursor: string | null = null
  let isDone = false
  while (!isDone) {
    const result: z.infer<typeof deletionPage> = deletionPage.parse(
      await convex.query(listDeletionEvents, {
        paginationOpts: { cursor, numItems: 100 },
      }),
    )
    for (const row of result.page) {
      const source = normalizeJsonRecord(row.source) ?? normalizeJsonRecord({ value: row.source })
      const name = source?.name
      events.push({
        eventId: `rag-deletion:${row._id}`,
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        actorRole: 'admin',
        actionType: 'EVIDENCE_SOURCE_DELETED',
        entityType: 'EVIDENCE_SOURCE',
        entityId: row.sourceId,
        entityLabel: typeof name === 'string' && name.trim() ? name : row.sourceId,
        changeContext: { before: source, after: null },
        timestamp: row.timestamp,
      })
    }
    isDone = result.isDone
    cursor = result.continueCursor
  }
  return events
}

async function loadSourceApprovalEvents(convex: ConvexHttpClient) {
  const events: StoredAuditEvent[] = []
  let cursor: string | null = null
  let isDone = false
  while (!isDone) {
    const result: z.infer<typeof approvalPage> = approvalPage.parse(
      await convex.query(listApprovalEvents, {
        paginationOpts: { cursor, numItems: 100 },
      }),
    )
    for (const row of result.page) {
      if (!row.governance) continue
      const before = normalizeJsonRecord(row.governance.before)
      const after = normalizeJsonRecord(row.governance.after)
      const name = after?.name ?? before?.name
      events.push({
        eventId: `rag-approval:${row._id}`,
        actorId: row.actorUserId,
        actorEmail: row.actorEmail,
        actorRole: 'admin',
        actionType: sourceActionTypes[row.action],
        entityType: 'EVIDENCE_SOURCE',
        entityId: row.sourceId,
        entityLabel: typeof name === 'string' && name.trim() ? name : row.sourceId,
        changeContext: { before, after },
        reason: row.reason ?? row.note,
        timestamp: row.timestamp,
      })
    }
    isDone = result.isDone
    cursor = result.continueCursor
  }
  return events
}

export async function loadSourceAuditEvents(convex: ConvexHttpClient) {
  const pages = await Promise.all([
    loadSourceDeletionEvents(convex),
    loadSourceApprovalEvents(convex),
  ])
  return pages.flat()
}
