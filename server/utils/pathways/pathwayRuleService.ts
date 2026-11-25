import { sql } from 'drizzle-orm'
import { getSqlDatabase, isUniqueViolationError, type SqlExecutor } from '../database'

import { MVP_PATHWAY_IDS, type MvpPathwayDefinition, type MvpPathwayId } from './mvpPathwayCatalog'
import { buildPathwayRuleEvaluator } from './eligibilityDslEvaluator'
import {
  pathwayRuleInputSchema,
  pathwayRuleRecordSchema,
  type PathwayRuleComparisonValue,
  type PathwayRuleInput,
  type PathwayRuleRecord,
} from './pathwayRuleSchema'

type PathwayRuleRow = {
  id: string
  pathwayId: string
  unmetConditionId: string
  fieldPath: string
  operator: string
  comparisonValue: unknown
  displayOrder: number | string
  createdAt: Date | string
  updatedAt: Date | string
}

export class PathwayRuleConflictError extends Error {
  constructor(message = 'Pathway rule already exists for this pathway') {
    super(message)
    this.name = 'PathwayRuleConflictError'
  }
}

function toIsoString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function normalizeComparisonValue(value: unknown): PathwayRuleComparisonValue {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return ''
    }

    try {
      return JSON.parse(trimmed) as PathwayRuleComparisonValue
    } catch {
      return trimmed
    }
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  return String(value ?? '')
}

function toPathwayRuleRecord(row: PathwayRuleRow) {
  return pathwayRuleRecordSchema.parse({
    id: row.id,
    pathwayId: row.pathwayId,
    unmetConditionId: row.unmetConditionId,
    fieldPath: row.fieldPath,
    operator: row.operator,
    comparisonValue: normalizeComparisonValue(row.comparisonValue),
    displayOrder: Number(row.displayOrder || 0),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  })
}

async function touchPathwayDefinition(pathwayId: string, database: SqlExecutor) {
  await database.execute(sql`
    UPDATE "pathway_definitions"
    SET "updated_at" = now()
    WHERE "pathway_id" = ${pathwayId};
  `)
}

async function requirePathwayRules(database: SqlExecutor) {
  try {
    await database.execute(sql`SELECT 1 FROM "pathway_definitions", "pathway_rules" LIMIT 0`)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Pathway storage is unavailable. Contact the operator.',
    })
  }
}

async function insertRuleRow(
  pathwayId: string,
  rule: PathwayRuleInput,
  displayOrder: number,
  database: SqlExecutor,
) {
  const parsed = pathwayRuleInputSchema.parse(rule)

  try {
    const result = await database.execute(sql`
      INSERT INTO "pathway_rules" (
        "id",
        "pathway_id",
        "unmet_condition_id",
        "field_path",
        "operator",
        "comparison_value",
        "display_order",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${parsed.id?.trim() || `${pathwayId}-rule-${crypto.randomUUID()}`},
        ${pathwayId},
        ${parsed.unmetConditionId},
        ${parsed.fieldPath},
        ${parsed.operator},
        ${JSON.stringify(parsed.comparisonValue)}::jsonb,
        ${displayOrder},
        now(),
        now()
      )
      RETURNING
        "id" AS "id",
        "pathway_id" AS "pathwayId",
        "unmet_condition_id" AS "unmetConditionId",
        "field_path" AS "fieldPath",
        "operator" AS "operator",
        "comparison_value" AS "comparisonValue",
        "display_order" AS "displayOrder",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt";
    `)

    const row = ((result as { rows?: PathwayRuleRow[] }).rows || [])[0]
    await touchPathwayDefinition(pathwayId, database)
    return row ? toPathwayRuleRecord(row) : null
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw new PathwayRuleConflictError()
    }

    throw error
  }
}

export async function listRulesForPathway(
  pathwayId: string,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayRules(database)

  const result = await database.execute(sql`
    SELECT
      "id" AS "id",
      "pathway_id" AS "pathwayId",
      "unmet_condition_id" AS "unmetConditionId",
      "field_path" AS "fieldPath",
      "operator" AS "operator",
      "comparison_value" AS "comparisonValue",
      "display_order" AS "displayOrder",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
    FROM "pathway_rules"
    WHERE "pathway_id" = ${pathwayId}
    ORDER BY "display_order" ASC, "created_at" ASC;
  `)

  return ((result as { rows?: PathwayRuleRow[] }).rows || []).map(toPathwayRuleRecord)
}

export const listPathwayRules = listRulesForPathway

export async function listPathwayRulesByPathwayIds(
  pathwayIds: string[],
  database: SqlExecutor = getSqlDatabase(),
) {
  if (pathwayIds.length === 0) {
    return new Map<string, PathwayRuleRecord[]>()
  }

  await requirePathwayRules(database)

  const result = await database.execute(sql`
    SELECT
      "id" AS "id",
      "pathway_id" AS "pathwayId",
      "unmet_condition_id" AS "unmetConditionId",
      "field_path" AS "fieldPath",
      "operator" AS "operator",
      "comparison_value" AS "comparisonValue",
      "display_order" AS "displayOrder",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
    FROM "pathway_rules"
    WHERE "pathway_id" IN (${sql.join(
      pathwayIds.map((pathwayId) => sql`${pathwayId}`),
      sql`,`,
    )})
    ORDER BY "pathway_id" ASC, "display_order" ASC, "created_at" ASC;
  `)

  const grouped = new Map<string, PathwayRuleRecord[]>()

  for (const row of ((result as { rows?: PathwayRuleRow[] }).rows || []).map(toPathwayRuleRecord)) {
    const current = grouped.get(row.pathwayId) || []
    current.push(row)
    grouped.set(row.pathwayId, current)
  }

  return grouped
}

