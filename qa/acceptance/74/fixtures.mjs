import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const [root, runtime] = process.argv.slice(2).map((s) => path.resolve(s))
const cli = path.join(root, 'node_modules/convex/bin/main.js')
const envFile = path.join(runtime, 'self-hosted.env')
const candidate = path.basename(root) === 'candidate'
const accounts = JSON.parse(await fs.readFile(path.join(runtime, 'accounts.json'), 'utf8'))
function cliRun(args) {
  return execFileSync(process.execPath, [cli, ...args, '--env-file', envFile], {
    cwd: runtime,
    encoding: 'utf8',
  })
}
async function install(table, rows) {
  const file = path.join(runtime, `${table}-import.json`)
  await fs.writeFile(file, JSON.stringify(rows), { mode: 0o600 })
  cliRun(['import', '--table', table, '--replace', '--yes', file])
}
const grants = []
for (const group of Object.values(accounts)) {
  for (const [persona, account] of Object.entries(group)) {
    if (['client', 'offClient'].includes(persona)) continue
    const jwt = JSON.parse(Buffer.from(account.token.split('.')[1], 'base64url'))
    if (jwt.sub !== account.userId) throw Error('Session/JWT setup mismatch')
    const row = {
      userId: account.userId,
      email: account.email,
      createdAt: Date.now(),
      grantedByUserId: 'qa74-isolated-operator',
    }
    if (candidate && persona !== 'legacy')
      row.subjectBinding = {
        issuer: jwt.iss,
        reviewedAt: Date.now() - 1000,
        operatorEvidence: 'qa74-synthetic-operator-review',
      }
    if (persona === 'wrongIssuer' && candidate)
      row.subjectBinding.issuer = 'http://wrong-issuer.invalid'
    if (persona === 'future' && candidate) row.subjectBinding.reviewedAt = Date.now() + 86400000
    if (persona === 'missingEvidence' && candidate) row.subjectBinding.operatorEvidence = ''
    if (persona === 'tokenIdentifier') row.userId = `${jwt.iss}|${jwt.sub}`
    if (persona === 'emailOnly') row.userId = 'qa74-different-subject'
    grants.push(row)
  }
}
await install('rag_admins', grants)
const sources = []
for (const project of ['desktop', 'mobile', 'probes']) {
  for (const status of ['approved', 'paused', 'pending_approval']) {
    sources.push({
      type: 'youtube_channel',
      status,
      name: `QA74 ${project} ${status} retained channel`,
      description: 'Synthetic frozen history; no provider call authorized',
      tenantId: 'default',
      tags: ['qa74'],
      createdByUserId: (accounts[project].freeze || accounts[project].reviewed).userId,
      lastConfigUpdatedAt: Date.now(),
      schedule: { frequency: 'manual' },
      crawlConfig: {
        channelId: 'UCqa74Synthetic0000000000',
        channelUrl: 'https://www.youtube.com/@qa74-synthetic',
        includeShorts: false,
        maxVideosPerRun: 1,
      },
      enabled: status === 'approved',
    })
  }
  sources.push({
    type: 'website',
    status: 'approved',
    name: `QA74 ${project} official website`,
    tenantId: 'default',
    tags: ['qa74'],
    createdByUserId: accounts[project].reviewed.userId,
    lastConfigUpdatedAt: Date.now(),
    schedule: { frequency: 'manual' },
    crawlConfig: {
      seedUrls: ['https://www.canada.ca/en/immigration-refugees-citizenship.html'],
      allowedDomains: ['www.canada.ca'],
      includePatterns: [],
      excludePatterns: [],
      maxPagesPerRun: 1,
      maxDepth: 0,
      respectRobots: true,
      renderMode: 'static',
    },
    enabled: false,
  })
}
const website = sources.find((s) => s.name === 'QA74 probes official website')
const retained = sources.find((s) => s.name === 'QA74 probes approved retained channel')
sources.push({
  ...retained,
  name: 'QA74 worker retained channel',
  schedule: { frequency: 'daily' },
  nextRunAt: Date.now() - 10000,
})
for (const project of ['desktop', 'mobile']) {
  for (const action of ['enable', 'schedule', 'configure', 'approve', 'resume', 'delete']) {
    sources.push({
      ...retained,
      name: `QA74 ${project} UI ${action}`,
      createdByUserId: accounts[project].freeze.userId,
      status:
        action === 'approve' ? 'pending_approval' : action === 'resume' ? 'paused' : 'approved',
      enabled: false,
    })
  }
}
for (const action of ['enable', 'schedule', 'configure', 'approve', 'resume', 'delete'])
  sources.push({
    ...retained,
    name: `QA74 probes frozen-${action}`,
    status: action === 'approve' ? 'pending_approval' : action === 'resume' ? 'paused' : 'approved',
    enabled: false,
  })
for (const action of [
  'updateSourceConfig',
  'approveSource',
  'rejectSource',
  'pauseSource',
  'resumeSource',
  'removeSource',
])
  sources.push({
    ...website,
    name: `QA74 probes ${action}`,
    status:
      action === 'pauseSource'
        ? 'approved'
        : action === 'resumeSource'
          ? 'paused'
          : 'pending_approval',
  })
