import type { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import { z } from 'zod'
import { normalizeJsonRecord, type StoredAuditEvent } from './auditLogStore'

const listDeletionEvents = makeFunctionReference<
  'query',
  { paginationOpts: { cursor: string | null; numItems: number } },
  unknown
>('ragSourceAudit:listDeletionEvents')

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

export async function loadSourceDeletionEvents(convex: ConvexHttpClient) {
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
