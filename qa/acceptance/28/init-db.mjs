// Operator-only local bootstrap. No deployed route or app code is changed.
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { pushSchema } from 'drizzle-kit/api'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
const root = path.resolve(process.argv[2])
const config = JSON.parse(await fs.readFile(path.join(root, '.nuxt/hub/db/config.json'), 'utf8'))
const schema = await import(pathToFileURL(path.join(root, '.nuxt/hub/db/schema.mjs')).href)
const dbDir = path.resolve(root, process.env.QA_DB_DIR || config.db.connection.dataDir)
await fs.mkdir(path.dirname(dbDir), { recursive: true })
const client = new PGlite(dbDir)
try {
  const plan = await pushSchema(schema, drizzle(client))
  if (plan.hasDataLoss) throw Error('Refuse destructive initialization')
  await plan.apply()
  // Auth schema is generated; these historical domain tables live in SQL migrations.
  for (const [table, name] of [
    ['intake_draft', '0001_guided_intake_draft.sql'],
    ['recommendation_profiles', '0002_recommendation_profiles.sql'],
  ]) {
    const existing = await client.query('select to_regclass($1) as value', [table])
    if (!existing.rows[0].value)
      await client.exec(
        await fs.readFile(path.join(root, 'server/db/migrations/postgresql', name), 'utf8'),
      )
  }
  const sourceColumn = await client.query(
    "select 1 from information_schema.columns where table_name='intake_draft' and column_name='sourceRunId'",
  )
  if (!sourceColumn.rows.length)
    await client.exec(
      await fs.readFile(
        path.join(root, 'server/db/migrations/postgresql/0003_intake_draft_source_run.sql'),
        'utf8',
      ),
    )
  console.log(
    JSON.stringify({
      dbDir,
      statements: plan.statementsToExecute.length,
      tables: (
        await client.query(
          "select tablename from pg_tables where schemaname='public' order by tablename",
        )
      ).rows,
    }),
  )
} finally {
  await client.close()
}
