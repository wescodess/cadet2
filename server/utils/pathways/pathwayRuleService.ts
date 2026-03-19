import { sql } from 'drizzle-orm'

import {
  MVP_PATHWAY_IDS,
  MVP_PATHWAY_INVENTORY_SEEDS,
  type MvpPathwayDefinition,
  type MvpPathwayId,
} from './mvpPathwayCatalog'
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

const seededPathwayDefinitionEntries = MVP_PATHWAY_INVENTORY_SEEDS.map(seed => ({
  id: `pathway-${seed.pathwayId}`,
  pathwayId: seed.pathwayId,
  displayName: seed.displayName,
  description: seed.description,
}))

const seededPathwayRuleEntries: Array<{
  id: string
  pathwayId: MvpPathwayId
  unmetConditionId: string
  fieldPath: PathwayRuleRecord['fieldPath']
  operator: PathwayRuleRecord['operator']
  comparisonValue: PathwayRuleComparisonValue
  displayOrder: number
}> = [
  {
    id: 'pathway-rule-mvp-skilled-worker-english-clb',
    pathwayId: 'mvp-skilled-worker',
    unmetConditionId: 'minimum-english-clb-8',
    fieldPath: 'englishClb',
    operator: '>=',
    comparisonValue: 8,
    displayOrder: 0,
  },
  {
    id: 'pathway-rule-mvp-skilled-worker-experience',
    pathwayId: 'mvp-skilled-worker',
    unmetConditionId: 'minimum-skilled-experience-2-years',
    fieldPath: 'yearsSkilledExperience',
    operator: '>=',
    comparisonValue: 2,
    displayOrder: 1,
  },
  {
    id: 'pathway-rule-mvp-skilled-worker-funds',
    pathwayId: 'mvp-skilled-worker',
    unmetConditionId: 'minimum-settlement-funds-15000-cad',
    fieldPath: 'settlementFundsCad',
    operator: '>=',
    comparisonValue: 15000,
    displayOrder: 2,
  },
  {
    id: 'pathway-rule-mvp-provincial-nominee-offer',
    pathwayId: 'mvp-provincial-nominee',
    unmetConditionId: 'requires-valid-job-offer',
    fieldPath: 'hasValidJobOffer',
    operator: '==',
    comparisonValue: true,
    displayOrder: 0,
  },
  {
    id: 'pathway-rule-mvp-provincial-nominee-relocation',
    pathwayId: 'mvp-provincial-nominee',
    unmetConditionId: 'requires-relocation-flexibility',
    fieldPath: 'openToRelocation',
    operator: '==',
    comparisonValue: true,
    displayOrder: 1,
  },
  {
    id: 'pathway-rule-mvp-study-to-work-intent',
    pathwayId: 'mvp-study-to-work',
    unmetConditionId: 'requires-study-or-retraining-intent',
    fieldPath: 'willingToStudyOrRetrain',
    operator: '==',
    comparisonValue: true,
    displayOrder: 0,
  },
  {
    id: 'pathway-rule-mvp-study-to-work-budget',
    pathwayId: 'mvp-study-to-work',
    unmetConditionId: 'minimum-budget-25000-cad',
    fieldPath: 'budgetCad',
    operator: '>=',
    comparisonValue: 25000,
    displayOrder: 1,
  },
  {
    id: 'pathway-rule-mvp-study-to-work-timeline',
    pathwayId: 'mvp-study-to-work',
    unmetConditionId: 'minimum-timeline-10-months',
    fieldPath: 'targetTimelineMonths',
    operator: '>=',
    comparisonValue: 10,
    displayOrder: 2,
  },
]

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
    }
    catch {
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

function isUniqueViolationError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : ''

  return code === '23505'
}

async function touchPathwayDefinition(pathwayId: string) {
  await db.execute(sql`
    UPDATE "pathway_definitions"
    SET "updated_at" = now()
    WHERE "pathway_id" = ${pathwayId};
  `)
}

export function isMissingPathwayRuleRelationError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : ''
  const message = error instanceof Error ? error.message : ''

  return code === '42P01' || (message.includes('pathway_rules') && message.includes('does not exist'))
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

  const valuesSql = sql.join(
    seededPathwayDefinitionEntries.map(entry => sql`
      (${entry.id}, ${entry.pathwayId}, ${entry.displayName}, ${entry.description}, 'active', now(), now())
    `),
    sql`,`,
  )

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
    VALUES ${valuesSql}
    ON CONFLICT ("pathway_id") DO NOTHING;
  `)
}

export async function ensureSeededPathwayRules() {
  await ensureSeededPathwayDefinitions()

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "pathway_rules" (
      "id" varchar(120) PRIMARY KEY,
      "pathway_id" varchar(100) NOT NULL REFERENCES "pathway_definitions" ("pathway_id") ON DELETE CASCADE,
      "unmet_condition_id" varchar(160) NOT NULL,
      "field_path" varchar(120) NOT NULL,
      "operator" varchar(8) NOT NULL,
      "comparison_value" jsonb NOT NULL,
      "display_order" integer NOT NULL DEFAULT 0,
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "pathway_rules_pathway_condition_unique" UNIQUE ("pathway_id", "unmet_condition_id")
    );
  `)

  const existingResult = await db.execute(sql`
    SELECT DISTINCT "pathway_id" AS "pathwayId"
    FROM "pathway_rules";
  `)

  const existingPathwayIds = new Set(
    (((existingResult as { rows?: Array<{ pathwayId: string }> }).rows) || [])
      .map(row => row.pathwayId),
  )

  const missingSeedRows = seededPathwayRuleEntries.filter(entry => !existingPathwayIds.has(entry.pathwayId))

  if (missingSeedRows.length === 0) {
    return
  }

  const valuesSql = sql.join(
    missingSeedRows.map(entry => sql`
      (
        ${entry.id},
        ${entry.pathwayId},
        ${entry.unmetConditionId},
        ${entry.fieldPath},
        ${entry.operator},
        ${JSON.stringify(entry.comparisonValue)}::jsonb,
        ${entry.displayOrder},
        now(),
        now()
      )
    `),
    sql`,`,
  )

  await db.execute(sql`
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
    VALUES ${valuesSql}
    ON CONFLICT ("id") DO NOTHING;
  `)
}