for (const persona of [
  'visitor',
  'client',
  'legacy',
  'wrongIssuer',
  'future',
  'missingEvidence',
  'tokenIdentifier',
  'emailOnly',
  'reviewed',
  'allowlistedClient',
]) {
  for (const action of ['edit', 'approve', 'reject', 'pause', 'resume', 'delete'])
    sources.push({
      ...website,
      name: `QA74 probes http-${persona}-${action}`,
      status: action === 'pause' ? 'approved' : action === 'resume' ? 'paused' : 'pending_approval',
    })
}
await install('sources', sources)
const actualSources = JSON.parse(cliRun(['data', 'sources', '--format', 'json']))
const preserved = actualSources.filter(
  (s) =>
    s.name === 'QA74 worker retained channel' || / UI delete$|probes frozen-delete$/.test(s.name),
)
await install(
  'approval_audit_log',
  preserved.map((source) => ({
    sourceId: source._id,
    actorUserId: accounts.probes.reviewed.userId,
    action: 'approve',
    timestamp: Date.now(),
    note: 'Retained synthetic approval history',
  })),
)
await install(
  'source_items',
  preserved.map((source) => ({
    sourceId: source._id,
    tenantId: 'default',
    itemType: 'youtube_video',
    externalId: `qa74-retained-${source._id}`,
    canonicalUrl: 'https://www.youtube.com/watch?v=QA74SYNTHET',
    title: 'Retained synthetic YouTube history',
    lastSeenAt: Date.now(),
    status: 'active',
    r2ContentKey: `qa74/${source._id}/latest.md`,
  })),
)
await install('ai_search_sync_jobs', [])
if (candidate)
  for (const table of [
    'rag_audit_counts',
    'rag_audit_details',
    'rag_audit_events',
    'rag_create_receipts',
    'rag_source_deletions',
  ])
    await install(table, [])
const batches = ['desktop', 'mobile', 'worker'].map((project) => ({
  status: 'queued',
  scheduledFor: Date.now(),
  trigger: 'manual',
  sourceCount: 1,
  dueSourceIds: [
    actualSources.find(
      (s) =>
        s.name ===
        (project === 'worker'
          ? 'QA74 worker retained channel'
          : `QA74 ${project} approved retained channel`),
    )._id,
  ],
  summary: {
    sourcesSucceeded: 0,
    sourcesPartial: 0,
    sourcesFailed: 0,
    itemsNew: 0,
    itemsChanged: 0,
    itemsUnchanged: 0,
    itemsFailed: 0,
  },
  idempotencyKey: `qa74-old-prepared-${project}`,
}))
const workerBatch = batches.find((batch) => batch.idempotencyKey.endsWith('-worker'))
for (const [suffix, status] of [
  ['complete', 'ingesting'],
  ['retry', 'failed'],
  ['sync', 'sync_pending'],
]) {
  batches.push({
    ...workerBatch,
    status,
    idempotencyKey: `qa74-old-prepared-worker-${suffix}`,
    startedAt: Date.now() - 10000,
    ...(status === 'completed' || status === 'failed' ? { finishedAt: Date.now() - 1000 } : {}),
  })
}
await install('ingestion_batches', batches)
const actualBatches = JSON.parse(cliRun(['data', 'ingestion_batches', '--format', 'json']))
const stats = Object.fromEntries(
  [
    'discovered',
    'fetched',
    'new',
    'changed',
    'unchanged',
    'failed',
    'skipped',
    'transcriptAttempted',
    'transcriptSucceeded',
    'transcriptSucceededInnerTubeAndroid',
    'transcriptSucceededApi',
    'transcriptSucceededCaptionsXml',
    'transcriptSucceededWithTimestamps',
    'transcriptDescriptionFallback',
  ].map((key) => [key, 0]),
)
await install(
  'source_runs',
  actualBatches.map((batch) => ({
    batchId: batch._id,
    sourceId: batch.dueSourceIds[0],
    tenantId: 'default',
    status: batch.idempotencyKey.endsWith('-complete')
      ? 'running'
      : batch.idempotencyKey.endsWith('-retry')
        ? 'failed'
        : batch.idempotencyKey.endsWith('-sync')
          ? 'succeeded'
          : 'queued',
    trigger: 'manual',
    stats,
    errors: [],
    attempt: 1,
    maxAttempts: 3,
    ...(batch.status !== 'queued' ? { startedAt: Date.now() - 10000 } : {}),
    ...(batch.idempotencyKey.endsWith('-retry') || batch.idempotencyKey.endsWith('-sync')
      ? { finishedAt: Date.now() - 1000 }
      : {}),
  })),
)
const sourceRuns = JSON.parse(cliRun(['data', 'source_runs', '--format', 'json']))
if (candidate) {
  const backfill = []
  // Runtime setup: docs/architecture/bounded-governance-audit.md, Operator migration.
  for (const table of ['approval', 'deletion']) {
    let done = false
    for (let batch = 0; !done && batch < 1000; batch++) {
      const result = JSON.parse(
        cliRun(['run', 'ragSourceAudit:backfillEvents', JSON.stringify({ table })]),
      )
      backfill.push({ table, result })
      done = result.done === true
    }
    if (!done) throw Error('Operator audit backfill did not complete')
  }
  await fs.writeFile(path.join(runtime, 'audit-backfill.json'), JSON.stringify(backfill, null, 2))
}
await fs.writeFile(
  path.join(runtime, 'fixtures.json'),
  JSON.stringify({ sources: actualSources, batches: actualBatches, sourceRuns }, null, 2),
)
console.log(
  `Installed ${grants.length} explicit synthetic grants, ${sources.length} sources and ${batches.length} old prepared batches; ${candidate ? 'reviewed binding schema' : 'base legacy schema'}`,
)