export async function createRule(
  pathwayId: string,
  input: PathwayRuleInput,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayRules(database)

  const currentRules = await listRulesForPathway(pathwayId, database)
  const nextDisplayOrder =
    currentRules.reduce((maxOrder, rule) => Math.max(maxOrder, rule.displayOrder), -1) + 1
  return insertRuleRow(pathwayId, input, nextDisplayOrder, database)
}

export async function updateRule(
  ruleId: string,
  input: PathwayRuleInput,
  pathwayId?: string,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayRules(database)

  const parsed = pathwayRuleInputSchema.parse(input)

  try {
    const pathwayClause = pathwayId ? sql`AND "pathway_id" = ${pathwayId}` : sql``

    const result = await database.execute(sql`
      UPDATE "pathway_rules"
      SET
        "unmet_condition_id" = ${parsed.unmetConditionId},
        "field_path" = ${parsed.fieldPath},
        "operator" = ${parsed.operator},
        "comparison_value" = ${JSON.stringify(parsed.comparisonValue)}::jsonb,
        "updated_at" = now()
      WHERE "id" = ${ruleId}
      ${pathwayClause}
      RETURNING
        "id" AS "id",
        "pathway_id" AS "pathwayId",
        "unmet_condition_id" AS "unmetConditionId",
        "field_path" AS "fieldPath",
        "operator" AS "operator",
        "comparison_value" AS "comparisonValue",
        "display_order" AS "displayOrder",
        "created_at" AS "createdAt",
        "updated_at" AS "updatedAt";
    `)

    const row = ((result as { rows?: PathwayRuleRow[] }).rows || [])[0]

    if (!row) {
      return null
    }

    await touchPathwayDefinition(row.pathwayId, database)
    return toPathwayRuleRecord(row)
  } catch (error) {
    if (isUniqueViolationError(error)) {
      throw new PathwayRuleConflictError()
    }

    throw error
  }
}

export async function deleteRule(
  ruleId: string,
  pathwayId?: string,
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayRules(database)

  const pathwayClause = pathwayId ? sql`AND "pathway_id" = ${pathwayId}` : sql``

  const result = await database.execute(sql`
    DELETE FROM "pathway_rules"
    WHERE "id" = ${ruleId}
    ${pathwayClause}
    RETURNING
      "id" AS "id",
      "pathway_id" AS "pathwayId",
      "unmet_condition_id" AS "unmetConditionId",
      "field_path" AS "fieldPath",
      "operator" AS "operator",
      "comparison_value" AS "comparisonValue",
      "display_order" AS "displayOrder",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt";
  `)

  const row = ((result as { rows?: PathwayRuleRow[] }).rows || [])[0]

  if (!row) {
    return null
  }

  await touchPathwayDefinition(row.pathwayId, database)
  return toPathwayRuleRecord(row)
}

export async function bulkSaveRules(
  pathwayId: string,
  rules: PathwayRuleInput[],
  database: SqlExecutor = getSqlDatabase(),
) {
  await requirePathwayRules(database)
  const parsedRules = rules.map((rule) => pathwayRuleInputSchema.parse(rule))

  try {
    await database.execute(sql`
    DELETE FROM "pathway_rules"
    WHERE "pathway_id" = ${pathwayId};
  `)

    const valuesSql = sql.join(
      parsedRules.map(
        (rule, index) => sql`
      (
        ${rule.id?.trim() || `${pathwayId}-rule-${crypto.randomUUID()}`},
        ${pathwayId},
        ${rule.unmetConditionId},
        ${rule.fieldPath},
        ${rule.operator},
        ${JSON.stringify(rule.comparisonValue)}::jsonb,
        ${index},
        now(),
        now()
      )
    `,
      ),
      sql`,`,
    )

    await database.execute(sql`
    INSERT INTO "pathway_rules" (
      "id",
      "pathway_id",
      "unmet_condition_id",
      "field_path",
      "operator",
      "comparison_value",
      "display_order",
      "created_at",
      "updated_at"
    )
    VALUES ${valuesSql};
  `)

    await touchPathwayDefinition(pathwayId, database)

    return await listRulesForPathway(pathwayId, database)
  } catch (error) {
    if (isUniqueViolationError(error)) throw new PathwayRuleConflictError()
    throw error
  }
}

export const replacePathwayRules = bulkSaveRules

export function buildPathwayDefinitionFromStoredRules(
  pathwayId: MvpPathwayId,
  rules: PathwayRuleRecord[],
): MvpPathwayDefinition {
  return {
    pathwayId,
    rules: rules.map(buildPathwayRuleEvaluator),
  }
}

export async function resolveStoredRecommendationPathwayCatalog(
  pathwayIds: readonly MvpPathwayId[],
) {
  const groupedRules = await listPathwayRulesByPathwayIds([...pathwayIds])

  return pathwayIds
    .filter((pathwayId) => groupedRules.has(pathwayId))
    .map((pathwayId) =>
      buildPathwayDefinitionFromStoredRules(pathwayId, groupedRules.get(pathwayId) || []),
    )
}

export function getSeededRecommendationPathwayIds() {
  return [...MVP_PATHWAY_IDS]
}