async function insertRuleRow(pathwayId: string, rule: PathwayRuleInput, displayOrder: number) {
  const parsed = pathwayRuleInputSchema.parse(rule)

  try {
    const result = await db.execute(sql`
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
    await touchPathwayDefinition(pathwayId)
    return row ? toPathwayRuleRecord(row) : null
  }
  catch (error) {
    if (isUniqueViolationError(error)) {
      throw new PathwayRuleConflictError()
    }

    throw error
  }
}

export async function listRulesForPathway(pathwayId: string) {
  await ensureSeededPathwayRules()

  const result = await db.execute(sql`
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

  return (((result as { rows?: PathwayRuleRow[] }).rows) || []).map(toPathwayRuleRecord)
}

export const listPathwayRules = listRulesForPathway

export async function listPathwayRulesByPathwayIds(pathwayIds: string[]) {
  if (pathwayIds.length === 0) {
    return new Map<string, PathwayRuleRecord[]>()
  }

  await ensureSeededPathwayRules()

  const result = await db.execute(sql`
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
    WHERE "pathway_id" IN (${sql.join(pathwayIds.map(pathwayId => sql`${pathwayId}`), sql`,`)})
    ORDER BY "pathway_id" ASC, "display_order" ASC, "created_at" ASC;
  `)

  const grouped = new Map<string, PathwayRuleRecord[]>()

  for (const row of (((result as { rows?: PathwayRuleRow[] }).rows) || []).map(toPathwayRuleRecord)) {
    const current = grouped.get(row.pathwayId) || []
    current.push(row)
    grouped.set(row.pathwayId, current)
  }

  return grouped
}

export async function createRule(pathwayId: string, input: PathwayRuleInput) {
  await ensureSeededPathwayRules()

  const currentRules = await listRulesForPathway(pathwayId)
  const nextDisplayOrder = currentRules.reduce((maxOrder, rule) => Math.max(maxOrder, rule.displayOrder), -1) + 1
  return insertRuleRow(pathwayId, input, nextDisplayOrder)
}

export async function updateRule(ruleId: string, input: PathwayRuleInput, pathwayId?: string) {
  await ensureSeededPathwayRules()

  const parsed = pathwayRuleInputSchema.parse(input)

  try {
    const pathwayClause = pathwayId
      ? sql`AND "pathway_id" = ${pathwayId}`
      : sql``

    const result = await db.execute(sql`
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

    await touchPathwayDefinition(row.pathwayId)
    return toPathwayRuleRecord(row)
  }
  catch (error) {
    if (isUniqueViolationError(error)) {
      throw new PathwayRuleConflictError()
    }

    throw error
  }
}

export async function deleteRule(ruleId: string, pathwayId?: string) {
  await ensureSeededPathwayRules()

  const pathwayClause = pathwayId
    ? sql`AND "pathway_id" = ${pathwayId}`
    : sql``

  const result = await db.execute(sql`
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

  await touchPathwayDefinition(row.pathwayId)
  return toPathwayRuleRecord(row)
}

export async function bulkSaveRules(pathwayId: string, rules: PathwayRuleInput[]) {
  await ensureSeededPathwayRules()
  const parsedRules = rules.map(rule => pathwayRuleInputSchema.parse(rule))

  await db.execute(sql`
    DELETE FROM "pathway_rules"
    WHERE "pathway_id" = ${pathwayId};
  `)

  const valuesSql = sql.join(
    parsedRules.map((rule, index) => sql`
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
    `),
    sql`,`,
  )

  await db.execute(sql`
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

  await touchPathwayDefinition(pathwayId)

  return await listRulesForPathway(pathwayId)
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

export async function resolveStoredRecommendationPathwayCatalog(pathwayIds: readonly MvpPathwayId[]) {
  const groupedRules = await listPathwayRulesByPathwayIds([...pathwayIds])

  return pathwayIds
    .filter(pathwayId => groupedRules.has(pathwayId))
    .map(pathwayId => buildPathwayDefinitionFromStoredRules(pathwayId, groupedRules.get(pathwayId) || []))
}

export function getSeededRecommendationPathwayIds() {
  return [...MVP_PATHWAY_IDS]
}
