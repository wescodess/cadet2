import { getHeader, type H3Event } from 'h3'
import { sql } from 'drizzle-orm'
import { stateDigest } from '../../../shared/utils/governanceAudit'
import type { SqlExecutor } from '../database'

export function requireIdempotencyKey(event: H3Event) {
  const key = getHeader(event, 'idempotency-key')
  if (!key || !/^[A-Za-z0-9:_-]{8,128}$/.test(key)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid Idempotency-Key header is required',
    })
  }
  return key
}

export async function withCreateReceipt<T>(
  database: SqlExecutor,
  actorId: string,
  operation: string,
  key: string,
  payload: unknown,
  create: () => Promise<T>,
): Promise<T> {
  const digest = await stateDigest(payload)
  try {
    await database.execute(sql`SELECT 1 FROM "admin_create_receipts" LIMIT 0`)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'Create receipt storage is unavailable. Contact the operator.',
    })
  }
  await database.execute(sql`
    INSERT INTO "admin_create_receipts" ("actor_id", "operation", "key", "payload_digest") VALUES (${actorId}, ${operation}, ${key}, ${digest})
    ON CONFLICT ("actor_id", "operation", "key") DO NOTHING;
  `)
  const result = await database.execute(sql`
    SELECT "payload_digest" AS "digest", "receipt" FROM "admin_create_receipts"
    WHERE "actor_id" = ${actorId} AND "operation" = ${operation} AND "key" = ${key} FOR UPDATE;
  `)
  const row = (result as { rows: { digest: string; receipt: T | null }[] }).rows[0]
  if (!row || row.digest !== digest)
    throw createError({
      statusCode: 409,
      statusMessage: 'Idempotency key was already used with a different payload',
    })
  if (row.receipt !== null) return row.receipt
  const receipt = await create()
  await database.execute(sql`
    UPDATE "admin_create_receipts" SET "receipt" = ${JSON.stringify(receipt)}::jsonb
    WHERE "actor_id" = ${actorId} AND "operation" = ${operation} AND "key" = ${key};
  `)
  return receipt
}
