import { convexToJson } from 'convex/values'
import { sql } from 'drizzle-orm'
import { boundedChange, auditText } from '../../../shared/utils/governanceAudit'
import { getSqlDatabase, type SqlExecutor } from '../database'

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
  changeSummary: string | null
  stateDigests?: { before: string; after: string } | null
  truncated?: boolean
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
  changeSummary?: string
  stateDigests?: { before: string; after: string }
  truncated?: boolean
}

function createEventId() {
  return `audit-${crypto.randomUUID()}`
}

function normalizePostgresText(value: string) {
  return value.replaceAll('\0', '�').replace(/\p{Cs}/gu, '�')
}

function stringifyPostgresJson(value: unknown) {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (typeof item === 'string') return normalizePostgresText(item)
    if (
      typeof item === 'bigint' ||
      item instanceof ArrayBuffer ||
      (typeof item === 'number' && (!Number.isFinite(item) || Object.is(item, -0)))
    ) {
      return convexToJson(item)
    }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [normalizePostgresText(key), entry]),
      )
    }
    return item
  })
}

export function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = normalizePostgresText(value).trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeJsonRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return JSON.parse(stringifyPostgresJson(value)) as Record<string, unknown>
}

function toJsonbFragment(value: Record<string, unknown> | null) {
  if (!value) {
    return sql`NULL`
  }

  return sql`${stringifyPostgresJson(value)}::jsonb`
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
    changeSummary: row.changeSummary ?? undefined,
    stateDigests: row.stateDigests ?? undefined,
    truncated: row.truncated ?? false,
  }
}

async function requireAuditLogTable(database: SqlExecutor = getSqlDatabase()) {
  try {
    await database.execute(
      sql`SELECT "state_digests", "truncated", "change_summary" FROM "governance_audit_log" LIMIT 0`,
    )
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Audit storage is unavailable. Contact the operator.',
    })
  }
}

const publicGovernancePredicate = sql`"entity_type" IN ('PATHWAY', 'PATHWAY_RULE', 'EVIDENCE_SOURCE')`

function buildWhereClause(
  filters: {
    actionType?: AuditActionType
    entityType?: AuditEntityType
    actorId?: string
    entityId?: string
    search?: string
    dateFrom?: string
    dateTo?: string
  },
  upper?: AuditPosition,
  before?: AuditPosition,
) {
  const conditions = [publicGovernancePredicate]

  if (filters.actionType) {
    conditions.push(sql`"action_type" = ${filters.actionType}`)
  }

  if (filters.entityType) {
    conditions.push(sql`"entity_type" = ${filters.entityType}`)
  }

  if (filters.actorId?.trim()) {
    conditions.push(sql`"actor_id" = ${normalizePostgresText(filters.actorId.trim())}`)
  }

  if (filters.entityId?.trim()) {
    conditions.push(sql`"entity_id" = ${normalizePostgresText(filters.entityId.trim())}`)
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
    const query = `%${normalizePostgresText(filters.search.trim()).replace(/([\\%_])/g, '\\$1')}%`
    conditions.push(sql`(
      "event_id" ILIKE ${query}
      OR "entity_id" ILIKE ${query}
      OR "entity_label" ILIKE ${query}
      OR "actor_id" ILIKE ${query}
      OR COALESCE("actor_email", '') ILIKE ${query}
      OR COALESCE("reason", '') ILIKE ${query}
    )`)
  }

  if (upper)
    conditions.push(
      sql`("timestamp_ms", "event_id" COLLATE "C") <= (${upper.timestamp}, ${upper.eventId})`,
    )
  if (before)
    conditions.push(
      sql`("timestamp_ms", "event_id" COLLATE "C") < (${before.timestamp}, ${before.eventId})`,
    )

  return conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``
}

export async function insertAuditLogEvent(
  input: Omit<StoredAuditEvent, 'eventId'>,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requireAuditLogTable(database)

  const eventId = createEventId()
  const change = await boundedChange(input.changeContext.before, input.changeContext.after)
  const before = normalizeJsonRecord(change.changeContext.before)
  const after = normalizeJsonRecord(change.changeContext.after)
  const changedKeys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ].filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
  const changeSummary = auditText(
    `${before ? (after ? 'Changed' : 'Deleted') : 'Created'}: ${changedKeys.join(', ')}`,
    512,
  )
  const clockResult = await database.execute(sql`
    INSERT INTO "governance_audit_clock" ("id", "timestamp_ms")
    VALUES (1, GREATEST(${Math.round(input.timestamp)}, COALESCE((SELECT MAX("timestamp_ms") + 1 FROM "governance_audit_log"), 0)))
    ON CONFLICT ("id") DO UPDATE SET "timestamp_ms" = GREATEST(EXCLUDED."timestamp_ms", "governance_audit_clock"."timestamp_ms" + 1)
    RETURNING "timestamp_ms" AS "timestamp";
  `)
  const timestamp = toNumber(
    (clockResult as { rows: { timestamp: number | string }[] }).rows[0]?.timestamp,
  )

  await database.execute(sql`
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
      "timestamp_ms", "state_digests", "truncated", "change_summary"
    )
    VALUES (
      ${eventId},
      ${normalizePostgresText(input.actorId)},
      ${normalizeOptionalString(input.actorEmail)},
      ${normalizeOptionalString(input.actorRole)},
      ${input.actionType},
      ${input.entityType},
      ${normalizePostgresText(input.entityId)},
      ${auditText(input.entityLabel)},
      ${toJsonbFragment(before)},
      ${toJsonbFragment(after)},
      ${input.reason ? auditText(input.reason, 512) : null},
      ${timestamp}, ${JSON.stringify(change.stateDigests)}::jsonb, ${change.truncated}, ${changeSummary}
    );
  `)

  return { ok: true as const, eventId }
}

