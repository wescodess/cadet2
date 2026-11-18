import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { after, before, test } from 'node:test'
import { promisify } from 'node:util'
import { once } from 'node:events'
import { createWriteStream } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'

const root = resolve(import.meta.dirname, '../..')
const directory = process.env.CONTAINMENT_DIRECTORY
const origin = process.env.CONTAINMENT_ORIGIN
const run = promisify(execFile)
let server
let backend
let cliEnv
let admin
let ordinary
let emailMatch
let legacyGrant
let anonymous
let operator
let youtubeId
let oldBatchId
let queuedRunId
let failedRunId
let websiteRunId
let runtimeEnv
let deployedFunctions

async function startRuntime() {
  server = spawn(process.execPath, [join(root, '.output/server/index.mjs')], {
    cwd: join(directory, 'app'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: runtimeEnv,
  })
  const log = createWriteStream(join(directory, 'nitro.log'), { flags: 'a' })
  server.stdout.pipe(log, { end: false })
  server.stderr.pipe(log, { end: false })
  server.once('exit', () => log.end())
  const deadline = Date.now() + 20_000
  while (true) {
    try {
      if ((await request('/')).status === 200) break
    } catch {
      /* startup */
    }
    assert.equal(
      server.exitCode,
      null,
      `Built Nitro exited; inspect ${join(directory, 'nitro.log')}`,
    )
    assert.ok(
      Date.now() < deadline,
      `Built Nitro must become ready; inspect ${join(directory, 'nitro.log')}`,
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function stopRuntime() {
  if (!server || server.exitCode !== null) return
  const exited = once(server, 'exit')
  server.kill('SIGTERM')
  await exited
}

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

async function request(path, actor, method = 'GET', body) {
  return fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(actor ? { cookie: actor.cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      origin,
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
}

async function fixture(table, rows) {
  const file = join(directory, `${table}.json`)
  await writeFile(file, JSON.stringify(rows))
  await run(
    process.execPath,
    [
      join(root, 'node_modules/convex/bin/main.js'),
      'import',
      '--env-file',
      join(directory, 'operator.env'),
      '--append',
      '--table',
      table,
      file,
    ],
    {
      cwd: join(directory, 'backend'),
      env: cliEnv,
    },
  )
}

async function register(name) {
  const response = await request('/api/auth/sign-up/email', null, 'POST', {
    name,
    email: `${name}@example.test`,
    password: randomBytes(24).toString('hex'),
  })
  assert.equal(response.status, 200, 'real Better Auth signup must work')
  const body = await response.json()
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  const tokenResponse = await request('/api/auth/convex/token', { cookie })
  assert.equal(tokenResponse.status, 200, 'real session must mint a Convex JWT')
  const { token } = await tokenResponse.json()
  assert.ok(token)
  const client = new ConvexHttpClient(backend, { logger: false })
  client.setAuth(token)
  return { cookie, client, userId: body.user.id, email: body.user.email }
}

before(
  async () => {
    assert.ok(directory && origin, 'run via scripts/security/run-boundaries.mjs')
    const config = JSON.parse(
      await readFile(join(directory, 'backend/.convex/local/default/config.json'), 'utf8'),
    )
    backend = `http://127.0.0.1:${config.ports.cloud}`
    cliEnv = {
      ...process.env,
      CONVEX_SELF_HOSTED_URL: backend,
      CONVEX_SELF_HOSTED_ADMIN_KEY: config.adminKey,
    }
    delete cliEnv.CONVEX_DEPLOYMENT
    await writeFile(
      join(directory, 'operator.env'),
      `CONVEX_SELF_HOSTED_URL=${backend}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${config.adminKey}\n`,
      { mode: 0o600 },
    )
    await run(
      process.execPath,
      [
        join(root, 'node_modules/convex/bin/main.js'),
        'env',
        'set',
        '--env-file',
        join(directory, 'operator.env'),
        'CADET_AUTH_ISSUER',
        origin,
      ],
      {
        cwd: join(directory, 'backend'),
        env: cliEnv,
      },
    )
    await cp(join(root, 'convex'), join(directory, 'backend/convex'), { recursive: true })
    const sourceModule = join(directory, 'backend/convex/ragSources.ts')
    const sourceCode = await readFile(sourceModule, 'utf8')
    const deletion = 'await ctx.db.delete(args.sourceId)'
    assert.equal(sourceCode.split(deletion).length, 2)
    await writeFile(
      sourceModule,
      sourceCode.replace(
        deletion,
        `${deletion}\n    if (source.name === 'Rollback deletion probe') throw new Error('Injected deletion audit failure')`,
      ),
    )
    await run(
      process.execPath,
      [
        join(root, 'node_modules/convex/bin/main.js'),
        'dev',
        '--once',
        '--env-file',
        join(directory, 'operator.env'),
        '--typecheck',
        'disable',
        '--codegen',
        'enable',
      ],
      {
        cwd: join(directory, 'backend'),
        env: cliEnv,
      },
    )
    await run(
      process.execPath,
      [
        join(root, 'node_modules/convex/bin/main.js'),
        'function-spec',
        '--file',
        '--env-file',
        join(directory, 'operator.env'),
      ],
      {
        cwd: join(directory, 'backend'),
        env: cliEnv,
      },
    )
    const specifications = (await readdir(join(directory, 'backend'))).filter((name) =>
      /^function_spec_\d+\.json$/.test(name),
    )
    assert.equal(
      specifications.length,
      1,
      'one complete deployed function specification is required',
    )
    deployedFunctions = JSON.parse(
      await readFile(join(directory, 'backend', specifications[0]), 'utf8'),
    ).functions
    assert.ok(Array.isArray(deployedFunctions) && deployedFunctions.length > 0)
    const evidence =
      process.env.QUALITY_OUTPUT_DIR ?? join(root, '.quality-output/admin-boundaries')
    await mkdir(evidence, { recursive: true })
    await writeFile(
      join(evidence, 'deployed-functions.json'),
      JSON.stringify(deployedFunctions, null, 2),
    )
    await mkdir(join(directory, 'app/.data/db'), { recursive: true })
    const db = new PGlite(join(directory, 'app/.data/db/pglite-dev'))
    await db.exec(`
    CREATE TABLE "user" (id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false, image text, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "userId" text);
    CREATE TABLE session (id text PRIMARY KEY, "expiresAt" timestamp NOT NULL, token text UNIQUE NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id));
    CREATE TABLE account (id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user"(id), "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamp, "refreshTokenExpiresAt" timestamp, scope text, password text, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());
    CREATE TABLE verification (id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamp NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());
    CREATE TABLE jwks (id text PRIMARY KEY, "publicKey" text NOT NULL, "privateKey" text NOT NULL, "createdAt" timestamp NOT NULL, "expiresAt" timestamp);
  `)
    await db.close()
    runtimeEnv = {
      ...process.env,
      BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
      NUXT_PUBLIC_SITE_URL: origin,
      CONVEX_SITE_URL: origin,
      CADET_AUTH_ISSUER: origin,
      CONVEX_URL: backend,
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: new URL(origin).port,
      NUXT_RAG_ADMIN_EMAILS: 'email-match@example.test',
      NUXT_RAG_SCHEDULER_SECRET: 'synthetic-scheduler',
      NUXT_CLOUDFLARE_AI_GATEWAY_BASE_URL: 'https://example.test/private-config',
    }
    await startRuntime()
    ordinary = await register('ordinary')
    emailMatch = await register('email-match')
    admin = await register('admin')
    legacyGrant = await register('legacy-self-grant')
    anonymous = { client: new ConvexHttpClient(backend, { logger: false }) }
    await fixture('rag_admins', [
      {
        userId: admin.userId,
        email: emailMatch.email,
        createdAt: Date.now(),
        grantedByUserId: 'isolated-operator',
        subjectBinding: {
          issuer: origin,
          reviewedAt: Date.now(),
          operatorEvidence: 'isolated operator subject review',
        },
      },
      {
        userId: legacyGrant.userId,
        email: legacyGrant.email,
        createdAt: Date.now(),
        grantedByUserId: legacyGrant.userId,
      },
    ])
    operator = new ConvexHttpClient(backend, { logger: false })
    operator.setAdminAuth(config.adminKey)
    await fixture('sources', [
      {
        type: 'youtube_channel',
        status: 'approved',
        name: 'Frozen YouTube history',
        tenantId: 'default',
        tags: [],
        createdByUserId: admin.userId,
        lastConfigUpdatedAt: 1,
        schedule: { frequency: 'daily' },
        crawlConfig: {},
        enabled: true,
        nextRunAt: 0,
      },
    ])
    youtubeId = (
      await admin.client.query(anyApi.ragSources.listSources, {
        includeAllForAdmin: true,
        type: 'youtube_channel',
      })
    ).items[0]._id
    await fixture('ingestion_batches', [
      {
        status: 'queued',
        scheduledFor: 1,
        trigger: 'manual',
        sourceCount: 1,
        dueSourceIds: [youtubeId],
        idempotencyKey: 'old-youtube',
        summary: {
          sourcesSucceeded: 0,
          sourcesPartial: 0,
          sourcesFailed: 0,
          itemsNew: 0,
          itemsChanged: 0,
          itemsUnchanged: 0,
          itemsFailed: 0,
        },
      },
    ])
    oldBatchId = (await admin.client.query(anyApi.ragIngestionInternal.listBatchesAsNuxtAdmin, {}))
      .items[0]._id
    await fixture(
      'source_runs',
      ['queued', 'failed'].map((status) => ({
        batchId: oldBatchId,
        sourceId: youtubeId,
        tenantId: 'default',
        status,
        trigger: status === 'queued' ? 'manual' : 'retry',
        stats,
        errors: [],
        attempt: 1,
        maxAttempts: 2,
      })),
    )
    const detail = await admin.client.query(anyApi.ragIngestionInternal.getBatchDetailAsNuxtAdmin, {
      batchId: oldBatchId,
    })
    queuedRunId = detail.sourceRuns.find((item) => item.status === 'queued')._id
    failedRunId = detail.sourceRuns.find((item) => item.status === 'failed')._id
  },
  { timeout: 60_000 },
)

after(stopRuntime)

test('RAG status discloses no admin count to anonymous, ordinary or email-only accounts', async () => {
  for (const actor of [anonymous, ordinary, emailMatch]) {
    await assert.rejects(
      actor.client.query(anyApi.ragSources.getAdminStatus, {}),
      /Authentication required|Admin access required/,
    )
  }
  const status = await admin.client.query(anyApi.ragSources.getAdminStatus, {})
  assert.equal(status.currentUserIsAdmin, true)
  assert.equal(status.adminCount, 1)
})

test('an unreviewed legacy self-synced grant cannot supply current admin authority', async () => {
  await assert.rejects(
    legacyGrant.client.query(anyApi.ragSources.getAdminStatus, {}),
    /Admin access required/,
  )
  assert.equal((await request('/api/admin/access', legacyGrant)).status, 403)
})

test('the deployed Convex registration manifest matches the reviewed classifications', async () => {
  const manifest = JSON.parse(
    await readFile(join(root, 'scripts/security/admin-surfaces.json'), 'utf8'),
  )
  const actual = deployedFunctions.map((entry) => {
    assert.ok(['Query', 'Mutation', 'Action'].includes(entry.functionType))
    assert.ok(['public', 'internal'].includes(entry.visibility.kind))
    const name = entry.identifier.replace('.js:', ':')
    const expected = manifest.convex[name]
    assert.ok(expected, `Unclassified deployed registration: ${name}`)
    const kind = `${entry.visibility.kind === 'internal' ? 'internal' : ''}${entry.visibility.kind === 'internal' ? entry.functionType : entry.functionType.toLowerCase()}`
    if (entry.visibility.kind !== 'internal' || expected.owner === '74')
      assert.equal(kind, expected.kind, name)
    return name
  })
  for (const [name, entry] of Object.entries(manifest.convex)) {
    if (entry.owner === '74') assert.ok(actual.includes(name), name)
  }
})

const websiteSubmission = {
  type: 'website',
  name: 'Official public information',
  schedule: { frequency: 'manual' },
  websiteConfig: {
    seedUrls: ['https://www.canada.ca/en.html'],
    allowedDomains: ['www.canada.ca'],
    includePatterns: [],
    excludePatterns: [],
    maxDepth: 0,
    maxPagesPerRun: 1,
    renderMode: 'static',
    respectRobots: true,
  },
}

test('every source operation requires admin and preserves official-source administration', async () => {
  const { sourceId } = await admin.client.mutation(
    anyApi.ragSources.createSourceSubmission,
    websiteSubmission,
  )
  const operations = [
    ['query', 'listSources', { includeAllForAdmin: true }],
    ['query', 'getSource', { sourceId }],
    ['mutation', 'createSourceSubmission', websiteSubmission],
    ['mutation', 'updateSourceConfig', { sourceId, name: 'Updated official information' }],
    ['mutation', 'approveSource', { sourceId }],
    ['mutation', 'rejectSource', { sourceId, reason: 'Synthetic review' }],
    ['mutation', 'pauseSource', { sourceId }],
    ['mutation', 'resumeSource', { sourceId }],
    ['mutation', 'removeSource', { sourceId }],
  ]
  for (const actor of [anonymous, ordinary, emailMatch]) {
    for (const [kind, name, args] of operations) {
      await assert.rejects(
        actor.client[kind](anyApi.ragSources[name], args),
        /Authentication required|Admin access required/,
        name,
      )
    }
  }
  assert.ok(
    (
      await admin.client.query(anyApi.ragSources.listSources, { includeAllForAdmin: true })
    ).items.some((item) => item._id === sourceId),
  )
  assert.equal(
    (await admin.client.query(anyApi.ragSources.getSource, { sourceId })).source.name,
    websiteSubmission.name,
  )
  await admin.client.mutation(anyApi.ragSources.updateSourceConfig, {
    sourceId,
    name: 'Updated official information',
  })
  for (const [name, status, args] of [
    ['approveSource', 'approved', {}],
    ['pauseSource', 'paused', {}],
    ['resumeSource', 'approved', {}],
    ['rejectSource', 'rejected', { reason: 'Synthetic review' }],
  ]) {
    await admin.client.mutation(anyApi.ragSources[name], { sourceId, ...args })
    assert.equal(
      (await admin.client.query(anyApi.ragSources.getSource, { sourceId })).source.status,
      status,
    )
  }
})

test('allowlisted ordinary accounts cannot enter admin HTTP routes', async () => {
  const response = await request('/api/admin/access', emailMatch)
  assert.equal(response.status, 403)
  assert.equal((await request('/api/admin/access', admin)).status, 200)
})

test('YouTube submissions and every activation transition stay frozen for admins', async () => {
  for (const [name, args] of [
    [
      'createSourceSubmission',
      {
        type: 'youtube_channel',
        name: 'Frozen',
        schedule: { frequency: 'daily' },
        youtubeConfig: {
          channelId: 'synthetic',
          channelUrl: 'https://www.youtube.com/channel/synthetic',
          maxVideosPerRun: 1,
          includeShorts: false,
        },
      },
    ],
    ['approveSource', { sourceId: youtubeId }],
    ['resumeSource', { sourceId: youtubeId }],
    ['updateSourceConfig', { sourceId: youtubeId, enabled: true }],
    ['updateSourceConfig', { sourceId: youtubeId, schedule: { frequency: 'daily' } }],
  ]) {
    await assert.rejects(
      admin.client.mutation(anyApi.ragSources[name], args),
      /YouTube ingestion is frozen/,
      name,
    )
  }
})

test('manual and force preparation cannot select or reuse frozen YouTube jobs', async () => {
  for (const name of ['prepareManualBatchAsNuxtAdmin', 'runManualBatchAsNuxtAdmin']) {
    for (const force of [false, true]) {
      await assert.rejects(
        operator.mutation(anyApi.ragIngestionInternal[name], {
          idempotencyKey: 'old-youtube',
          sourceIds: [youtubeId],
          actorUserId: admin.userId,
          force,
        }),
        /YouTube ingestion is frozen/,
        name,
      )
    }
  }
})

test('scheduled preparation excludes YouTube and keeps website preparation working', async () => {
  const { sourceId } = await admin.client.mutation(
    anyApi.ragSources.createSourceSubmission,
    websiteSubmission,
  )
  await admin.client.mutation(anyApi.ragSources.approveSource, {
    sourceId,
    schedule: { frequency: 'daily' },
  })
  const batch = await operator.mutation(anyApi.ragIngestionInternal.prepareScheduledBatch, {
    idempotencyKey: 'scheduled-control',
    scheduledFor: Date.now() + 172800000,
    force: true,
  })
  const plan = await operator.query(anyApi.ragIngestionInternal.getBatchExecutionPlanFromNuxt, {
    batchId: batch.batchId,
  })
  assert.ok(plan.items.every((item) => item.source.type === 'website'))
  const manual = await operator.mutation(
    anyApi.ragIngestionInternal.prepareManualBatchAsNuxtAdmin,
    { idempotencyKey: 'website-control', sourceIds: [sourceId], actorUserId: admin.userId },
  )
  assert.equal(manual.sourceCount, 1)
  websiteRunId = (
    await operator.query(anyApi.ragIngestionInternal.getBatchExecutionPlanFromNuxt, {
      batchId: manual.batchId,
    })
  ).items[0].sourceRun._id
})

test('website completion cannot inject a YouTube item through a different source type', async () => {
  await assert.rejects(
    operator.mutation(anyApi.ragIngestionInternal.completeSourceRunFromNuxt, {
      sourceRunId: websiteRunId,
      status: 'succeeded',
      stats,
      errors: [],
      sourceItemUpserts: [
        {
          itemType: 'youtube_video',
          externalId: 'synthetic-video',
          canonicalUrl: 'https://www.youtube.com/watch?v=synthetic',
          lastSeenAt: Date.now(),
          status: 'active',
        },
      ],
    }),
    /YouTube ingestion is frozen|ArgumentValidationError/,
  )
})

test('already-prepared YouTube work cannot claim, execute, finalize, retry or sync', async () => {
  for (const [kind, name, args] of [
    ['mutation', 'startBatchExecutionFromNuxt', { batchId: oldBatchId }],
    ['query', 'getBatchExecutionPlanFromNuxt', { batchId: oldBatchId }],
    ['mutation', 'markSourceRunStartedFromNuxt', { sourceRunId: queuedRunId }],
    [
      'mutation',
      'completeSourceRunFromNuxt',
      { sourceRunId: queuedRunId, status: 'succeeded', stats, errors: [] },
    ],
    [
      'mutation',
      'queueSourceRunRetryScaffold',
      { sourceRunId: failedRunId, requestedByUserId: admin.userId },
    ],
  ]) {
    await assert.rejects(
      operator[kind](anyApi.ragIngestionInternal[name], args),
      /YouTube ingestion is frozen/,
      name,
    )
  }
  await assert.rejects(
    operator.mutation(anyApi.ragIngestionInternal.createOrReuseAiSearchSyncJobForBatchFromNuxt, {
      batchId: oldBatchId,
    }),
    /AI Search is disabled/,
  )
})

test('AI Search API and SSR page deny non-admins and remain off for admins', async () => {
  for (const [actor, expected] of [
    [null, 401],
    [ordinary, 403],
    [emailMatch, 403],
    [admin, 503],
  ]) {
    const response = await request('/api/ai-search/query', actor, 'POST', {
      query: 'Synthetic public question',
      model: 'caller-model',
      systemPrompt: 'caller-prompt',
      filters: { type: 'eq', key: 'filename', value: 'latest.md' },
      includeMetaFiles: true,
    })
    assert.equal(response.status, expected)
  }
  for (const [actor, expected] of [
    [null, 401],
    [ordinary, 403],
    [emailMatch, 403],
  ]) {
    for (const path of ['/ai-search', '/ai-search/_payload.json', '/admin/rag-sources']) {
      const response = await request(path, actor)
      assert.equal(response.status, expected, path)
      assert.match(response.headers.get('cache-control'), /no-store/)
    }
  }
  assert.equal((await request('/ai-search', admin)).status, 200)
})

test('bootstrap and allowlist-sync registrations are absent', async () => {
  for (const actor of [null, ordinary, emailMatch, admin]) {
    assert.equal(
      (await request('/api/admin/rag/convex-admin/sync-current-user', actor, 'POST', {})).status,
      404,
    )
  }
  await assert.rejects(
    anonymous.client.mutation(anyApi.ragSources.bootstrapCurrentUserAsAdmin, {}),
    /Could not find public function|Could not find function/,
  )
  await assert.rejects(
    operator.mutation(anyApi.ragSourcesInternal.syncAdminFromNuxtAllowlist, {
      userId: ordinary.userId,
      grantedByUserId: ordinary.userId,
    }),
    /Could not find public function|Could not find function/,
  )
})

async function artifactText(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return artifactText(path)
      return /\.(mjs|js|html|json)$/.test(entry.name) ? readFile(path, 'utf8') : ''
    }),
  )
  return contents.join('\n')
}

test('built server and browser artifacts contain no transcript proxy or embedded-key caller', async () => {
  const text = await artifactText(join(root, '.output'))
  assert.equal(
    /getYoutubeTranscriptApiBaseUrl|getYoutubeInnerTubeAndroidApiKey|processYoutubeSourceRun|AIza[\w-]{35}/.test(
      text,
    ),
    false,
    'forbidden YouTube implementation is shipped',
  )
})

test('admin pathway reads cannot initialize missing tables or return demo inventory', async () => {
  assert.equal((await request('/api/admin/pathways', admin)).status, 503)
})

test('phase-0 diagnostics disclose configuration presence without configured values', async () => {
  const response = await request('/api/admin/rag/phase0-readiness', admin)
  assert.equal(response.status, 200)
  const body = await response.text()
  assert.equal(body.includes('private-config'), false)
  assert.equal(JSON.parse(body).readiness.overallReady, false)
})

test('every admin HTTP operation rejects anonymous and ordinary accounts before validation', async () => {
  async function files(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    return (
      await Promise.all(
        entries.map((entry) =>
          entry.isDirectory() ? files(join(directory, entry.name)) : join(directory, entry.name),
        ),
      )
    ).flat()
  }
  const handlers = await files(join(root, 'server/api/admin'))
  assert.ok(handlers.length > 30)
  for (const file of handlers) {
    const relative = file.slice(join(root, 'server/api').length).replaceAll('\\', '/')
    const [, path, method] = relative.match(/^(.*)\.(get|post|patch|put|delete)\.ts$/)
    const route = `/api${path.replace(/\/index$/, '').replace(/\[[^\]]+\]/g, 'foreign-id')}`
    for (const [actor, expected] of [
      [null, 401],
      [ordinary, 403],
      [emailMatch, 403],
    ]) {
      const response = await request(
        route,
        actor,
        method.toUpperCase(),
        ['get', 'delete'].includes(method)
          ? undefined
          : { userId: admin.userId, role: 'admin', force: true },
      )
      assert.equal(response.status, expected, `${method} ${route}`)
      assert.match(response.headers.get('cache-control'), /no-store/)
    }
  }
})

async function successful(path, method = 'GET', body, expected = 200) {
  const response = await request(path, admin, method, body)
  assert.equal(response.status, expected, `${method} ${path}: ${await response.clone().text()}`)
  return response.json()
}

test('explicit isolated operator migrations preserve every enabled admin operation', async () => {
  await stopRuntime()
  const db = new PGlite(join(directory, 'app/.data/db/pglite-dev'))
  for (const name of [
    '0004_pathway_definitions.sql',
    '0005_pathway_rules.sql',
    '0006_governance_audit_log.sql',
  ]) {
    await db.exec(await readFile(join(root, 'server/db/migrations/postgresql', name), 'utf8'))
  }
  await db.query(
    `INSERT INTO governance_audit_log
    (event_id, actor_id, action_type, entity_type, entity_id, entity_label, change_context_after, timestamp_ms)
    VALUES ('foreign-case-audit', $1, 'RECOMMENDATION_FLAGGED', 'RECOMMENDATION_RUN', 'foreign-run', 'private-case-marker', '{"privateSnapshot":"private-case-marker"}', $2)`,
    [ordinary.userId, Date.now()],
  )
  await db.close()
  runtimeEnv.ENABLE_CONTRACT_TESTS = 'true'
  runtimeEnv.NUXT_AI_SEARCH_ENABLED = 'true'
  runtimeEnv.NUXT_YOUTUBE_INGESTION_ENABLED = 'true'
  runtimeEnv.NUXT_CLOUDFLARE_AI_SEARCH_ACCOUNT_ID = 'synthetic'
  runtimeEnv.NUXT_CLOUDFLARE_AI_SEARCH_API_TOKEN = 'synthetic'
  runtimeEnv.NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_NAME = 'synthetic'
  await startRuntime()
  const path = '/api/admin/pathways/synthetic-public'
  await successful(
    '/api/admin/pathways',
    'POST',
    { pathwayId: 'synthetic-public', displayName: 'Synthetic public pathway', status: 'draft' },
    201,
  )
  await successful('/api/admin/pathways')
  await successful(path)
  await successful(path, 'PATCH', { displayName: 'Updated public pathway' })
  await successful(`${path}/status`, 'PATCH', { status: 'inactive' })
  const rule = {
    unmetConditionId: 'synthetic-condition',
    fieldPath: 'englishClb',
    operator: '>=',
    comparisonValue: 8,
  }
  const created = (await successful(`${path}/rules`, 'POST', rule)).item
  await successful(`${path}/rules`)
  await successful(`${path}/rules/${created.id}`, 'PATCH', { ...rule, comparisonValue: 9 })
  await successful(`${path}/rules/${created.id}`, 'DELETE')
  await successful(`${path}/rules`, 'PUT', { rules: [rule] })

  const { sourceId } = await successful('/api/admin/rag/sources', 'POST', websiteSubmission)
  const source = `/api/admin/rag/sources/${sourceId}`
  await successful('/api/admin/rag/sources')
  await successful(source)
  await successful(source, 'PATCH', { name: 'Updated public source' })
  await successful(`${source}/approve`, 'POST', {})
  await successful(`${source}/pause`, 'POST', {})
  await successful(`${source}/resume`, 'POST', {})
  await successful(`${source}/reject`, 'POST', { reason: 'Synthetic maintenance' })
  await successful(source, 'DELETE')
  await successful('/api/admin/rag/sources/admin-status')
  await successful('/api/admin/rag/ingestion/batches')
  await successful(`/api/admin/rag/ingestion/batches/${oldBatchId}`)
  await successful('/api/admin/rag/phase0-readiness')
  const events = await successful('/api/admin/audit-trail')
  assert.ok(events.items.length > 0)
  assert.equal(JSON.stringify(events).includes('private-case-marker'), false)
  assert.equal((await request('/api/admin/audit-trail/foreign-case-audit', admin)).status, 404)
  const filtered = await successful('/api/admin/audit-trail?entityType=RECOMMENDATION_RUN')
  assert.equal(filtered.totalCount, 0)
  const summary = await successful('/api/admin/audit-trail/summary')
  assert.equal(summary.eventsToday, events.totalCount)
  await successful(`/api/admin/audit-trail/${events.items[0].eventId}`)
  assert.equal(
    (
      await request('/api/admin/rag/ingestion/run', admin, 'POST', {
        mode: 'manual',
        force: true,
        sourceIds: [youtubeId],
      })
    ).status,
    503,
  )
  assert.equal(
    (await request('/api/internal/scheduler/daily-ingestion', null, 'POST', { force: true }))
      .status,
    503,
  )
  assert.equal(
    (await request('/api/ai-search/query', admin, 'POST', { query: 'Synthetic', enabled: true }))
      .status,
    503,
  )
})

async function approvalHistory(sourceId) {
  const result = await run(
    process.execPath,
    [
      join(root, 'node_modules/convex/bin/main.js'),
      'data',
      'approval_audit_log',
      '--format',
      'json',
      '--env-file',
      join(directory, 'operator.env'),
    ],
    { cwd: join(directory, 'backend'), env: cliEnv },
  )
  return JSON.parse(result.stdout)
    .filter((row) => row.sourceId === sourceId)
    .sort((a, b) => a._id.localeCompare(b._id))
}

async function reviewedSource(name) {
  const { sourceId } = await successful('/api/admin/rag/sources', 'POST', {
    ...websiteSubmission,
    name,
  })
  await admin.client.mutation(anyApi.ragSources.approveSource, { sourceId })
  return { sourceId, history: await approvalHistory(sourceId) }
}

async function deletionEvents(sourceId) {
  return successful(`/api/admin/audit-trail?search=${sourceId}&actionType=EVIDENCE_SOURCE_DELETED`)
}

async function assertRecordedDeletion(sourceId, history, since) {
  assert.equal(await admin.client.query(anyApi.ragSources.getSource, { sourceId }), null)
  const remaining = await approvalHistory(sourceId)
  const events = await deletionEvents(sourceId)
  assert.deepEqual(
    { history: remaining, deletionCount: events.totalCount },
    { history, deletionCount: 1 },
    'deletion must preserve approval history and record exactly one governance event',
  )
  const event = events.items[0]
  assert.equal(event.actorUserId, admin.userId)
  assert.equal(event.actorEmail, admin.email)
  assert.equal(event.actorRole, 'admin')
  assert.equal(event.entityId, sourceId)
  assert.equal(event.entityType, 'EVIDENCE_SOURCE')
  assert.ok(Date.parse(event.timestamp) >= since && Date.parse(event.timestamp) <= Date.now())
  const detail = await successful(`/api/admin/audit-trail/${event.eventId}`)
  assert.equal(detail.event.changeContext.before._id, sourceId)
  assert.equal(detail.event.changeContext.before.name, event.entityLabel)
  assert.equal(detail.event.changeContext.after, null)
  const filtered = await successful(
    `/api/admin/audit-trail?search=${sourceId}&actorId=${admin.userId}&actionType=EVIDENCE_SOURCE_DELETED&pageSize=1`,
  )
  assert.equal(filtered.items[0].eventId, event.eventId)
  assert.equal(filtered.nextCursor, null)
  const retained = await successful(`/api/admin/audit-trail?search=${sourceId}`)
  assert.equal(retained.totalCount, 2)
  assert.equal(
    retained.items.filter((item) => item.actionType === 'EVIDENCE_SOURCE_CREATED').length,
    1,
  )
  const first = await successful(`/api/admin/audit-trail?search=${sourceId}&pageSize=1`)
  assert.equal(first.items[0].eventId, event.eventId)
  assert.equal(first.nextCursor, '1')
  const second = await successful(
    `/api/admin/audit-trail?search=${sourceId}&pageSize=1&cursor=${first.nextCursor}`,
  )
  assert.equal(second.items[0].actionType, 'EVIDENCE_SOURCE_CREATED')
  assert.equal(second.nextCursor, null)
  const unfiltered = await successful('/api/admin/audit-trail?pageSize=100')
  assert.equal(unfiltered.items.filter((item) => item.eventId === event.eventId).length, 1)
  const summary = await successful('/api/admin/audit-trail/summary')
  assert.equal(summary.eventsToday, unfiltered.totalCount)
}

test('direct source deletion preserves approval history and records one actor-bound event', async () => {
  const { sourceId, history } = await reviewedSource('Direct deletion audit probe')
  assert.equal(history.length, 2)
  const since = Date.now()
  assert.equal((await admin.client.mutation(anyApi.ragSources.removeSource, { sourceId })).ok, true)
  await assertRecordedDeletion(sourceId, history, since)
  await assert.rejects(
    admin.client.mutation(anyApi.ragSources.removeSource, { sourceId }),
    /Source not found/,
  )
  assert.equal((await deletionEvents(sourceId)).totalCount, 1)
})

test('HTTP source deletion ignores forged actor fields and records the same single event', async () => {
  const { sourceId, history } = await reviewedSource('HTTP deletion audit probe')
  const since = Date.now()
  await successful(`/api/admin/rag/sources/${sourceId}`, 'DELETE', {
    actorUserId: ordinary.userId,
    actorId: ordinary.userId,
    actorEmail: ordinary.email,
    timestamp: 1,
  })
  await assertRecordedDeletion(sourceId, history, since)
})

test('actor arguments cannot grant deletion authority or change the recorded actor', async () => {
  const { sourceId, history } = await reviewedSource('Denied deletion probe')
  for (const actor of [anonymous, ordinary, emailMatch]) {
    await assert.rejects(
      actor.client.query(anyApi.ragSourceAudit.listDeletionEvents, {
        paginationOpts: { cursor: null, numItems: 100 },
      }),
      /Authentication required|Admin access required/,
    )
  }
  await assert.rejects(
    admin.client.mutation(anyApi.ragSources.removeSource, {
      sourceId,
      actorUserId: ordinary.userId,
    }),
    /ArgumentValidationError|extra field/,
  )
  await assert.rejects(
    ordinary.client.mutation(anyApi.ragSources.removeSource, { sourceId }),
    /Admin access required/,
  )
  assert.equal(
    (
      await request(`/api/admin/rag/sources/${sourceId}`, ordinary, 'DELETE', {
        actorUserId: admin.userId,
      })
    ).status,
    403,
  )
  assert.ok(await admin.client.query(anyApi.ragSources.getSource, { sourceId }))
  assert.deepEqual(await approvalHistory(sourceId), history)
  assert.equal((await deletionEvents(sourceId)).totalCount, 0)
})

test('a fault after source deletion rolls back the deletion and its audit transaction', async () => {
  const { sourceId, history } = await reviewedSource('Rollback deletion probe')
  const before = await admin.client.query(anyApi.ragSources.getSource, { sourceId })
  await assert.rejects(
    admin.client.mutation(anyApi.ragSources.removeSource, { sourceId }),
    /Injected deletion audit failure/,
  )
  assert.deepEqual(await admin.client.query(anyApi.ragSources.getSource, { sourceId }), before)
  assert.deepEqual(await approvalHistory(sourceId), history)
  assert.equal((await deletionEvents(sourceId)).totalCount, 0)
  assert.equal((await request(`/api/admin/rag/sources/${sourceId}`, admin, 'DELETE')).status, 500)
  assert.deepEqual(await admin.client.query(anyApi.ragSources.getSource, { sourceId }), before)
  assert.deepEqual(await approvalHistory(sourceId), history)
  assert.equal((await deletionEvents(sourceId)).totalCount, 0)
})

test('configuration and review transitions append history without rewriting earlier decisions', async () => {
  const { sourceId, history } = await reviewedSource('Retained review history probe')
  for (const [name, args] of [
    ['updateSourceConfig', { name: 'Updated review history probe' }],
    ['rejectSource', { reason: 'Retained rejection' }],
    ['approveSource', {}],
    ['pauseSource', { note: 'Retained pause' }],
    ['resumeSource', {}],
  ]) {
    await admin.client.mutation(anyApi.ragSources[name], { sourceId, ...args })
  }
  const remaining = await approvalHistory(sourceId)
  assert.equal(remaining.length, 7)
  assert.deepEqual(
    remaining.filter((row) => history.some((previous) => previous._id === row._id)),
    history,
  )
  assert.deepEqual(
    remaining.map((row) => row.action).sort(),
    ['submit', 'approve', 'edit', 'reject', 'approve', 'pause', 'resume'].sort(),
  )
})

test('a foreign origin cannot use an admitted admin session for source mutations', async () => {
  assert.equal((await request('/api/admin/access', admin)).status, 200)
  const response = await fetch(`${origin}/api/admin/rag/sources`, {
    method: 'POST',
    headers: {
      cookie: admin.cookie,
      origin: 'https://foreign.example.test',
      'content-type': 'application/json',
    },
    body: JSON.stringify(websiteSubmission),
  })
  assert.equal(response.status, 403)
})

test('a removed current admin grant immediately denies the same real session and JWT', async () => {
  assert.equal((await request('/api/admin/access', admin)).status, 200)
  const file = join(directory, 'revoked-grants.json')
  await writeFile(file, '[]')
  await run(
    process.execPath,
    [
      join(root, 'node_modules/convex/bin/main.js'),
      'import',
      '--env-file',
      join(directory, 'operator.env'),
      '--replace',
      '--yes',
      '--table',
      'rag_admins',
      file,
    ],
    {
      cwd: join(directory, 'backend'),
      env: cliEnv,
    },
  )
  await assert.rejects(
    admin.client.query(anyApi.ragSources.getAdminStatus, {}),
    /Admin access required/,
  )
  assert.equal((await request('/api/admin/access', admin)).status, 403)
  assert.equal((await request('/admin/rag-phase0', admin)).status, 403)
})

test('an unavailable authority backend cannot fall back to allowlists or deployment credentials', async () => {
  await stopRuntime()
  runtimeEnv.CONVEX_URL = 'http://127.0.0.1:9'
  runtimeEnv.NUXT_RAG_ADMIN_EMAILS = admin.email
  await startRuntime()
  assert.equal((await request('/api/admin/access', admin)).status, 503)
  assert.equal((await request('/api/admin/rag/phase0-readiness', admin)).status, 503)
})
