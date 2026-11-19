import { createHash } from 'node:crypto'
import type { ConvexHttpClient } from 'convex/browser'
import { z } from 'zod'
import { canonicalJson } from '../../../shared/utils/governanceAudit'
import {
  getStoredAuditEvent,
  getStoredAuditSummary,
  listStoredAuditEvents,
  normalizeOptionalString,
  type StoredAuditEvent,
  type AuditStoreFilters,
  type AuditPosition,
} from './auditLogStore'
import {
  getSourceAuditEvent,
  getSourceAuditSummary,
  listSourceAuditEvents,
} from './sourceAuditEvents'
import type {
  AuditTrailDetailResponse,
  AuditTrailFilters,
  AuditTrailListItem,
  AuditTrailListResponse,
  AuditTrailSummaryResponse,
  AuditEntityType,
} from './types'

const positionSchema = z
  .object({ timestamp: z.number().int().nonnegative().safe(), eventId: z.string().max(255) })
  .strict()
const cursorSchema = z
  .object({
    v: z.literal(1),
    filters: z.string().length(64),
    sql: positionSchema.nullable(),
    convex: positionSchema.nullable(),
    before: positionSchema,
    totalCount: z.number().int().nonnegative(),
  })
  .strict()

function compare(a: AuditPosition, b: AuditPosition) {
  return b.timestamp - a.timestamp || (a.eventId === b.eventId ? 0 : a.eventId < b.eventId ? 1 : -1)
}

function toListItem(event: StoredAuditEvent): AuditTrailListItem {
  return {
    eventId: event.eventId,
    timestamp: new Date(event.timestamp).toISOString(),
    actionType: event.actionType,
    entityType: event.entityType,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    actorUserId: event.actorId,
    actorEmail: event.actorEmail ?? null,
    actorRole: event.actorRole ?? null,
    reason: event.reason ?? null,
    changeSummary: event.changeSummary ?? 'Historical governance change; open details',
  }
}

function filtersFor(input: AuditTrailFilters): AuditStoreFilters {
  return {
    actionType: input.actionType,
    entityType: input.entityType,
    actorId: normalizeOptionalString(input.actorId) ?? undefined,
    entityId: normalizeOptionalString(input.entityId) ?? undefined,
    search: normalizeOptionalString(input.search) ?? undefined,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  }
}

function decodeCursor(value: string | undefined, fingerprint: string) {
  if (!value) return null
  try {
    if (value.length > 4096) throw new Error('Cursor is too long')
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')))
    if (cursor.filters !== fingerprint) throw new Error('Cursor filters changed')
    return cursor
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid audit cursor for these filters' })
  }
}

export async function listAuditTrailEvents(
  convex: ConvexHttpClient,
  input: AuditTrailFilters = {},
): Promise<AuditTrailListResponse> {
  const filters = filtersFor(input)
  const fingerprint = createHash('sha256').update(canonicalJson(filters)).digest('hex')
  const cursor = decodeCursor(input.cursor, fingerprint)
  const limit = Math.max(1, Math.min(100, Math.round(input.pageSize ?? 25)))
  const common = { limit: limit + 1, before: cursor?.before, includeCount: !cursor }
  const [sql, source] = await Promise.all([
    cursor && !cursor.sql
      ? { items: [], totalCount: 0, upper: undefined }
      : listStoredAuditEvents(filters, { ...common, upper: cursor?.sql ?? undefined }),
    cursor && !cursor.convex
      ? { items: [], totalCount: 0, upper: undefined }
      : listSourceAuditEvents(convex, filters, { ...common, upper: cursor?.convex ?? undefined }),
  ])
  const merged = [...sql.items, ...source.items].sort(compare)
  const items = merged.slice(0, limit)
  const totalCount = cursor?.totalCount ?? sql.totalCount + source.totalCount
  const last = items.at(-1)
  const nextCursor =
    merged.length > limit && last
      ? Buffer.from(
          JSON.stringify({
            v: 1,
            filters: fingerprint,
            sql: cursor?.sql ?? sql.upper ?? null,
            convex: cursor?.convex ?? source.upper ?? null,
            before: { timestamp: last.timestamp, eventId: last.eventId },
            totalCount,
          }),
        ).toString('base64url')
      : null
  return { ok: true, items: items.map(toListItem), totalCount, nextCursor }
}

export async function getAuditTrailEvent(
  eventId: string,
  convex: ConvexHttpClient,
): Promise<AuditTrailDetailResponse | null> {
  const isSource = eventId.startsWith('rag-approval:') || eventId.startsWith('rag-deletion:')
  const event = isSource
    ? await getSourceAuditEvent(convex, eventId)
    : await getStoredAuditEvent(eventId)
  if (!event) return null
  const relatedFilters = { entityId: event.entityId }
  const options = { limit: 6, includeCount: false }
  const related = isSource
    ? await listSourceAuditEvents(convex, relatedFilters, options)
    : await listStoredAuditEvents(relatedFilters, options)
  return {
    ok: true,
    event: {
      ...toListItem(event),
      changeContext: event.changeContext,
      stateDigests: event.stateDigests,
      truncated: event.truncated ?? false,
      relatedEvents: related.items
        .filter((item) => item.eventId !== eventId)
        .slice(0, 5)
        .map((item) => {
          const row = toListItem(item)
          return {
            eventId: row.eventId,
            timestamp: row.timestamp,
            actionType: row.actionType,
            entityType: row.entityType,
            entityLabel: row.entityLabel,
          }
        }),
    },
  }
}

export async function getAuditTrailSummary(
  convex: ConvexHttpClient,
): Promise<AuditTrailSummaryResponse> {
  const [sql, source] = await Promise.all([getStoredAuditSummary(), getSourceAuditSummary(convex)])
  const actors = new Map<string, { userId: string; email: string; eventCount: number }>()
  const entities = new Map<AuditEntityType, number>()
  for (const row of [...sql.actors, ...source.actors]) {
    const previous = actors.get(row.userId)
    actors.set(row.userId, { ...row, eventCount: row.eventCount + (previous?.eventCount ?? 0) })
  }
  for (const row of [...sql.entities, ...source.entities])
    entities.set(row.entityType, (entities.get(row.entityType) ?? 0) + row.eventCount)
  const mostActiveActor =
    [...actors.values()].sort(
      (a, b) => b.eventCount - a.eventCount || a.userId.localeCompare(b.userId),
    )[0] ?? null
  const mostChangedEntityType =
    [...entities].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0]?.[0] ?? 'PATHWAY'
  return {
    ok: true,
    eventsToday: sql.eventsToday + source.eventsToday,
    eventsThisWeek: sql.eventsThisWeek + source.eventsThisWeek,
    mostActiveActor,
    mostChangedEntityType,
  }
}
