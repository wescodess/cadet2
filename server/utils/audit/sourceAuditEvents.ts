import type { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import { z } from 'zod'
import {
  normalizeJsonRecord,
  type AuditPosition,
  type AuditStoreFilters,
  type StoredAuditEvent,
} from './auditLogStore'
import { auditActionTypes, auditEntityTypes } from './types'

const metadata = z.object({
  eventId: z.string(),
  actorId: z.string(),
  actorEmail: z.string().optional(),
  actionType: z.enum(auditActionTypes),
  entityType: z.enum(auditEntityTypes),
  entityId: z.string(),
  entityLabel: z.string(),
  timestamp: z.number(),
  changeSummary: z.string(),
  reason: z.string().optional(),
})
const eventDetail = metadata.extend({
  changeContext: z.object({
    before: z.record(z.string(), z.unknown()).nullable(),
    after: z.record(z.string(), z.unknown()).nullable(),
  }),
  stateDigests: z.object({ before: z.string(), after: z.string() }),
  truncated: z.boolean(),
})
const pageSchema = z.object({ items: z.array(metadata), totalCount: z.number(), upper: z.string() })
const summarySchema = z.object({
  eventsToday: z.number(),
  eventsThisWeek: z.number(),
  actors: z
    .array(z.object({ userId: z.string(), email: z.string(), eventCount: z.number() }))
    .max(100),
  entities: z.array(z.object({ entityType: z.enum(auditEntityTypes), eventCount: z.number() })),
})

function sourceKey(position?: AuditPosition) {
  return position
    ? `${String(position.timestamp).padStart(16, '0')}:${position.eventId}`
    : undefined
}

async function sourceQuery<T>(
  convex: ConvexHttpClient,
  name: string,
  args: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const result: unknown = await convex.query(
      makeFunctionReference<'query'>(`ragSourceAudit:${name}`),
      args,
    )
    return schema.parse(normalizeJsonRecord(result))
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Source audit storage is unavailable. Contact the operator.',
    })
  }
}

function stored(row: z.infer<typeof metadata>): StoredAuditEvent {
  return { ...row, actorRole: 'admin', changeContext: { before: null, after: null } }
}

export async function listSourceAuditEvents(
  convex: ConvexHttpClient,
  filters: AuditStoreFilters,
  options: { limit: number; upper?: AuditPosition; before?: AuditPosition; includeCount: boolean },
) {
  const sourceFilters: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue
    if (key === 'dateFrom' || key === 'dateTo') {
      const date = Date.parse(value)
      if (Number.isFinite(date)) sourceFilters[key] = date
    } else sourceFilters[key] = value
  }
  const result = await sourceQuery(
    convex,
    'listEvents',
    {
      filters: sourceFilters,
      limit: options.limit,
      ...(options.upper ? { upper: sourceKey(options.upper) } : {}),
      ...(options.before ? { before: sourceKey(options.before) } : {}),
      includeCount: options.includeCount,
    },
    pageSchema,
  )
  return {
    items: result.items.map(stored),
    totalCount: result.totalCount,
    upper:
      options.upper ??
      (result.items[0]
        ? { timestamp: result.items[0].timestamp, eventId: result.items[0].eventId }
        : undefined),
  }
}

export async function getSourceAuditEvent(
  convex: ConvexHttpClient,
  eventId: string,
): Promise<StoredAuditEvent | null> {
  const result = await sourceQuery(convex, 'getEvent', { eventId }, eventDetail.nullable())
  if (!result) return null
  return { ...result, actorRole: 'admin' }
}

export async function getSourceAuditSummary(convex: ConvexHttpClient) {
  return sourceQuery(convex, 'getSummary', {}, summarySchema)
}
