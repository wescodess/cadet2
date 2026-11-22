// Quiescent operator snapshots: export the real local Convex deployment and copy
// the local PGlite files before opening that copy, never the server's open database.
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { runtimeDirectory } from './runtime-directory.mjs'
import { runConvex } from './operator-cli.mjs'
const root = path.resolve(process.argv[2]),
  out = path.resolve(process.argv[3])
const runtime = runtimeDirectory(root)
const scratch = await fs.mkdtemp(path.join(runtime, 'digest-'))
const zip = path.join(scratch, 'convex.zip')
const hash = (x) => crypto.createHash('sha256').update(x).digest('hex')
try {
  runConvex(root, ['export', '--path', zip, '--env-file', path.join(runtime, 'self-hosted.env')], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const convex = JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import zipfile,json,hashlib,sys
out={}
with zipfile.ZipFile(sys.argv[1]) as z:
 for n in z.namelist():
  if n.endswith('/documents.jsonl'):
   rows=sorted(json.dumps(json.loads(x),sort_keys=True,separators=(',',':')) for x in z.read(n).decode().splitlines() if x)
   out[n.split('/')[0]]={'rows':len(rows),'sha256':hashlib.sha256('\\n'.join(rows).encode()).hexdigest()}
print(json.dumps(out,sort_keys=True))`,
        zip,
      ],
      { encoding: 'utf8' },
    ),
  )
  const config = JSON.parse(await fs.readFile(path.join(root, '.nuxt/hub/db/config.json'), 'utf8'))
  const dbDir = path.resolve(root, process.env.QA_DB_DIR || config.db.connection.dataDir)
  const copy = path.join(scratch, 'sql')
  await fs.cp(dbDir, copy, { recursive: true })
  const db = new PGlite(copy)
  let sql = {}
  try {
    const tables = (
      await db.query("select tablename from pg_tables where schemaname='public' order by tablename")
    ).rows
    for (const { tablename } of tables) {
      const rows = (
        await db.query(
          `select row_to_json(t)::text as value from "${tablename.replaceAll('"', '""')}" t`,
        )
      ).rows
        .map((r) => JSON.stringify(JSON.parse(r.value)))
        .sort()
      sql[tablename] = { rows: rows.length, sha256: hash(rows.join('\n')) }
    }
  } finally {
    await db.close()
  }
  const result = {
    time: new Date().toISOString(),
    artifact: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    convex,
    sql,
  }
  await fs.writeFile(out, JSON.stringify(result, null, 2))
  console.log(`Recorded table digests ${out}`)
} finally {
  await fs.rm(scratch, { recursive: true, force: true })
}
