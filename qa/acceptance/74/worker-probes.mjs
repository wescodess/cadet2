import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { spawn } from 'node:child_process'
const runtime = process.env.QA_RUNTIME_DIR
const evidence = process.env.QA_EVIDENCE
const { root } = JSON.parse(await fs.readFile(path.join(runtime, 'ready.json'), 'utf8'))
const fixtures = JSON.parse(await fs.readFile(path.join(runtime, 'fixtures.json'), 'utf8'))
const account = JSON.parse(await fs.readFile(path.join(runtime, 'accounts.json'), 'utf8')).probes
  .reviewed
const records = []
const oracle =
  '#74 AC3: "Freeze eligibility/prepare/claim/execute/manual/force/schedule/retry/sync, including old jobs"; contract: "YouTube is excluded before preparation, including scheduled/force selection and idempotent reuse. Every old execution plan, batch/source claim, completion, retry and sync boundary rejects frozen work."'
function cli(args) {
  return execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/convex/bin/main.js'),
      ...args,
      '--env-file',
      path.join(runtime, 'self-hosted.env'),
    ],
    {
      cwd: runtime,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    },
  )
}
const rows = (table) =>
  JSON.parse(cli(['data', table, '--format', 'json', '--limit', '10000']).trim() || '[]')
function call(name, args) {
  try {
    return {
      denied: false,
      value: JSON.parse(cli(['run', `ragIngestionInternal:${name}`, JSON.stringify(args)])),
    }
  } catch (e) {
    if (!Number.isInteger(e.status) || e.status === 0) throw e
    return { denied: true, message: String(e.stderr || e.message) }
  }
}
function record(name, result, passed) {
  records.push({ name, result, passed, oracle })
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
}
const batch = fixtures.batches.find((b) => b.idempotencyKey === 'qa74-old-prepared-worker')
const sourceRun = fixtures.sourceRuns.find((r) => r.batchId === batch._id)
const yt = fixtures.sources.find((s) => s._id === sourceRun.sourceId)
const oldRunFor = (suffix) =>
  fixtures.sourceRuns.find(
    (run) =>
      run.batchId ===
      fixtures.batches.find((b) => b.idempotencyKey === `qa74-old-prepared-worker-${suffix}`)._id,
  )
