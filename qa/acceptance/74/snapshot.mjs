import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const runtime = process.env.QA_RUNTIME_DIR
const { root } = JSON.parse(await fs.readFile(path.join(runtime, 'ready.json'), 'utf8'))
const state = {}
for (const table of [
  'sources',
  'approval_audit_log',
  'source_items',
  'ingestion_batches',
  'source_runs',
  'ai_search_sync_jobs',
  ...(path.basename(root) === 'candidate'
    ? [
        'auditLog',
        'rag_audit_counts',
        'rag_audit_details',
        'rag_audit_events',
        'rag_create_receipts',
        'rag_source_deletions',
      ]
    : []),
]) {
  const text = execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/convex/bin/main.js'),
      'data',
      table,
      '--format',
      'json',
      '--limit',
      '10000',
      '--env-file',
      path.join(runtime, 'self-hosted.env'),
    ],
    { cwd: runtime, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  state[table] = JSON.parse(text.trim() || '[]').sort((a, b) => a._id.localeCompare(b._id))
}
await fs.writeFile(process.argv[2], JSON.stringify(state, null, 2))
console.log(`Snapshot ${process.argv[2]}`)
