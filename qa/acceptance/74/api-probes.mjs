import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { endpoints, grantPersonas, oracle } from './oracles.ts'

const runtime = process.env.QA_RUNTIME_DIR
const site = process.env.QA_URL
const convex = process.env.QA_CONVEX_URL
const evidence = process.env.QA_EVIDENCE
const allAccounts = JSON.parse(await fs.readFile(path.join(runtime, 'accounts.json'), 'utf8'))
const accounts = { ...allAccounts.probes, allowlistedClient: allAccounts.desktop.emailOnly }
const fixtures = JSON.parse(await fs.readFile(path.join(runtime, 'fixtures.json'), 'utf8'))
const records = []
const sourceByName = (name) => {
  const source = fixtures.sources.find((s) => s.name === `QA74 probes ${name}`)
  if (!source) throw Error(`Missing isolated ${name} fixture`)
  return source
}
const source = sourceByName('approved retained channel')
const batch = fixtures.batches[0]
const cookieFor = (persona) =>
  persona === 'visitor'
    ? undefined
    : accounts[persona].cookies.map((c) => `${c.name}=${c.value}`).join('; ')
for (const [persona, account] of Object.entries(accounts)) {
  const response = await fetch(`${site}/api/auth/convex/token`, {
    headers: { cookie: cookieFor(persona) },
  })
  const result = await response.json()
  if (!response.ok || !result.token) throw Error(`Fresh genuine JWT unavailable for ${persona}`)
  account.token = result.token
}
function record(name, expected, actual, passed, sourceOracle) {
  const observation = { name, expected, actual, passed, oracle: sourceOracle }
  records.push(observation)
  fsSync.appendFileSync(
    path.join(evidence, 'api-observations.jsonl'),
    JSON.stringify(observation) + '\n',
  )
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`)
}
async function http(persona, method, url, body, extraHeaders = {}) {
  const cookie = cookieFor(persona)
  const response = await fetch(`${site}${url}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(cookie ? { cookie } : {}),
      origin: site,
      ...(method === 'GET' ? {} : { 'content-type': 'application/json' }),
      ...extraHeaders,
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
  })
  const text = await response.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = null
  }
  return {
    status: response.status,
    cache: response.headers.get('cache-control'),
    code: data?.data?.code ?? data?.data?.data?.code,
    statusMessage: data?.statusMessage,
    bytes: text.length,
    privateMarkerDisclosed: /QA74 .*retained channel|synthetic-operator-review/.test(text),
    actorDetailsDisclosed:
      persona !== 'visitor' &&
      (text.includes(accounts[persona].userId) || text.includes(accounts[persona].email)),
  }
}

for (const persona of ['visitor', 'client', ...grantPersonas, 'allowlistedClient']) {
  for (const [method, template] of endpoints) {
    const action =
      method === 'DELETE' ? 'delete' : method === 'PATCH' ? 'edit' : template.split('/').at(-1)
    const sourceId =
      template.includes('SOURCE') && method !== 'GET'
        ? sourceByName(`http-${persona}-${action}`)._id
        : source._id
    const url = template.replace('SOURCE', sourceId).replace('BATCH', batch._id)
    const body = url.endsWith('/ingestion/run')
      ? {
          sourceIds: [sourceByName('paused retained channel')._id],
          force: false,
          idempotencyKey: `qa74-${persona}-empty`,
        }
      : url.endsWith('/reject')
        ? { reason: 'Synthetic rejection' }
        : method === 'PATCH' && template.includes('SOURCE')
          ? { name: `QA74 ${persona} changed official source` }
          : {}
    const result = await http(persona, method, url, body)
    const actual = result
    if (persona !== 'reviewed') {
      const expected = persona === 'visitor' ? 401 : 403
      record(
        `HTTP ${persona} ${method} ${template}`,
        expected,
        actual,
        result.status === expected &&
          !result.privateMarkerDisclosed &&
          !result.actorDetailsDisclosed,
        oracle.admission,
      )
    } else {
      let expected = 400
      if (
        url.includes('/recommendation-reviews') ||
        url.endsWith('/ingestion/run') ||
        url === '/api/ai-search/query'
      )
        expected = 503
      else if (method === 'GET')
        expected = url.includes('qa74-missing') && !url.endsWith('/rules') ? 404 : 200
      else if (method === 'DELETE' && !template.includes('SOURCE')) expected = 404
      else if (template.includes('/rag/sources/SOURCE')) expected = 200
      const statusCorrect = result.status === expected
      record(
        `HTTP reviewed ${method} ${template}`,
        { status: expected, cache: 'private, no-store' },
        actual,
        statusCorrect && result.cache === 'private, no-store',
        oracle.preserve + '; ' + oracle.private,
      )
    }
  }
  for (const url of ['/api/admin/audit-trail/qa74-unknown', '/api/admin/pathways/qa74-unknown']) {
    const actual = await http(persona, 'GET', url)
    const expected = persona === 'reviewed' ? 404 : persona === 'visitor' ? 401 : 403
    record(
      `private error ${persona} ${url}`,
      { status: expected, ...(persona === 'reviewed' ? { cache: 'private, no-store' } : {}) },
      actual,
      actual.status === expected &&
        (persona !== 'reviewed' || actual.cache === 'private, no-store'),
      oracle.private,
    )
  }
}