const initialItems = rows('source_items')
const initialSync = rows('ai_search_sync_jobs')
const scheduledInputs = []
const actor = { actorUserId: account.userId, actorEmail: account.email }
for (const name of ['prepareManualBatchAsNuxtAdmin', 'runManualBatchAsNuxtAdmin']) {
  const result = call(name, {
    ...actor,
    sourceIds: [yt._id],
    force: true,
    idempotencyKey: `qa74-${name}`,
  })
  const prepared = rows('ingestion_batches').filter((b) => b.idempotencyKey === `qa74-${name}`)
  record(
    name,
    { ...result, prepared },
    (result.denied && /frozen|youtube|unavailable|disabled/i.test(result.message)) ||
      (!result.denied && prepared.every((b) => !b.dueSourceIds.includes(yt._id))),
  )
}
for (const name of ['prepareScheduledBatch', 'runScheduledBatch']) {
  const dueSource = {
    ...yt,
    enabled: true,
    status: 'approved',
    schedule: { frequency: 'daily' },
    nextRunAt: Date.now() - 10000,
  }
  const reset = path.join(runtime, 'worker-due-source.json')
  await fs.writeFile(
    reset,
    JSON.stringify(rows('sources').map((row) => (row._id === yt._id ? dueSource : row))),
  )
  cli(['import', '--table', 'sources', '--replace', '--yes', reset])
  scheduledInputs.push({
    name,
    sourceId: dueSource._id,
    status: dueSource.status,
    enabled: dueSource.enabled,
    schedule: dueSource.schedule,
    nextRunAt: dueSource.nextRunAt,
    probedAt: Date.now(),
  })
  const result = call(name, { force: true, idempotencyKey: `qa74-${name}` })
  const prepared = rows('ingestion_batches').filter((b) => b.idempotencyKey === `qa74-${name}`)
  const ytIds = new Set(
    fixtures.sources.filter((s) => s.type === 'youtube_channel').map((s) => s._id),
  )
  record(
    name,
    { ...result, prepared },
    (result.denied && /frozen|youtube|unavailable|disabled/i.test(result.message)) ||
      (!result.denied && prepared.every((b) => b.dueSourceIds.every((id) => !ytIds.has(id)))),
  )
}
const calls = [
  ['getBatchExecutionPlanFromNuxt', { batchId: batch._id }],
  ['startBatchExecutionFromNuxt', { batchId: batch._id }],
  ['markSourceRunStartedFromNuxt', { sourceRunId: sourceRun._id }],
  [
    'completeSourceRunFromNuxt',
    {
      sourceRunId: oldRunFor('complete')._id,
      status: 'succeeded',
      stats: sourceRun.stats,
      errors: [],
      sourceItemUpserts: [],
    },
  ],
  [
    'queueSourceRunRetryScaffold',
    { sourceRunId: oldRunFor('retry')._id, requestedByUserId: account.userId },
  ],
  ['createOrReuseAiSearchSyncJobForBatchFromNuxt', { batchId: oldRunFor('sync').batchId }],
]
const reused = call('prepareManualBatchAsNuxtAdmin', {
  ...actor,
  sourceIds: [yt._id],
  force: true,
  idempotencyKey: batch.idempotencyKey,
})
const reusedBatches = rows('ingestion_batches').filter(
  (row) => row.idempotencyKey === batch.idempotencyKey,
)
record(
  'idempotent reuse of old frozen prepared work',
  { ...reused, prepared: reusedBatches },
  (reused.denied && /frozen|youtube|unavailable|disabled/i.test(reused.message)) ||
    (!reused.denied && reusedBatches.every((row) => !row.dueSourceIds.includes(yt._id))),
)
for (const [name, args] of calls) {
  const result = call(name, args)
  record(name, result, result.denied && /frozen|youtube|unavailable|disabled/i.test(result.message))
}
record(
  'no frozen source item writes or sync jobs',
  { itemCount: rows('source_items').length, syncCount: rows('ai_search_sync_jobs').length },
  JSON.stringify(initialItems) === JSON.stringify(rows('source_items')) &&
    JSON.stringify(initialSync) === JSON.stringify(rows('ai_search_sync_jobs')),
)
await fs.mkdir(evidence, { recursive: true })
await fs.writeFile(
  path.join(evidence, 'worker-scheduled-inputs.json'),
  JSON.stringify(scheduledInputs, null, 2),
)
await fs.writeFile(
  path.join(evidence, 'worker-results.json'),
  JSON.stringify({ records, failed: records.filter((r) => !r.passed).length }, null, 2),
)
process.exitCode = records.some((r) => !r.passed) ? 1 : 0
const continuation = path.join(runtime, 'continue-with-candidate.json')
if (process.env.QA_BUILD === 'base' && (await fs.stat(continuation).catch(() => null))) {
  const next = JSON.parse(await fs.readFile(continuation, 'utf8'))
  const baseUi = JSON.parse(await fs.readFile(path.join(evidence, 'ui/results.json'), 'utf8'))
  if (baseUi.stats.unexpected !== 30 || baseUi.stats.skipped || baseUi.stats.flaky)
    throw Error('Base matrix needs review before candidate continuation')
  const ready = JSON.parse(await fs.readFile(path.join(next.runtime, 'ready.json'), 'utf8'))
  const head = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ready.root,
    encoding: 'utf8',
  }).trim()
  if (head !== next.head || ready.site !== next.site || ready.convex !== next.convex)
    throw Error('Candidate continuation pins do not match')
  await fs.writeFile(path.join(next.runtime, 'run-ui'), 'base matrix completed')
  const log = await fs.open(path.join(next.runtime, 'pipeline.log'), 'w')
  const child = spawn(
    process.execPath,
    [path.join(process.cwd(), 'qa/acceptance/74/pipeline.mjs')],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        QA_BUILD: 'candidate',
        QA_URL: next.site,
        QA_CONVEX_URL: next.convex,
        QA_RUNTIME_DIR: next.runtime,
        QA_EVIDENCE: next.evidence,
      },
      stdio: ['ignore', log.fd, log.fd],
    },
  )
  const status = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code) => resolve(code))
  })
  await log.close()
  await fs.writeFile(
    path.join(next.runtime, 'pipeline-exit.json'),
    JSON.stringify({ status, finishedAt: new Date().toISOString(), parentLease: 'qa-74' }, null, 2),
  )
  if (status) process.exitCode = 1
}
