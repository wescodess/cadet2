import { sql } from 'drizzle-orm'
import { getSqlDatabase, isUniqueViolationError, type SqlExecutor } from '../database'

import { MVP_PATHWAY_IDS, type MvpPathwayDefinition } from './mvpPathwayCatalog'
import { resolveStoredRecommendationPathwayCatalog } from './pathwayRuleService'
import {
  pathwayDefinitionRecordSchema,
  type CreatePathwayDefinitionInput,
  type PathwayDefinitionRecord,
  type PathwayDefinitionStatus,
  type UpdatePathwayDefinitionInput,
} from './pathwayDefinitionSchema'

type PathwayDefinitionRow = {
  pathwayId: string
  displayName: string
  description: string | null
  status: string
  createdAt: Date | string
  updatedAt: Date | string
}

export class PathwayDefinitionConflictError extends Error {
  constructor(message = 'Pathway definition already exists') {
    super(message)
    this.name = 'PathwayDefinitionConflictError'
  }
}

const pathwayOrderCase = sql.join(
  MVP_PATHWAY_IDS.map((pathwayId, index) => sql`WHEN "pathway_id" = ${pathwayId} THEN ${index}`),
  sql` `,
)

function toIsoString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function normalizeDescription(value: string | null) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toPathwayDefinitionRecord(row: PathwayDefinitionRow): PathwayDefinitionRecord {
  return pathwayDefinitionRecordSchema.parse({
    pathwayId: row.pathwayId,
    displayName: row.displayName,
    description: normalizeDescription(row.description),
    status: row.status,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  })
}

async function requirePathwayDefinitions(database: SqlExecutor) {
  try {
    await database.execute(sql`SELECT 1 FROM "pathway_definitions" LIMIT 0`)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Pathway storage is unavailable. Contact the operator.',
    })
  }
}

async function listPathwayDefinitionRows(
  status?: PathwayDefinitionStatus,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayDefinitions(database)

  const whereClause = status ? sql`WHERE "status" = ${status}` : sql``

  const result = await database.execute(sql`
    SELECT
      "pathway_id" AS "pathwayId",
      "display_name" AS "displayName",
      "description" AS "description",
      "status" AS "status",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
    FROM "pathway_definitions"
    ${whereClause}
    ORDER BY
      CASE
        ${pathwayOrderCase}
        ELSE 999
      END,
      "created_at" ASC,
      "pathway_id" ASC;
  `)

  return (result as { rows?: PathwayDefinitionRow[] }).rows || []
}

export async function listPathwayDefinitions(status?: PathwayDefinitionStatus) {
  const rows = await listPathwayDefinitionRows(status)
  return rows.map(toPathwayDefinitionRecord)
}

export async function getPathwayDefinition(
  pathwayId: string,
  database: SqlExecutor = getSqlDatabase(),
  forUpdate = false,
) {
  await requirePathwayDefinitions(database)

  const result = await database.execute(sql`
    SELECT
      "pathway_id" AS "pathwayId",
      "display_name" AS "displayName",
      "description" AS "description",
      "status" AS "status",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
    FROM "pathway_definitions"
    WHERE "pathway_id" = ${pathwayId}
    LIMIT 1
    ${forUpdate ? sql`FOR UPDATE` : sql``};
  `)

  const row = ((result as { rows?: PathwayDefinitionRow[] }).rows || [])[0]
  return row ? toPathwayDefinitionRecord(row) : null
}

export async function createPathwayDefinition(
  input: CreatePathwayDefinitionInput,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayDefinitions(database)

  try {
    const result = await database.execute(sql`
      INSERT INTO "pathway_definitions" (
        "id",
        "pathway_id",
        "display_name",
        "description",
        "status",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${`pathway-${input.pathwayId}`},
        ${input.pathwayId},
        ${input.displayName},
        ${input.description ?? null},
        ${input.status},
        now(),
        now()
      )
      RETURNING
        "pathway_id" AS "pathwayId",
        "display_name" AS "displayName",
        "description" AS "description",
        "status" AS "status",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt";
    `)

    const row = ((result as { rows?: PathwayDefinitionRow[] }).rows || [])[0]
    return row ? toPathwayDefinitionRecord(row) : null
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw new PathwayDefinitionConflictError()
    }

    throw error
  }
}

export async function updatePathwayDefinition(
  pathwayId: string,
  input: UpdatePathwayDefinitionInput,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayDefinitions(database)

  const result = await database.execute(sql`
    UPDATE "pathway_definitions"
    SET
      "display_name" = ${input.displayName},
      "description" = ${input.description ?? null},
      "updated_at" = now()
    WHERE "pathway_id" = ${pathwayId}
    RETURNING
      "pathway_id" AS "pathwayId",
      "display_name" AS "displayName",
      "description" AS "description",
      "status" AS "status",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt";
  `)

  const row = ((result as { rows?: PathwayDefinitionRow[] }).rows || [])[0]
  return row ? toPathwayDefinitionRecord(row) : null
}

export async function updatePathwayStatus(
  pathwayId: string,
  status: PathwayDefinitionStatus,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayDefinitions(database)

  const result = await database.execute(sql`
    UPDATE "pathway_definitions"
    SET
      "status" = ${status},
      "updated_at" = now()
    WHERE "pathway_id" = ${pathwayId}
    RETURNING
      "pathway_id" AS "pathwayId",
      "display_name" AS "displayName",
      "description" AS "description",
      "status" AS "status",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt";
  `)

  const row = ((result as { rows?: PathwayDefinitionRow[] }).rows || [])[0]
  return row ? toPathwayDefinitionRecord(row) : null
}

export async function listActivePathwayIds() {
  const items = await listPathwayDefinitions('active')
  return items.map((item) => item.pathwayId)
}

export async function resolveRecommendationPathwayIds() {
  const activeIds = await listActivePathwayIds()
  return activeIds.filter((pathwayId): pathwayId is (typeof MVP_PATHWAY_IDS)[number] =>
    MVP_PATHWAY_IDS.includes(pathwayId as (typeof MVP_PATHWAY_IDS)[number]),
  )
}

export async function resolveRecommendationPathwayCatalog(): Promise<
  readonly MvpPathwayDefinition[]
> {
  const activeIds = await resolveRecommendationPathwayIds()
  return resolveStoredRecommendationPathwayCatalog(activeIds)
}
