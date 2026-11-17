import { sql } from 'drizzle-orm'

import type { AuditActionType, AuditChangeContext, AuditEntityType } from './types'

type AuditLogRow = {
  eventId: string
  actorId: string
  actorEmail: string | null
  actorRole: string | null
  actionType: AuditActionType
  entityType: AuditEntityType
  entityId: string
  entityLabel: string
  changeContextBefore: unknown
  changeContextAfter: unknown
  reason: string | null
  timestamp: number | string
}

type CountRow = {
  count: number | string
}

type SummaryRow = {
  eventsToday: number | string
  eventsThisWeek: number | string
}

type MostActiveActorRow = {
  userId: string
  email: string | null
  eventCount: number | string
}

type MostChangedEntityRow = {
  entityType: AuditEntityType
}

export type StoredAuditEvent = {
  eventId: string
  actorId: string
  actorEmail?: string
  actorRole?: string
  actionType: AuditActionType
  entityType: AuditEntityType
  entityId: string
  entityLabel: string
  changeContext: AuditChangeContext
  reason?: string
  timestamp: number
}

export type StoredAuditEventListResult = {
  items: StoredAuditEvent[]
  totalCount: number
  nextCursor: string | null
}

export type StoredAuditSummaryResult = {
  eventsToday: number
  eventsThisWeek: number
  mostActiveActor: {
    userId: string
    email: string
    eventCount: number
  } | null
  mostChangedEntityType: AuditEntityType
}

function createEventId() {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `audit-${seed}`
}

export function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>
}

function toJsonbFragment(value: Record<string, unknown> | null) {
  if (!value) {
    return sql`NULL`
  }

  return sql`${JSON.stringify(value)}::jsonb`
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function parseCursor(value?: string) {
  if (!value) {
    return 0
  }

  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function clampPageSize(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 25
  }

  return Math.max(1, Math.min(100, Math.round(value)))
}

function parseJsonColumn(value: unknown) {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    try {
      return normalizeJsonRecord(JSON.parse(value))
    } catch {
      return null
    }
  }

  return normalizeJsonRecord(value)
}

function toStoredAuditEvent(row: AuditLogRow): StoredAuditEvent {
  return {
    eventId: row.eventId,
    actorId: row.actorId,
    actorEmail: row.actorEmail || undefined,
    actorRole: row.actorRole || undefined,
    actionType: row.actionType,
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    changeContext: {
      before: parseJsonColumn(row.changeContextBefore),
      after: parseJsonColumn(row.changeContextAfter),
    },
    reason: row.reason || undefined,
    timestamp: toNumber(row.timestamp),
  }
}

async function requireAuditLogTable() {
  try {
    await db.execute(sql`SELECT 1 FROM "governance_audit_log" LIMIT 0`)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Audit storage is unavailable. Contact the operator.',
    })
  }
}

const publicGovernancePredicate = sql`"entity_type" IN ('PATHWAY', 'PATHWAY_RULE', 'EVIDENCE_SOURCE')`

function buildWhereClause(filters: {
  actionType?: AuditActionType
  entityType?: AuditEntityType
  actorId?: string
  entityId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}) {
  const conditions = [publicGovernancePredicate]

  if (filters.actionType) {
    conditions.push(sql`"action_type" = ${filters.actionType}`)
  }

  if (filters.entityType) {
    conditions.push(sql`"entity_type" = ${filters.entityType}`)
  }

  if (filters.actorId?.trim()) {
    conditions.push(sql`"actor_id" = ${filters.actorId.trim()}`)
  }

  if (filters.entityId?.trim()) {
    conditions.push(sql`"entity_id" = ${filters.entityId.trim()}`)
  }

  if (filters.dateFrom) {
    const parsed = Date.parse(filters.dateFrom)
    if (Number.isFinite(parsed)) {
      conditions.push(sql`"timestamp_ms" >= ${parsed}`)
    }
  }

  if (filters.dateTo) {
    const parsed = Date.parse(filters.dateTo)
    if (Number.isFinite(parsed)) {
      conditions.push(sql`"timestamp_ms" <= ${parsed}`)
    }
  }

  if (filters.search?.trim()) {
    const query = `%${filters.search.trim()}%`
    conditions.push(sql`(
      "event_id" ILIKE ${query}
      OR "entity_id" ILIKE ${query}
      OR "entity_label" ILIKE ${query}
      OR "actor_id" ILIKE ${query}
      OR COALESCE("actor_email", '') ILIKE ${query}
      OR COALESCE("reason", '') ILIKE ${query}
    )`)
  }

  return conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``
}

export async function insertAuditLogEvent(input: Omit<StoredAuditEvent, 'eventId'>) {
  await requireAuditLogTable()

  const eventId = createEventId()
  const before = normalizeJsonRecord(input.changeContext.before)
  const after = normalizeJsonRecord(input.changeContext.after)

  await db.execute(sql`
    INSERT INTO "governance_audit_log" (
      "event_id",
      "actor_id",
      "actor_email",
      "actor_role",
      "action_type",
      "entity_type",
      "entity_id",
      "entity_label",
      "change_context_before",
      "change_context_after",
      "reason",
      "timestamp_ms"
    )
    VALUES (
      ${eventId},
      ${input.actorId},
      ${normalizeOptionalString(input.actorEmail)},
      ${normalizeOptionalString(input.actorRole)},
      ${input.actionType},
      ${input.entityType},
      ${input.entityId},
      ${input.entityLabel},
      ${toJsonbFragment(before)},
      ${toJsonbFragment(after)},
      ${normalizeOptionalString(input.reason)},
      ${Math.round(input.timestamp)}
    );
  `)

  return { ok: true as const, eventId }
}