for (const accept of ['application/json', 'text/html']) {
  const response = await fetch(`${site}/api/admin/qa74-unknown`, {
    headers: { cookie: cookieFor('reviewed'), accept },
    redirect: 'manual',
  })
  const body = await response.text()
  const knownIdentityPresent = Object.values(allAccounts).some((group) =>
    Object.values(group).some(
      (account) => body.includes(account.userId) || body.includes(account.email),
    ),
  )
  const jwtPresent = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\b/.test(body)
  const privateFields = [
    ...body.matchAll(
      /["'](?:session|profile|user|userId|email|emailVerified|ipAddress|userAgent|expiresAt|admin|isAdmin|permissions|token|password)["']\s*:/gi,
    ),
  ].map((match) => match[0])
  let keys = []
  let statusAndUrlOnly = true
  if ((response.headers.get('content-type') || '').includes('json')) {
    const json = JSON.parse(body)
    keys = Object.keys(json)
    statusAndUrlOnly = keys.every(
      (key) =>
        ['error', 'url', 'statusCode', 'statusMessage', 'message', 'status'].includes(key) ||
        (key === 'data' &&
          json.data &&
          typeof json.data === 'object' &&
          Object.keys(json.data).every(
            (field) => field === 'path' && typeof json.data.path === 'string',
          )),
    )
  }
  const extension = accept === 'text/html' ? 'html' : 'txt'
  await fs.writeFile(path.join(evidence, `unregistered-api-${extension}.${extension}`), body)
  record(
    `unregistered API reviewed Accept ${accept}`,
    { status: 404, privateData: false, cacheCriterion: 'outside: no handler/admission' },
    {
      status: response.status,
      cache: response.headers.get('cache-control'),
      contentType: response.headers.get('content-type'),
      keys,
      knownIdentityPresent,
      jwtPresent,
      privateFields,
      statusAndUrlOnly,
    },
    response.status === 404 &&
      !knownIdentityPresent &&
      !jwtPresent &&
      !privateFields.length &&
      statusAndUrlOnly,
    'Orchestrator interpretation: completely unregistered API paths have no handler/admission and are outside private-cache criterion; their bodies carry no session, profile or admin data, only status and URL.',
  )
}

const create = {
  type: 'website',
  name: 'QA74 direct official source',
  tenantId: 'default',
  tags: ['qa74'],
  enabled: false,
  idempotencyKey: 'qa74-direct-create',
  schedule: { frequency: 'manual' },
  websiteConfig: sourceByName('official website').crawlConfig,
}
const directCases = [
  ['query', 'getAdminStatus', {}],
  ['query', 'listSources', { includeAllForAdmin: true }],
  ['query', 'getSource', { sourceId: sourceByName('official website')._id }],
  ['mutation', 'createSourceSubmission', create],
  [
    'mutation',
    'updateSourceConfig',
    { sourceId: sourceByName('updateSourceConfig')._id, name: 'QA74 updated official source' },
  ],
  ['mutation', 'approveSource', { sourceId: sourceByName('approveSource')._id, enabled: false }],
  [
    'mutation',
    'rejectSource',
    { sourceId: sourceByName('rejectSource')._id, reason: 'Synthetic review rejection' },
  ],
  ['mutation', 'pauseSource', { sourceId: sourceByName('pauseSource')._id }],
  ['mutation', 'resumeSource', { sourceId: sourceByName('resumeSource')._id }],
  ['mutation', 'removeSource', { sourceId: sourceByName('removeSource')._id }],
]
async function direct(persona, kind, fn, args) {
  const response = await fetch(`${convex}/api/${kind}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(persona === 'visitor' ? {} : { authorization: `Bearer ${accounts[persona].token}` }),
    },
    body: JSON.stringify({ path: fn, args, format: 'json' }),
  })
  return { http: response.status, ...(await response.json()) }
}
for (const persona of ['visitor', 'client', ...grantPersonas, 'allowlistedClient']) {
  for (const [kind, fn, payload] of directCases) {
    const args = { ...payload }
    if (process.env.QA_BUILD === 'base' && fn === 'createSourceSubmission')
      delete args.idempotencyKey
    const result = await direct(persona, kind, `ragSources:${fn}`, args)
    const safePermission =
      fn === 'getAdminStatus' &&
      result.status === 'success' &&
      result.value?.isAdmin === false &&
      !Object.hasOwn(result.value, 'adminCount')
    const denied =
      result.status === 'error' &&
      /authentication required|unauthorized|forbidden|admin.{0,30}required|requires.{0,30}admin|not.{0,20}admin|reviewed.{0,30}grant/i.test(
        result.errorMessage ?? '',
      )
    record(
      `Convex ${persona} ragSources:${fn}`,
      persona === 'reviewed' ? 'admitted success' : 'denied without count/read/write',
      {
        http: result.http,
        status: result.status,
        value: result.value,
        errorMessage: result.errorMessage,
      },
      persona === 'reviewed' ? result.status === 'success' : safePermission || denied,
      oracle.admission + '; ' + oracle.binding,
    )
  }
  const result = await direct(persona, 'mutation', 'ragSources:bootstrapCurrentUserAsAdmin', {})
  record(
    `Convex ${persona} removed bootstrap`,
    'not registered publicly',
    { http: result.http, status: result.status, errorMessage: result.errorMessage },
    result.status === 'error' &&
      /could not find|not found|does not exist/i.test(result.errorMessage ?? ''),
    oracle.admission,
  )
  for (const [fn, args] of [
    ['listBatchesAsNuxtAdmin', {}],
    ['getBatchDetailAsNuxtAdmin', { batchId: batch._id }],
  ]) {
    const result = await direct(persona, 'query', `ragIngestionInternal:${fn}`, args)
    record(
      `Convex ${persona} batch ${fn}`,
      persona === 'reviewed' ? 'admitted success' : 'denied',
      { http: result.http, status: result.status, errorMessage: result.errorMessage },
      persona === 'reviewed' ? result.status === 'success' : result.status === 'error',
      oracle.admission,
    )
  }
}

const auditControl = await direct('reviewed', 'query', 'ragSourceAudit:listEvents', {
  filters: {},
  includeCount: true,
  limit: 10,
})
function firstEventId(value) {
  if (!value || typeof value !== 'object') return undefined
  if (typeof value.eventId === 'string') return value.eventId
  if (typeof value.id === 'string' && ('actionType' in value || 'entityType' in value))
    return value.id
  for (const nested of Object.values(value)) {
    const found = firstEventId(nested)
    if (found) return found
  }
  return undefined
}
const eventId = firstEventId(auditControl.value)
record(
  'admitted audit list has a real created source event',
  'nonempty source event ID',
  { http: auditControl.http, status: auditControl.status, eventId },
  auditControl.status === 'success' && !!eventId,
  oracle.preserve,
)
for (const persona of ['visitor', 'client', ...grantPersonas, 'allowlistedClient']) {
  for (const [fn, args] of [
    ['listEvents', { filters: {}, includeCount: true, limit: 10 }],
    ['getEvent', { eventId: eventId || 'qa74-missing' }],
    ['getSummary', {}],
    ['listDeletionEvents', { paginationOpts: { cursor: null, numItems: 10 } }],
    ['listApprovalEvents', { paginationOpts: { cursor: null, numItems: 10 } }],
  ]) {
    const result = await direct(persona, 'query', `ragSourceAudit:${fn}`, args)
    const denied =
      result.status === 'error' &&
      /authentication required|unauthorized|forbidden|admin.{0,30}required|reviewed.{0,30}grant/i.test(
        result.errorMessage || '',
      )
    record(
      `Convex ${persona} source audit ${fn}`,
      persona === 'reviewed' ? 'admitted success' : 'denied',
      {
        http: result.http,
        status: result.status,
        errorMessage: result.errorMessage,
        value: persona === 'reviewed' ? result.value : undefined,
      },
      persona === 'reviewed' ? result.status === 'success' : denied,
      oracle.admission + '; ' + oracle.preserve,
    )
  }
}

for (const persona of ['visitor', 'client', 'reviewed']) {
  for (const [method, url] of [
    ['GET', '/api/workspace/summary'],
    ['GET', '/api/intake/draft'],
    ['POST', '/api/intake/submit'],
    ['POST', '/api/recommendations/runs/qa74-unsigned/start'],
    ['POST', '/api/recommendations/runs/qa74-unsigned/refresh'],
  ]) {
    const result = await http(persona, method, url, {
      mode: 'mock',
      force: true,
      sourceRunId: 'qa74-unsigned',
      runId: 'qa74-unsigned',
    })
    record(
      `planner regression ${persona} ${method} ${url}`,
      404,
      result,
      result.status === 404,
      oracle.off + '; LR disabled personalized HTTP inventory: 404 before reads/effects',
    )
  }
}

const root = JSON.parse(await fs.readFile(path.join(runtime, 'ready.json'), 'utf8')).root
function operator(args) {
  return execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/convex/bin/main.js'),
      ...args,
      '--env-file',
      path.join(runtime, 'self-hosted.env'),
    ],
    { cwd: runtime, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
}
const specOutput = operator(['function-spec', '--file'])
const specName = specOutput.match(/function_spec_[0-9]+\.json/)?.[0]
if (!specName) throw Error('Complete deployed function metadata was not captured')
const deployedSpec = JSON.parse(await fs.readFile(path.join(runtime, specName), 'utf8'))
await fs.writeFile(
  path.join(evidence, 'deployed-function-spec.json'),
  JSON.stringify(deployedSpec, null, 2),
)
for (const name of [
  'ragSources:bootstrapCurrentUserAsAdmin',
  'ragSourcesInternal:syncAdminFromNuxtAllowlist',
]) {
  const registrations = deployedSpec.functions.filter(
    (fn) => fn.identifier.replace('.js:', ':') === name,
  )
  record(
    `deployed removal ${name}`,
    'absent from public and internal registrations',
    registrations,
    registrations.length === 0,
    'contract Boundaries: public bootstrap and internal allowlist sync are deleted',
  )
}

function snapshot() {
  return Object.fromEntries(
    [
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
    ].map((table) => [
      table,
      JSON.parse(
        operator(['data', table, '--format', 'json', '--limit', '10000']).trim() || '[]',
      ).sort((a, b) => a._id.localeCompare(b._id)),
    ]),
  )
}
const beforeFrozen = snapshot()
const youtubeConfig = {
  channelId: 'UC0000000000000000000000',
  channelUrl: 'https://www.youtube.com/channel/UC0000000000000000000000',
  includeShorts: false,
  maxVideosPerRun: 1,
}
const frozenActions = [
  [
    'create',
    'POST',
    '/api/admin/rag/sources',
    {
      type: 'youtube_channel',
      name: 'QA74 new frozen channel',
      schedule: { frequency: 'manual' },
      youtubeConfig,
    },
  ],
  ['enable', 'PATCH', '', { enabled: true }],
  ['schedule', 'PATCH', '', { schedule: { frequency: 'daily' } }],
  ['configure', 'PATCH', '', { youtubeConfig: { ...youtubeConfig, maxVideosPerRun: 2 } }],
  ['approve', 'POST', '/approve', { enabled: true }],
  ['resume', 'POST', '/resume', {}],
  ['delete', 'DELETE', '', {}],
]
for (const [action, method, suffix, body] of frozenActions) {
  const url =
    action === 'create'
      ? suffix
      : `/api/admin/rag/sources/${sourceByName(`frozen-${action}`)._id}${suffix}`
  const actual = await http(
    'reviewed',
    method,
    url,
    body,
    action === 'create' ? { 'Idempotency-Key': 'qa74-frozen-create' } : {},
  )
  record(
    `YouTube frozen ${action}`,
    {
      status: 409,
      code: 'YOUTUBE_FROZEN',
      statusMessage: 'YouTube source actions are frozen',
      cache: 'private, no-store',
    },
    actual,
    actual.status === 409 &&
      actual.code === 'YOUTUBE_FROZEN' &&
      actual.statusMessage === 'YouTube source actions are frozen' &&
      actual.cache === 'private, no-store',
    oracle.frozen,
  )
}
const afterFrozen = snapshot()
record(
  'YouTube frozen actions preserve all source/item/batch/audit state',
  'identical before and after',
  {
    beforeCounts: Object.fromEntries(Object.entries(beforeFrozen).map(([k, v]) => [k, v.length])),
    afterCounts: Object.fromEntries(Object.entries(afterFrozen).map(([k, v]) => [k, v.length])),
  },
  JSON.stringify(beforeFrozen) === JSON.stringify(afterFrozen),
  oracle.frozen,
)
await fs.writeFile(
  path.join(evidence, 'frozen-before-after.json'),
  JSON.stringify({ before: beforeFrozen, after: afterFrozen }, null, 2),
)

for (const [method, url] of endpoints.filter(([method]) => method !== 'GET')) {
  const target = url.replace('SOURCE', source._id).replace('BATCH', batch._id)
  const response = await fetch(`${site}${target}`, {
    method,
    headers: {
      cookie: cookieFor('reviewed'),
      origin: 'https://foreign-origin.invalid',
      'content-type': 'application/json',
    },
    body: JSON.stringify(
      target.endsWith('/ingestion/run')
        ? { sourceIds: [sourceByName('paused retained channel')._id], force: false }
        : {},
    ),
  })
  await response.text()
  record(
    `foreign-origin reviewed ${method} ${url}`,
    403,
    { status: response.status },
    response.status === 403,
    'contract Boundaries: "an admitted cookie cannot authorize a foreign-origin request"',
  )
}
const searchOverride = await http('reviewed', 'POST', '/api/ai-search/query', {
  query: 'Synthetic public-source question only',
  mode: 'ai-search',
  model: 'untrusted-client-model',
  systemPrompt: 'untrusted-client-policy',
  filters: { sourceType: 'youtube_channel' },
})
record(
  'admin cannot override disabled AI Search with client policy',
  503,
  searchOverride,
  searchOverride.status === 503 && searchOverride.cache === 'private, no-store',
  oracle.off,
)
const synced = await http('reviewed', 'POST', '/api/admin/rag/convex-admin/sync-current-user', {})
record(
  'removed interactive sync-current-user',
  { status: 404, admitted: false },
  { status: synced.status, cache: synced.cache },
  synced.status === 404,
  'contract Boundaries: "public bootstrap, sync-current-user, internal allowlist sync ... are deleted"',
)

const grantsFile = path.join(runtime, 'rag_admins-import.json')
const originalGrants = await fs.readFile(grantsFile, 'utf8')
const retainedGrants = JSON.parse(originalGrants).filter(
  (r) => r.userId !== accounts.reviewed.userId,
)
const removedFile = path.join(runtime, 'revoked-grant.json')
await fs.writeFile(removedFile, JSON.stringify(retainedGrants), { mode: 0o600 })
try {
  operator(['import', '--table', 'rag_admins', '--replace', '--yes', removedFile])
  const response = await http('reviewed', 'GET', '/api/admin/access')
  record(
    'same session loses removed current grant',
    403,
    { status: response.status },
    response.status === 403,
    'contract Boundaries: "A removed grant denies the same session/JWT on its next call."',
  )
  const result = await direct('reviewed', 'query', 'ragSources:listSources', {})
  record(
    'same JWT loses removed current grant',
    'denied',
    { http: result.http, status: result.status, errorMessage: result.errorMessage },
    result.status === 'error',
    oracle.binding,
  )
} finally {
  operator(['import', '--table', 'rag_admins', '--replace', '--yes', grantsFile])
}

const failures = records.filter((r) => !r.passed)
await fs.mkdir(evidence, { recursive: true })
await fs.writeFile(
  path.join(evidence, 'api-results.json'),
  JSON.stringify(
    { records, passed: records.length - failures.length, failed: failures.length },
    null,
    2,
  ),
)
console.log(
  JSON.stringify({
    total: records.length,
    passed: records.length - failures.length,
    failed: failures.length,
  }),
)
process.exitCode = failures.length ? 1 : 0