export type AuditPosition = { timestamp: number; eventId: string }
export type AuditStoreFilters = {
  actionType?: AuditActionType
  entityType?: AuditEntityType
  actorId?: string
  entityId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

const metadataColumns = sql`
  "event_id" AS "eventId", "actor_id" AS "actorId", "actor_email" AS "actorEmail", "actor_role" AS "actorRole",
  "action_type" AS "actionType", "entity_type" AS "entityType", "entity_id" AS "entityId", LEFT("entity_label", 1024) AS "entityLabel",
  LEFT("reason", 512) AS "reason", "timestamp_ms" AS "timestamp", "change_summary" AS "changeSummary"
`

export async function listStoredAuditEvents(
  filters: AuditStoreFilters,
  options: { limit: number; upper?: AuditPosition; before?: AuditPosition; includeCount: boolean },
) {
  const database = getSqlDatabase()
  await requireAuditLogTable(database)
  const result = await database.execute(sql`
    SELECT ${metadataColumns}
    FROM "governance_audit_log" ${buildWhereClause(filters, options.upper, options.before)}
    ORDER BY "timestamp_ms" DESC, "event_id" COLLATE "C" DESC LIMIT ${options.limit};
  `)
  const rows = (result as { rows: AuditLogRow[] }).rows
  const items = rows.map((row) =>
    toStoredAuditEvent({ ...row, changeContextBefore: null, changeContextAfter: null }),
  )
  const upper =
    options.upper ??
    (items[0] ? { timestamp: items[0].timestamp, eventId: items[0].eventId } : undefined)
  let totalCount = 0
  if (options.includeCount && upper) {
    const count = await database.execute(
      sql`SELECT COUNT(*)::int AS "count" FROM "governance_audit_log" ${buildWhereClause(filters, upper)};`,
    )
    totalCount = toNumber((count as { rows: CountRow[] }).rows[0]?.count)
  }
  return { items, totalCount, upper }
}

export async function getStoredAuditEvent(eventId: string) {
  const database = getSqlDatabase()
  await requireAuditLogTable(database)
  const result = await database.execute(sql`
    SELECT ${metadataColumns}, "change_context_before" AS "changeContextBefore", "change_context_after" AS "changeContextAfter",
      "state_digests" AS "stateDigests", "truncated"
    FROM "governance_audit_log" WHERE "event_id" = ${normalizePostgresText(eventId)} AND ${publicGovernancePredicate} LIMIT 1;
  `)
  const row = (result as { rows: AuditLogRow[] }).rows[0]
  if (!row) return null
  const event = toStoredAuditEvent(row)
  if (!event.stateDigests)
    Object.assign(event, await boundedChange(event.changeContext.before, event.changeContext.after))
  return event
}

export type AuditSummaryParts = {
  eventsToday: number
  eventsThisWeek: number
  actors: { userId: string; email: string; eventCount: number }[]
  entities: { entityType: AuditEntityType; eventCount: number }[]
}

export async function getStoredAuditSummary(): Promise<AuditSummaryParts> {
  const database = getSqlDatabase()
  await requireAuditLogTable(database)
  const today = Math.floor(Date.now() / 86400000) * 86400000
  const count = await database.execute(sql`
    SELECT COALESCE(SUM("count") FILTER (WHERE "day" = ${today / 86400000}), 0)::int AS "eventsToday",
      COALESCE(SUM("count"), 0)::int AS "eventsThisWeek" FROM "governance_audit_counts"
    WHERE "kind" = 'day' AND "day" BETWEEN ${today / 86400000 - 6} AND ${today / 86400000};
  `)
  const actors = await database.execute(sql`
    SELECT "key" AS "userId", COALESCE("label", "key") AS "email", "count" AS "eventCount"
    FROM "governance_audit_counts" WHERE "kind" = 'actor' ORDER BY "key" LIMIT 101;
  `)
  const entities = await database.execute(sql`
    SELECT "key" AS "entityType", "count" AS "eventCount" FROM "governance_audit_counts" WHERE "kind" = 'entity' ORDER BY "key" LIMIT 3;
  `)
  const actorRows = (actors as { rows: MostActiveActorRow[] }).rows
  if (actorRows.length > 100)
    throw createError({
      statusCode: 503,
      statusMessage: 'Audit summary exceeded its actor budget. Contact the operator.',
    })
  const summary = (count as { rows: SummaryRow[] }).rows[0]
  return {
    eventsToday: toNumber(summary?.eventsToday),
    eventsThisWeek: toNumber(summary?.eventsThisWeek),
    actors: actorRows.map((row) => ({
      userId: row.userId,
      email: row.email ?? row.userId,
      eventCount: toNumber(row.eventCount),
    })),
    entities: (
      entities as { rows: (MostChangedEntityRow & { eventCount: number | string })[] }
    ).rows.map((row) => ({ entityType: row.entityType, eventCount: toNumber(row.eventCount) })),
  }
}