export async function listStoredAuditEvents(filters: {
  actionType?: AuditActionType
  entityType?: AuditEntityType
  actorId?: string
  entityId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  cursor?: string
  pageSize?: number
}): Promise<StoredAuditEventListResult> {
  await requireAuditLogTable()

  const whereClause = buildWhereClause(filters)
  const offset = parseCursor(filters.cursor)
  const pageSize = clampPageSize(filters.pageSize)

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS "count"
    FROM "governance_audit_log"
    ${whereClause};
  `)

  const rowsResult = await db.execute(sql`
    SELECT
      "event_id" AS "eventId",
      "actor_id" AS "actorId",
      "actor_email" AS "actorEmail",
      "actor_role" AS "actorRole",
      "action_type" AS "actionType",
      "entity_type" AS "entityType",
      "entity_id" AS "entityId",
      "entity_label" AS "entityLabel",
      "change_context_before" AS "changeContextBefore",
      "change_context_after" AS "changeContextAfter",
      "reason" AS "reason",
      "timestamp_ms" AS "timestamp"
    FROM "governance_audit_log"
    ${whereClause}
    ORDER BY "timestamp_ms" DESC, "event_id" DESC
    LIMIT ${pageSize}
    OFFSET ${offset};
  `)

  const totalCount = toNumber(((countResult as { rows?: CountRow[] }).rows || [])[0]?.count)
  const rows = (rowsResult as { rows?: AuditLogRow[] }).rows || []
  const items = rows.map(toStoredAuditEvent)

  return {
    items,
    totalCount,
    nextCursor: offset + pageSize < totalCount ? String(offset + pageSize) : null,
  }
}

export async function getStoredAuditEvent(eventId: string) {
  await requireAuditLogTable()

  const result = await db.execute(sql`
    SELECT
      "event_id" AS "eventId",
      "actor_id" AS "actorId",
      "actor_email" AS "actorEmail",
      "actor_role" AS "actorRole",
      "action_type" AS "actionType",
      "entity_type" AS "entityType",
      "entity_id" AS "entityId",
      "entity_label" AS "entityLabel",
      "change_context_before" AS "changeContextBefore",
      "change_context_after" AS "changeContextAfter",
      "reason" AS "reason",
      "timestamp_ms" AS "timestamp"
    FROM "governance_audit_log"
    WHERE "event_id" = ${eventId} AND ${publicGovernancePredicate}
    LIMIT 1;
  `)

  const row = ((result as { rows?: AuditLogRow[] }).rows || [])[0]
  return row ? toStoredAuditEvent(row) : null
}

export async function getStoredAuditSummary(): Promise<StoredAuditSummaryResult> {
  await requireAuditLogTable()

  const now = Date.now()
  const todayFloor = now - 24 * 60 * 60 * 1000
  const weekFloor = now - 7 * 24 * 60 * 60 * 1000

  const summaryResult = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE "timestamp_ms" >= ${todayFloor})::int AS "eventsToday",
      COUNT(*) FILTER (WHERE "timestamp_ms" >= ${weekFloor})::int AS "eventsThisWeek"
    FROM "governance_audit_log"
    WHERE ${publicGovernancePredicate};
  `)

  const actorResult = await db.execute(sql`
    SELECT
      "actor_id" AS "userId",
      COALESCE(MAX("actor_email"), "actor_id") AS "email",
      COUNT(*)::int AS "eventCount"
    FROM "governance_audit_log"
    WHERE ${publicGovernancePredicate}
    GROUP BY "actor_id"
    ORDER BY COUNT(*) DESC, "actor_id" ASC
    LIMIT 1;
  `)

  const entityResult = await db.execute(sql`
    SELECT
      "entity_type" AS "entityType"
    FROM "governance_audit_log"
    WHERE ${publicGovernancePredicate}
    GROUP BY "entity_type"
    ORDER BY COUNT(*) DESC, "entity_type" ASC
    LIMIT 1;
  `)

  const summaryRow = ((summaryResult as { rows?: SummaryRow[] }).rows || [])[0]
  const actorRow = ((actorResult as { rows?: MostActiveActorRow[] }).rows || [])[0]
  const entityRow = ((entityResult as { rows?: MostChangedEntityRow[] }).rows || [])[0]

  return {
    eventsToday: toNumber(summaryRow?.eventsToday),
    eventsThisWeek: toNumber(summaryRow?.eventsThisWeek),
    mostActiveActor: actorRow
      ? {
          userId: actorRow.userId,
          email: actorRow.email || actorRow.userId,
          eventCount: toNumber(actorRow.eventCount),
        }
      : null,
    mostChangedEntityType: entityRow?.entityType || 'PATHWAY',
  }
}
