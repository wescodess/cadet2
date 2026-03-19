import { sql } from 'drizzle-orm'

import {
  MVP_PATHWAY_CATALOG,
  MVP_PATHWAY_IDS,
  MVP_PATHWAY_INVENTORY_SEEDS,
  type MvpPathwayDefinition,
} from './mvpPathwayCatalog'
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

type CountRow = {
  count: number | string
}

export class PathwayDefinitionConflictError extends Error {
  constructor(message = 'Pathway definition already exists') {
    super(message)
    this.name = 'PathwayDefinitionConflictError'
  }
}

const pathwayCatalogById = new Map(
  MVP_PATHWAY_CATALOG.map(pathway => [pathway.pathwayId, pathway] as const),
)

const pathwayOrderCase = sql.join(
  MVP_PATHWAY_IDS.map((pathwayId, index) => sql`WHEN "pathway_id" = ${pathwayId} THEN ${index}`),
  sql` `,
)

const seededPathwayEntries = MVP_PATHWAY_INVENTORY_SEEDS.map((seed) => {
  return {
    id: `pathway-${seed.pathwayId}`,
    pathwayId: seed.pathwayId,
    displayName: seed.displayName,
    description: seed.description,
  }
})

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

function isMissingRelationError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : ''
  const message = error instanceof Error ? error.message : ''

  return code === '42P01' || message.includes('pathway_definitions') && message.includes('does not exist')
}

function isUniqueViolationError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : ''

  return code === '23505'
}

async function ensureSeededPathwayDefinitions() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "pathway_definitions" (
      "id" varchar(120) PRIMARY KEY,
      "pathway_id" varchar(100) NOT NULL UNIQUE,
      "display_name" varchar(255) NOT NULL,
      "description" text,
      "status" varchar(20) NOT NULL DEFAULT 'active',
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now()
    );
  `)

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS "count"
    FROM "pathway_definitions";
  `)
  const row = ((countResult as { rows?: CountRow[] }).rows || [])[0]
  const count = Number(row?.count || 0)

  if (count > 0) {
    return
  }

  await db.execute(sql`
    INSERT INTO "pathway_definitions" (
      "id",
      "pathway_id",
      "display_name",
      "description",
      "status",
      "created_at",
      "updated_at"
    )
    VALUES
      (${seededPathwayEntries[0]!.id}, ${seededPathwayEntries[0]!.pathwayId}, ${seededPathwayEntries[0]!.displayName}, ${seededPathwayEntries[0]!.description}, 'active', now(), now()),
      (${seededPathwayEntries[1]!.id}, ${seededPathwayEntries[1]!.pathwayId}, ${seededPathwayEntries[1]!.displayName}, ${seededPathwayEntries[1]!.description}, 'active', now(), now()),
      (${seededPathwayEntries[2]!.id}, ${seededPathwayEntries[2]!.pathwayId}, ${seededPathwayEntries[2]!.displayName}, ${seededPathwayEntries[2]!.description}, 'active', now(), now())
    ON CONFLICT ("pathway_id") DO NOTHING;
  `)
}

async function listPathwayDefinitionRows(status?: PathwayDefinitionStatus) {
  await ensureSeededPathwayDefinitions()

  const whereClause = status
    ? sql`WHERE "status" = ${status}`
    : sql``

  const result = await db.execute(sql`
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

  return ((result as { rows?: PathwayDefinitionRow[] }).rows || [])
}

export async function listPathwayDefinitions(status?: PathwayDefinitionStatus) {
  const rows = await listPathwayDefinitionRows(status)
  return rows.map(toPathwayDefinitionRecord)
}

export async function getPathwayDefinition(pathwayId: string) {
  await ensureSeededPathwayDefinitions()

  const result = await db.execute(sql`
    SELECT
      "pathway_id" AS "pathwayId",
      "display_name" AS "displayName",
      "description" AS "description",
      "status" AS "status",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
    FROM "pathway_definitions"
    WHERE "pathway_id" = ${pathwayId}
    LIMIT 1;
  `)

  const row = ((result as { rows?: PathwayDefinitionRow[] }).rows || [])[0]
  return row ? toPathwayDefinitionRecord(row) : null
}

export async function createPathwayDefinition(input: CreatePathwayDefinitionInput) {
  await ensureSeededPathwayDefinitions()

  try {
    const result = await db.execute(sql`
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
  }
  catch (error) {
    if (isUniqueViolationError(error)) {
      throw new PathwayDefinitionConflictError()
    }

    throw error
  }
}

export async function updatePathwayDefinition(pathwayId: string, input: UpdatePathwayDefinitionInput) {
  await ensureSeededPathwayDefinitions()

  const result = await db.execute(sql`
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

export async function updatePathwayStatus(pathwayId: string, status: PathwayDefinitionStatus) {
  await ensureSeededPathwayDefinitions()

  const result = await db.execute(sql`
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
  return items.map(item => item.pathwayId)
}

export async function resolveRecommendationPathwayIds() {
  try {
    const activeIds = await listActivePathwayIds()
    return activeIds.filter((pathwayId): pathwayId is typeof MVP_PATHWAY_IDS[number] => MVP_PATHWAY_IDS.includes(pathwayId as typeof MVP_PATHWAY_IDS[number]))
  }
  catch (error) {
    if (isMissingRelationError(error)) {
      return [...MVP_PATHWAY_IDS]
    }

    throw error
  }
}

export async function resolveRecommendationPathwayCatalog(): Promise<readonly MvpPathwayDefinition[]> {
  const activeIds = await resolveRecommendationPathwayIds()
  return activeIds
    .map(pathwayId => pathwayCatalogById.get(pathwayId))
    .filter((pathway): pathway is MvpPathwayDefinition => Boolean(pathway))
}
