import { sql } from 'drizzle-orm'

import {
  recommendationReviewStateSchema,
  type RecommendationReviewState,
} from './recommendationReviewSchema'
import { toIsoString } from './reviewDateUtils'

type ReviewActor = {
  userId: string
  email: string
}

type RecommendationRunReviewStateRow = {
  runId: string
  reviewState: string
  reason: string | null
  actorUserId: string | null
  actorEmail: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

type RecommendationCitationReviewStateRow = {
  runId: string
  citationId: string
  sourceId: string | null
  reviewState: string
  reason: string | null
  actorUserId: string | null
  actorEmail: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export type RecommendationRunReviewStateRecord = {
  runId: string
  reviewState: RecommendationReviewState
  reason: string | null
  actorUserId: string | null
  actorEmail: string | null
  createdAt: string
  updatedAt: string
}

export type RecommendationCitationReviewStateRecord = {
  runId: string
  citationId: string
  sourceId: string | null
  reviewState: RecommendationReviewState
  reason: string | null
  actorUserId: string | null
  actorEmail: string | null
  createdAt: string
  updatedAt: string
}



function normalizeReviewState(value: string): RecommendationReviewState {
  const parsed = recommendationReviewStateSchema.safeParse(value)
  return parsed.success ? parsed.data : 'pending'
}

function toRunReviewStateRecord(row: RecommendationRunReviewStateRow): RecommendationRunReviewStateRecord {
  return {
    runId: row.runId,
    reviewState: normalizeReviewState(row.reviewState),
    reason: row.reason,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

function toCitationReviewStateRecord(row: RecommendationCitationReviewStateRow): RecommendationCitationReviewStateRecord {
  return {
    runId: row.runId,
    citationId: row.citationId,
    sourceId: row.sourceId,
    reviewState: normalizeReviewState(row.reviewState),
    reason: row.reason,
    actorUserId: row.actorUserId,
    actorEmail: row.actorEmail,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

let _tablesInitialized = false
let _initPromise: Promise<void> | null = null

async function ensureRecommendationReviewStateTables() {
  if (_tablesInitialized) {
    return
  }

  if (_initPromise) {
    return _initPromise
  }

  _initPromise = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "recommendation_review_states" (
        "run_id" text PRIMARY KEY,
        "review_state" varchar(20) NOT NULL DEFAULT 'pending',
        "reason" text,
        "actor_user_id" text,
        "actor_email" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "recommendation_review_states_review_state_idx"
      ON "recommendation_review_states" ("review_state");
    `)

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "recommendation_review_citation_states" (
        "run_id" text NOT NULL,
        "citation_id" text NOT NULL,
        "source_id" text,
        "review_state" varchar(20) NOT NULL DEFAULT 'pending',
        "reason" text,
        "actor_user_id" text,
        "actor_email" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("run_id", "citation_id")
      );
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "recommendation_review_citation_states_run_id_idx"
      ON "recommendation_review_citation_states" ("run_id");
    `)

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "recommendation_review_citation_states_review_state_idx"
      ON "recommendation_review_citation_states" ("review_state");
    `)

    _tablesInitialized = true
  })()

  return _initPromise
}

export async function loadRecommendationRunReviewStateMap(runIds: string[]) {
  await ensureRecommendationReviewStateTables()

  const uniqueRunIds = [...new Set(runIds.filter(Boolean))]
  if (uniqueRunIds.length === 0) {
    return new Map<string, RecommendationRunReviewStateRecord>()
  }

  const values = uniqueRunIds.map(runId => sql`${runId}`)
  const result = await db.execute(sql`
    SELECT
      "run_id" AS "runId",
      "review_state" AS "reviewState",
      "reason" AS "reason",
      "actor_user_id" AS "actorUserId",
      "actor_email" AS "actorEmail",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
    FROM "recommendation_review_states"
    WHERE "run_id" IN (${sql.join(values, sql`, `)});
  `)

  const rows = ((result as { rows?: RecommendationRunReviewStateRow[] }).rows || [])
  return new Map(rows.map(row => {
    const record = toRunReviewStateRecord(row)
    return [record.runId, record] as const
  }))
}

export async function loadRecommendationCitationReviewStateMap(runIds: string[]) {
  await ensureRecommendationReviewStateTables()

  const uniqueRunIds = [...new Set(runIds.filter(Boolean))]
  if (uniqueRunIds.length === 0) {
    return new Map<string, RecommendationCitationReviewStateRecord>()
  }

  const values = uniqueRunIds.map(runId => sql`${runId}`)
  const result = await db.execute(sql`
    SELECT
      "run_id" AS "runId",
      "citation_id" AS "citationId",
      "source_id" AS "sourceId",
      "review_state" AS "reviewState",
      "reason" AS "reason",
      "actor_user_id" AS "actorUserId",
      "actor_email" AS "actorEmail",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt"
    FROM "recommendation_review_citation_states"
    WHERE "run_id" IN (${sql.join(values, sql`, `)});
  `)

  const rows = ((result as { rows?: RecommendationCitationReviewStateRow[] }).rows || [])
  return new Map(rows.map((row) => {
    const record = toCitationReviewStateRecord(row)
    return [`${record.runId}:${record.citationId}`, record] as const
  }))
}

export async function setRecommendationRunReviewState(input: {
  runId: string
  reviewState: RecommendationReviewState
  reason: string
  actor: ReviewActor
}) {
  await ensureRecommendationReviewStateTables()

  const result = await db.execute(sql`
    INSERT INTO "recommendation_review_states" (
      "run_id",
      "review_state",
      "reason",
      "actor_user_id",
      "actor_email",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${input.runId},
      ${input.reviewState},
      ${input.reason},
      ${input.actor.userId},
      ${input.actor.email},
      now(),
      now()
    )
    ON CONFLICT ("run_id") DO UPDATE SET
      "review_state" = EXCLUDED."review_state",
      "reason" = EXCLUDED."reason",
      "actor_user_id" = EXCLUDED."actor_user_id",
      "actor_email" = EXCLUDED."actor_email",
      "updated_at" = now()
    RETURNING
      "run_id" AS "runId",
      "review_state" AS "reviewState",
      "reason" AS "reason",
      "actor_user_id" AS "actorUserId",
      "actor_email" AS "actorEmail",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt";
  `)

  const row = ((result as { rows?: RecommendationRunReviewStateRow[] }).rows || [])[0]
  if (!row) {
    return null
  }

  return toRunReviewStateRecord(row)
}

export async function setRecommendationCitationReviewState(input: {
  runId: string
  citationId: string
  sourceId: string | null
  reviewState: RecommendationReviewState
  reason: string
  actor: ReviewActor
}) {
  await ensureRecommendationReviewStateTables()

  const result = await db.execute(sql`
    INSERT INTO "recommendation_review_citation_states" (
      "run_id",
      "citation_id",
      "source_id",
      "review_state",
      "reason",
      "actor_user_id",
      "actor_email",
      "created_at",
      "updated_at"
    )
    VALUES (
      ${input.runId},
      ${input.citationId},
      ${input.sourceId},
      ${input.reviewState},
      ${input.reason},
      ${input.actor.userId},
      ${input.actor.email},
      now(),
      now()
    )
    ON CONFLICT ("run_id", "citation_id") DO UPDATE SET
      "source_id" = EXCLUDED."source_id",
      "review_state" = EXCLUDED."review_state",
      "reason" = EXCLUDED."reason",
      "actor_user_id" = EXCLUDED."actor_user_id",
      "actor_email" = EXCLUDED."actor_email",
      "updated_at" = now()
    RETURNING
      "run_id" AS "runId",
      "citation_id" AS "citationId",
      "source_id" AS "sourceId",
      "review_state" AS "reviewState",
      "reason" AS "reason",
      "actor_user_id" AS "actorUserId",
      "actor_email" AS "actorEmail",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt";
  `)

  const row = ((result as { rows?: RecommendationCitationReviewStateRow[] }).rows || [])[0]
  if (!row) {
    return null
  }

  return toCitationReviewStateRecord(row)
}
