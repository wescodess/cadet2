import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { after, before, test as registerTest } from 'node:test'
import { isDeepStrictEqual, promisify } from 'node:util'
import { once } from 'node:events'
import { createWriteStream } from 'node:fs'
import { createServer } from 'node:http'
import { setInterval, clearInterval } from 'node:timers'
import { URLSearchParams } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { ConvexHttpClient } from 'convex/browser'
import { anyApi } from 'convex/server'
import { chromium } from '@playwright/test'

const group = process.env.CONTAINMENT_TEST_GROUP ?? 'all'
if (
  ![
    'all',
    'admission',
    'source-audit',
    'sql-rollback',
    'source-rollback',
    'audit-success',
    'audit-consistency',
    'design',
    'audit-search',
    'navigation',
    'network',
  ].includes(group)
)
  throw new Error('Invalid mandatory boundary group')
let registrationGroup = 'admission'
function test(name, ...args) {
  if (group === 'all' || registrationGroup === group) return registerTest(name, ...args)
}

const root = resolve(import.meta.dirname, '../..')
const directory = process.env.CONTAINMENT_DIRECTORY
const origin = process.env.CONTAINMENT_ORIGIN
const appDirectory = join(directory ?? '.', `app-${group}`)
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
    cwd: appDirectory,
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

async function request(path, actor, method = 'GET', body, headers = {}) {
  return fetch(`${origin}${path}`, {
    method,
    headers: {
      ...(actor ? { cookie: actor.cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      origin,
      ...(method === 'POST' ? { 'Idempotency-Key': randomBytes(16).toString('hex') } : {}),
      ...headers,
    },
    body: body
      ? JSON.stringify(
          Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'idempotencyKey')),
        )
      : undefined,
    redirect: 'manual',
  })
}

async function fixture(table, rows, replace = false) {
  const file = join(directory, `${table}.json`)
  await writeFile(file, JSON.stringify(rows))
  await run(
    process.execPath,
    [
      join(root, 'node_modules/convex/bin/main.js'),
      'import',
      '--env-file',
      join(directory, 'operator.env'),
      ...(replace ? ['--replace', '--yes'] : ['--append']),
      '--table',
      table,
      file,
    ],
    {
      cwd: join(directory, 'backend'),
      env: cliEnv,
    },
  )
  if (operator && ['approval_audit_log', 'rag_source_deletions'].includes(table)) {
    let result
    do {
      result = await operator.mutation(anyApi.ragSourceAudit.backfillEvents, {
        table: table === 'approval_audit_log' ? 'approval' : 'deletion',
        batchSize: 4,
      })
    } while (!result.done)
  }
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
    await cp(join(root, 'shared'), join(directory, 'backend/shared'), { recursive: true })
    const sourceModule = join(directory, 'backend/convex/ragSources.ts')
    const sourceCode = await readFile(sourceModule, 'utf8')
    const deletion = 'await ctx.db.delete(args.sourceId)'
    assert.equal(sourceCode.split(deletion).length, 2)
    await writeFile(
      sourceModule,
      sourceCode
        .replace(
          deletion,
          `${deletion}\n    if (source.name === 'Rollback deletion probe') throw new Error('Injected deletion audit failure')`,
        )
        .replace(
          'timestamp: Date.now(),\n  })',
          `timestamp: Date.now(),\n  })
  if ('governance' in input && (await ctx.db.get(input.sourceId))?.name === 'Rollback governance ' + input.action)
    throw new Error('Injected governance audit failure')`,
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
    for (const name of await readdir(join(directory, 'backend'))) {
      if (/^function_spec_\d+\.json$/.test(name)) await rm(join(directory, 'backend', name))
    }
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
      join(evidence, `deployed-functions-${group}.json`),
      JSON.stringify(deployedFunctions, null, 2),
    )
    await mkdir(join(appDirectory, '.data/db'), { recursive: true })
    const db = new PGlite(join(appDirectory, '.data/db/pglite-dev'))
    await db.exec(`
    CREATE TABLE "user" (id text PRIMARY KEY, name text NOT NULL, email text UNIQUE NOT NULL, "emailVerified" boolean NOT NULL DEFAULT false, image text, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "userId" text);
    CREATE TABLE session (id text PRIMARY KEY, "expiresAt" timestamp NOT NULL, token text UNIQUE NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), "ipAddress" text, "userAgent" text, "userId" text NOT NULL REFERENCES "user"(id));
    CREATE TABLE account (id text PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL, "userId" text NOT NULL REFERENCES "user"(id), "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamp, "refreshTokenExpiresAt" timestamp, scope text, password text, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());
    CREATE TABLE verification (id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamp NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now());
    CREATE TABLE jwks (id text PRIMARY KEY, "publicKey" text NOT NULL, "privateKey" text NOT NULL, "createdAt" timestamp NOT NULL, "expiresAt" timestamp);
  `)
    if (!['admission', 'navigation', 'all'].includes(group)) {
      for (const name of [
        '0004_pathway_definitions.sql',
        '0005_pathway_rules.sql',
        '0006_governance_audit_log.sql',
        '0007_bounded_governance_audit.sql',
      ]) {
        await db.exec(await readFile(join(root, 'server/db/migrations/postgresql', name), 'utf8'))
      }
    }
    await db.close()
    runtimeEnv = {
      ...process.env,
      BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
      NUXT_PUBLIC_SITE_URL: origin,
      CONVEX_SITE_URL: origin,
      CADET_AUTH_ISSUER: origin,
      CONVEX_URL: backend,
      NUXT_PUBLIC_CONVEX_URL: backend,
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
    if (group !== 'admission' && group !== 'all') return
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
  get idempotencyKey() {
    return randomBytes(16).toString('hex')
  },
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
        idempotencyKey: randomBytes(16).toString('hex'),
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

const adminPages = [
  'pathways',
  'pathway-rules',
  'evidence-sources',
  'rag-sources',
  'rag-phase0',
  'recommendation-reviews',
  'audit-trail',
].map((name) => `/admin/${name}`)

async function settle(page, destination) {
  await page.waitForFunction((target) => {
    const app = globalThis.document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties
    return (
      app?.$nuxt.isHydrating === false &&
      !app.$nuxt._processingMiddleware &&
      app.$router.currentRoute.value.fullPath === target
    )
  }, destination)
}

async function deferredManifestLoaded(page) {
  await page.waitForFunction(() =>
    globalThis.performance
      .getEntriesByType('resource')
      .some((entry) => entry.name.includes('/_nuxt/builds/meta/')),
  )
}

async function deniedPageVisit(page, path, mode) {
  if (mode === 'direct') {
    await deferredManifestLoaded(page)
    await page.goto(`${origin}${path}`)
    return
  }
  await page.evaluate(async (target) => {
    const { $router } =
      globalThis.document.querySelector('#__nuxt').__vue_app__.config.globalProperties
    await $router.push('/')
    await $router.push(target)
  }, path)
}

async function browserContext(browser, viewport, actor) {
  const context = await browser.newContext({ viewport, colorScheme: 'light' })
  if (actor) {
    await context.addCookies(
      actor.cookie.split('; ').map((pair) => {
        const separator = pair.indexOf('=')
        return { name: pair.slice(0, separator), value: pair.slice(separator + 1), url: origin }
      }),
    )
  }
  const page = await context.newPage()
  const problems = []
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      problems.push({ console: message.text(), url: message.location().url })
  })
  page.on('pageerror', (error) => problems.push({ exception: error.message }))
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push({ status: response.status(), url: response.url() })
  })
  page.on('requestfailed', (request) => {
    if (request.url().includes('/_nuxt/builds/'))
      problems.push({ failed: request.url(), error: request.failure()?.errorText })
  })
  return { context, page, problems }
}

async function browserPage(browser, viewport, actor) {
  const session = await browserContext(browser, viewport, actor)
  await session.page.goto(`${origin}/`)
  await settle(session.page, '/')
  return session
}

async function openAuditTrail(browser) {
  const session = await browserContext(browser, { width: 1440, height: 900 }, admin)
  const listed = session.page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/admin/audit-trail',
  )
  await session.page.goto(`${origin}/admin/audit-trail`)
  await settle(session.page, '/admin/audit-trail')
  await listed
  return session
}

async function applyAuditFilter(page, apply, expected) {
  const listed = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      url.pathname === '/api/admin/audit-trail' &&
      Object.entries(expected).every(([key, value]) => url.searchParams.get(key) === value)
    )
  })
  await apply()
  assert.equal((await listed).status(), 200)
}

async function assertCleanDenial(page, problems, { actor, destination, landmark, mode, label }) {
  const accessDenial = `${origin}/api/admin/access`
  const denial =
    mode === 'client' && actor
      ? page.waitForEvent('console', (message) => message.type() === 'error')
      : null
  await deniedPageVisit(page, label.path, mode)
  await settle(page, destination)
  await denial
  await landmark.waitFor({ timeout: 10_000 })
  assert.doesNotMatch(
    await page.locator('body').innerText(),
    /Admin access denied|Authentication required|\b40[13]\b/,
    label.text,
  )
  assert.deepEqual(
    problems.splice(0).sort((a, b) => Object.keys(a)[0].localeCompare(Object.keys(b)[0])),
    denial
      ? [
          {
            console:
              'Failed to load resource: the server responded with a status of 403 (Admin access denied)',
            url: accessDenial,
          },
          { status: 403, url: accessDenial },
        ]
      : [],
    label.text,
  )
}

registrationGroup = 'navigation'

test('denied page documents redirect while payloads and admin APIs keep their denial status', async () => {
  for (const [actor, status, location] of [
    [null, 401, '/auth'],
    [ordinary, 403, '/'],
  ]) {
    const pages = [...adminPages, '/ai-search']
    const caseVariants = pages.flatMap((path) => [
      path.toUpperCase(),
      path.replace(/^\/(\w)/, (_, first) => `/${first.toUpperCase()}`),
    ])
    for (const path of [...pages, ...caseVariants]) {
      const page = await request(path, actor, 'GET', undefined, { accept: 'text/html' })
      assert.equal(page.status, 302, path)
      assert.equal(page.headers.get('location'), location, path)
      assert.match(page.headers.get('cache-control'), /no-store/, path)
      const payload = await request(`${path}/_payload.json`, actor, 'GET', undefined, {
        accept: 'text/html',
      })
      assert.equal(payload.status, status, path)
    }
    assert.equal((await request('/api/admin/access', actor)).status, status)
  }
  for (const actor of [null, ordinary, emailMatch, legacyGrant, admin]) {
    for (const path of [
      '/admin/%',
      '/admin/%E0%A4%A',
      '/ADMIN/%',
      '/ai-search/%',
      '/api/admin/%',
      '/%',
    ]) {
      for (const method of ['GET', 'HEAD']) {
        const page = await request(path, actor, method, undefined, { accept: 'text/html' })
        assert.equal(page.status, 400, `${method} ${path}`)
        assert.equal(page.headers.get('cache-control'), 'private, no-store', `${method} ${path}`)
      }
    }
  }
})

test('denied admin pages land on a clean safe page for direct loads and client navigation', async () => {
  const desktop = { width: 1440, height: 900 }
  const browser = await chromium.launch({
    executablePath: process.env.CONTAINMENT_BROWSER_EXECUTABLE,
  })
  try {
    for (const { actor, destination, landmark, paths, viewports } of [
      {
        actor: ordinary,
        destination: '/',
        landmark: (page) => page.getByRole('heading', { level: 1, name: 'cadet2', exact: true }),
        paths: [...adminPages, '/ai-search'],
        viewports: [desktop, { width: 390, height: 844 }],
      },
      {
        actor: null,
        destination: '/auth',
        landmark: (page) => page.getByRole('heading', { name: 'Create account' }),
        paths: [adminPages[0]],
        viewports: [desktop],
      },
    ]) {
      for (const viewport of viewports) {
        const { context, page, problems } = await browserPage(browser, viewport, actor)
        for (const mode of ['direct', 'client']) {
          for (const path of paths) {
            await assertCleanDenial(page, problems, {
              actor,
              destination,
              landmark: landmark(page),
              mode,
              label: { path, text: `${mode} ${path} ${viewport.width}px → ${destination}` },
            })
          }
        }
        assert.deepEqual(problems, [])
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
})

registrationGroup = 'admission'

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
  const db = new PGlite(join(appDirectory, '.data/db/pglite-dev'))
  for (const name of [
    '0004_pathway_definitions.sql',
    '0005_pathway_rules.sql',
    '0006_governance_audit_log.sql',
    '0007_bounded_governance_audit.sql',
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
  const rows = []
  let cursor = null
  while (true) {
    const result = await admin.client.query(anyApi.ragSourceAudit.listApprovalEvents, {
      paginationOpts: { cursor, numItems: 100 },
    })
    rows.push(...result.page)
    if (result.isDone) break
    cursor = result.continueCursor
  }
  return rows.filter((row) => row.sourceId === sourceId).sort((a, b) => a._id.localeCompare(b._id))
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
  assert.equal(retained.totalCount, 3)
  assert.equal(
    retained.items.filter((item) => item.actionType === 'EVIDENCE_SOURCE_CREATED').length,
    1,
  )
  const first = await successful(`/api/admin/audit-trail?search=${sourceId}&pageSize=1`)
  assert.equal(first.items[0].eventId, event.eventId)
  assert.ok(first.nextCursor && first.nextCursor !== '1')
  const second = await successful(
    `/api/admin/audit-trail?search=${sourceId}&pageSize=1&cursor=${first.nextCursor}`,
  )
  assert.equal(second.items[0].actionType, 'EVIDENCE_SOURCE_APPROVED')
  assert.ok(second.nextCursor && second.nextCursor !== first.nextCursor)
  const third = await successful(
    `/api/admin/audit-trail?search=${sourceId}&pageSize=1&cursor=${second.nextCursor}`,
  )
  assert.equal(third.items[0].actionType, 'EVIDENCE_SOURCE_CREATED')
  assert.equal(third.nextCursor, null)
  const unfiltered = await successful('/api/admin/audit-trail?pageSize=100')
  assert.equal(unfiltered.items.filter((item) => item.eventId === event.eventId).length, 1)
  const summary = await successful('/api/admin/audit-trail/summary')
  assert.equal(summary.eventsToday, unfiltered.totalCount)
}

registrationGroup = 'source-audit'

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
    for (const [name, args] of [
      ['listDeletionEvents', { paginationOpts: { cursor: null, numItems: 100 } }],
      ['listApprovalEvents', { paginationOpts: { cursor: null, numItems: 100 } }],
      ['listEvents', { filters: {}, limit: 2, includeCount: true }],
      ['getEvent', { eventId: 'unknown' }],
      ['getSummary', {}],
    ]) {
      await assert.rejects(
        actor.client.query(anyApi.ragSourceAudit[name], args),
        /Authentication required|Admin access required/,
      )
    }
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

async function deletionPage() {
  return admin.client.query(anyApi.ragSourceAudit.listDeletionEvents, {
    paginationOpts: { cursor: null, numItems: 100 },
  })
}

async function assertAuditAvailability(label, eventId) {
  const paths = [
    '/api/admin/audit-trail',
    '/api/admin/audit-trail/summary',
    `/api/admin/audit-trail/${eventId}`,
    '/api/admin/audit-trail?entityType=PATHWAY',
  ]
  const observations = []
  for (const path of paths) {
    const response = await request(path, admin)
    observations.push({ path, status: response.status, body: await response.json() })
  }
  await writeFile(
    join(process.env.QUALITY_OUTPUT_DIR, `${label}.json`),
    JSON.stringify(observations, null, 2),
  )
  assert.deepEqual(
    observations.map(({ status }) => status),
    [200, 200, 200, 200],
    `${label}: every audit endpoint must remain readable`,
  )
  assert.equal(observations[1].body.eventsToday, observations[0].body.totalCount)
  assert.equal(observations[2].body.event.eventId, eventId)
  assert.ok(observations[3].body.items.every((item) => item.entityType === 'PATHWAY'))
}

test('retained NUL snapshots cannot disable any governance audit endpoint', async () => {
  const before = await deletionPage()
  const known = before.page[0]
  assert.ok(known)
  const source = {
    ...known.source,
    name: 'Retained \u0000 source',
    crawlConfig: {
      nested: [{ key: 'nested\u0000value', literal: String.raw`\u0000`, emoji: '😀' }],
    },
  }
  try {
    await fixture('rag_source_deletions', [
      {
        sourceId: known.sourceId,
        source,
        actorId: admin.userId,
        timestamp: Date.now(),
      },
    ])
    const stored = (await deletionPage()).page.find((row) => row.source.name === source.name)
    assert.ok(stored)
    await assertAuditAvailability('nul-snapshot', `rag-deletion:${known._id}`)
    const detail = await successful(`/api/admin/audit-trail/rag-deletion:${stored._id}`)
    assert.equal(detail.event.entityLabel, 'Retained � source')
    assert.deepEqual(detail.event.changeContext.before.crawlConfig.nested, [
      { key: 'nested�value', literal: String.raw`\u0000`, emoji: '😀' },
    ])
    assert.deepEqual(
      (await deletionPage()).page.find((row) => row._id === stored._id),
      stored,
    )
  } finally {
    await fixture('rag_source_deletions', before.page, true)
  }
})

test('nameless deletion snapshots fall back to the source ID without disabling audits', async () => {
  const before = await deletionPage()
  const known = before.page[0]
  assert.ok(known)
  const snapshots = [
    {},
    { name: null },
    { name: 42 },
    { name: '' },
    { name: '   ' },
    null,
    ['retained snapshot'],
  ]
  const expected = [
    {},
    { name: null },
    { name: 42 },
    { name: '' },
    { name: '   ' },
    { value: null },
    { value: ['retained snapshot'] },
  ]
  try {
    await fixture(
      'rag_source_deletions',
      snapshots.map((source, index) => ({
        sourceId: known.sourceId,
        source,
        actorId: admin.userId,
        timestamp: Date.now() + index,
      })),
    )
    const current = await deletionPage()
    const stored = current.page
      .filter((row) => !before.page.some((previous) => previous._id === row._id))
      .sort((left, right) => left.timestamp - right.timestamp)
    assert.equal(stored.length, snapshots.length)
    await assertAuditAvailability('nameless-snapshot', `rag-deletion:${known._id}`)
    for (let index = 0; index < stored.length; index++) {
      assert.deepEqual(stored[index].source, snapshots[index])
      const detail = await successful(`/api/admin/audit-trail/rag-deletion:${stored[index]._id}`)
      assert.equal(detail.event.entityLabel, known.sourceId)
      assert.deepEqual(detail.event.changeContext, { before: expected[index], after: null })
    }
    assert.deepEqual((await deletionPage()).page, current.page)
  } finally {
    await fixture('rag_source_deletions', before.page, true)
  }
})

test('public source actions project NUL snapshots and audit text safely into SQL', async () => {
  const { sourceId } = await admin.client.mutation(anyApi.ragSources.createSourceSubmission, {
    ...websiteSubmission,
    name: 'Public NUL snapshot probe',
    description: 'retained\u0000description',
    tags: ['tag\u0000value'],
  })
  await successful(`/api/admin/rag/sources/${sourceId}/reject`, 'POST', {
    reason: 'audit\u0000reason',
  })
  const canonical = await admin.client.query(anyApi.ragSources.getSource, { sourceId })
  assert.equal(canonical.source.description, 'retained\u0000description')
  assert.equal(canonical.source.rejectionReason, 'audit\u0000reason')
  const listed = await successful(`/api/admin/audit-trail?search=${sourceId}`)
  assert.equal(listed.totalCount, 2)
  const event = listed.items.find((item) => item.actionType === 'EVIDENCE_SOURCE_REJECTED')
  assert.equal(event.reason, 'audit�reason')
  const detail = await successful(`/api/admin/audit-trail/${event.eventId}`)
  assert.equal(detail.event.changeContext.before.description, 'retained�description')
  assert.equal(detail.event.changeContext.after.rejectionReason, 'audit�reason')
  assert.deepEqual(detail.event.changeContext.after.tags, ['tag�value'])
  const search = await successful(
    `/api/admin/audit-trail?search=${encodeURIComponent('audit\u0000reason')}`,
  )
  assert.equal(search.items[0].eventId, event.eventId)
  await successful(`/api/admin/audit-trail?actorId=${encodeURIComponent('unmatched\u0000value')}`)
  assert.equal((await request(`/api/admin/audit-trail/${event.eventId}%00`, admin)).status, 404)
  await admin.client.mutation(anyApi.ragSources.removeSource, { sourceId })
  await assertAuditAvailability('public-nul-snapshot', event.eventId)
  const stored = (await deletionPage()).page.find((row) => row.sourceId === sourceId)
  assert.ok(stored)
  assert.equal(stored.source.description, canonical.source.description)
  assert.equal(stored.source.rejectionReason, canonical.source.rejectionReason)
  const deletion = await successful(`/api/admin/audit-trail/rag-deletion:${stored._id}`)
  assert.equal(deletion.event.changeContext.before.description, 'retained�description')

  const legacy = Object.fromEntries(
    Object.entries(canonical.source).filter(([key]) => !['_id', '_creationTime'].includes(key)),
  )
  legacy.name = 'Legacy\u0000SQL label'
  await fixture('sources', [legacy])
  const legacySource = (
    await admin.client.query(anyApi.ragSources.listSources, { includeAllForAdmin: true })
  ).items.find((item) => item.name === legacy.name)
  assert.ok(legacySource)
  await successful(`/api/admin/rag/sources/${legacySource._id}/pause`, 'POST', {})
  const legacyEvents = await successful(`/api/admin/audit-trail?search=${legacySource._id}`)
  assert.equal(legacyEvents.items[0].entityLabel, 'Legacy�SQL label')
  const legacyDetail = await successful(`/api/admin/audit-trail/${legacyEvents.items[0].eventId}`)
  assert.equal(legacyDetail.event.changeContext.before.name, 'Legacy�SQL label')
  assert.equal(
    (await admin.client.query(anyApi.ragSources.getSource, { sourceId: legacySource._id })).source
      .name,
    legacy.name,
  )
})

test('source creation and update reject control characters in names and config at both public seams', async () => {
  const { sourceId } = await admin.client.mutation(
    anyApi.ragSources.createSourceSubmission,
    websiteSubmission,
  )
  const invalid = [
    ...['\u0000', '\t', '\n', '\u001f', '\u007f', '\u0085'].map((control) => ({
      name: `${control}invalid source`,
    })),
    ...['seedUrls', 'allowedDomains', 'includePatterns', 'excludePatterns'].map((key) => ({
      websiteConfig: { ...websiteSubmission.websiteConfig, [key]: ['\tinvalid config'] },
    })),
    {
      websiteConfig: {
        ...websiteSubmission.websiteConfig,
        requestHeadersRef: 'invalid\u0000config',
      },
    },
  ]
  for (const patch of invalid) {
    await assert.rejects(
      admin.client.mutation(anyApi.ragSources.createSourceSubmission, {
        ...websiteSubmission,
        ...patch,
      }),
      /control characters/i,
    )
    await assert.rejects(
      admin.client.mutation(anyApi.ragSources.updateSourceConfig, { sourceId, ...patch }),
      /control characters/i,
    )
    assert.equal(
      (await request('/api/admin/rag/sources', admin, 'POST', { ...websiteSubmission, ...patch }))
        .status,
      400,
    )
    assert.equal(
      (await request(`/api/admin/rag/sources/${sourceId}`, admin, 'PATCH', patch)).status,
      400,
    )
  }
  const name = String.raw`Public 😀 literal \u0000`
  await successful(`/api/admin/rag/sources/${sourceId}`, 'PATCH', {
    name,
    websiteConfig: { ...websiteSubmission.websiteConfig, includePatterns: [String.raw`\u0000`] },
  })
  assert.equal(
    (await admin.client.query(anyApi.ragSources.getSource, { sourceId })).source.name,
    name,
  )
})

const atomicRule = {
  unmetConditionId: 'atomic-condition',
  fieldPath: 'englishClb',
  operator: '>=',
  comparisonValue: 8,
}

const sqlWrites = [
  ['pathway-create', 'PATHWAY_CREATED'],
  ['pathway-update', 'PATHWAY_UPDATED'],
  ['pathway-status', 'PATHWAY_STATUS_CHANGED'],
  ['rule-create', 'PATHWAY_RULE_CREATED'],
  ['rules-replace', 'PATHWAY_RULE_UPDATED'],
  ['rule-update', 'PATHWAY_RULE_UPDATED'],
  ['rule-delete', 'PATHWAY_RULE_DELETED'],
]

async function sqlFixture(callback) {
  await stopRuntime()
  const db = new PGlite(join(appDirectory, '.data/db/pglite-dev'))
  try {
    return await callback(db)
  } finally {
    await db.close()
    await startRuntime()
  }
}

async function rejectSqlAudit(action) {
  assert.match(action, /^[A-Z_]+$/)
  await sqlFixture((db) =>
    db.exec(
      `ALTER TABLE governance_audit_log ADD CONSTRAINT atomic_audit_fault CHECK (action_type <> '${action}') NOT VALID`,
    ),
  )
}

async function restoreSqlAudit() {
  await sqlFixture((db) =>
    db.exec('ALTER TABLE governance_audit_log DROP CONSTRAINT atomic_audit_fault'),
  )
}

async function prepareSqlWrite(name, suffix) {
  const pathwayId = `atomic-${name}-${suffix}`
  const path = `/api/admin/pathways/${pathwayId}`
  let rule
  if (name !== 'pathway-create') {
    await successful(
      '/api/admin/pathways',
      'POST',
      {
        pathwayId,
        displayName: pathwayId,
        status: 'draft',
      },
      201,
    )
  }
  if (['rules-replace', 'rule-update', 'rule-delete'].includes(name)) {
    rule = (await successful(`${path}/rules`, 'POST', atomicRule)).item
  }
  const operations = {
    'pathway-create': [
      '/api/admin/pathways',
      'POST',
      { pathwayId, displayName: pathwayId, status: 'draft' },
    ],
    'pathway-update': [path, 'PATCH', { displayName: `${pathwayId}-updated` }],
    'pathway-status': [`${path}/status`, 'PATCH', { status: 'inactive' }],
    'rule-create': [`${path}/rules`, 'POST', atomicRule],
    'rules-replace': [
      `${path}/rules`,
      'PUT',
      { rules: [{ ...atomicRule, id: rule?.id, comparisonValue: 9 }] },
    ],
    'rule-update': [`${path}/rules/${rule?.id}`, 'PATCH', { ...atomicRule, comparisonValue: 9 }],
    'rule-delete': [`${path}/rules/${rule?.id}`, 'DELETE'],
  }
  return { pathwayId, path, operation: operations[name], rule }
}

async function pathwaySnapshot(path) {
  const response = await request(path, admin)
  if (response.status === 404) return null
  assert.equal(response.status, 200)
  return { pathway: await response.json(), rules: (await successful(`${path}/rules`)).items }
}

async function auditFor(entityId) {
  return successful(`/api/admin/audit-trail?search=${encodeURIComponent(entityId)}&pageSize=100`)
}

async function recordAtomicObservation(name, observation) {
  await writeFile(
    join(process.env.QUALITY_OUTPUT_DIR, `${name}.json`),
    JSON.stringify(observation, null, 2),
  )
}

test('evidence-source and SQL audit details open exactly as the audit page requests them', async () => {
  const marker = `encoded-detail-${randomBytes(4).toString('hex')}`
  await reviewedSource(`${marker} approved source`)
  const { sourceId: deletedId } = await successful('/api/admin/rag/sources', 'POST', {
    ...websiteSubmission,
    name: `${marker} deleted source`,
  })
  await successful(`/api/admin/rag/sources/${deletedId}`, 'DELETE')
  await successful(
    '/api/admin/pathways',
    'POST',
    { pathwayId: `${marker}-pathway`, displayName: `${marker} pathway`, status: 'draft' },
    201,
  )
  const listed = (await successful(`/api/admin/audit-trail?search=${marker}&pageSize=100`)).items
  const events = [
    ['EVIDENCE_SOURCE_APPROVED', `${marker} approved source`, 'rag-approval:'],
    ['EVIDENCE_SOURCE_DELETED', `${marker} deleted source`, 'rag-deletion:'],
    ['PATHWAY_CREATED', `${marker} pathway`, 'audit-'],
  ].map(([actionType, label, prefix]) => {
    const event = listed.find((item) => item.actionType === actionType)
    assert.ok(event?.eventId.startsWith(prefix), actionType)
    return { ...event, label }
  })
  const observations = []
  for (const { eventId } of events) {
    const encoded = encodeURIComponent(eventId)
    for (const path of [eventId, encoded, encoded.replaceAll('%3A', '%3a')]) {
      const response = await request(`/api/admin/audit-trail/${path}`, admin)
      const body = await response.json()
      observations.push({ path, status: response.status })
      assert.equal(response.status, 200, `${path}: ${JSON.stringify(body)}`)
      assert.equal(body.event.eventId, eventId)
    }
  }
  for (const path of [`${encodeURIComponent(events[0].eventId)}%E0%A4%A`, '%', '%3']) {
    const response = await request(`/api/admin/audit-trail/${path}`, admin)
    observations.push({ path, status: response.status })
    assert.equal(response.status, 400, path)
  }
  const browser = await chromium.launch({
    executablePath: process.env.CONTAINMENT_BROWSER_EXECUTABLE,
  })
  try {
    const { context, page, problems } = await openAuditTrail(browser)
    const search = page.getByPlaceholder('Entity, actor, or reason')
    await applyAuditFilter(
      page,
      async () => {
        await search.fill(marker)
        await search.press('Enter')
        await search.blur()
      },
      { search: marker },
    )
    const detailPanel = page.getByTestId('admin-audit-detail-panel')
    await detailPanel.getByText(events[2].label, { exact: true }).first().waitFor()
    for (const { eventId, label } of events) {
      const path = `/api/admin/audit-trail/${encodeURIComponent(eventId)}`
      const opened = page.waitForResponse((response) => new URL(response.url()).pathname === path)
      await page
        .getByRole('button', { name: new RegExp(label) })
        .first()
        .click()
      const response = await opened
      assert.equal(response.status(), 200, `${label} must open from the audit page`)
      await detailPanel.getByText(label, { exact: true }).first().waitFor()
      observations.push({ ui: path, status: response.status() })
    }
    assert.doesNotMatch(await page.locator('main').innerText(), /Audit event not found/)
    assert.deepEqual(problems, [])
    await context.close()
  } finally {
    await browser.close()
  }
  await recordAtomicObservation('sb2-encoded-detail', observations)
})

registrationGroup = 'sql-rollback'

for (const [name, action] of sqlWrites) {
  test(`${name} rolls back state, parent timestamp and audit on audit failure`, async () => {
    const { pathwayId, path, operation } = await prepareSqlWrite(name, 'rollback')
    const before = await pathwaySnapshot(path)
    const auditBefore = await auditFor(pathwayId)
    await rejectSqlAudit(action)
    try {
      const [route, method, body] = operation
      const response = await request(route, admin, method, body)
      const after = await pathwaySnapshot(path)
      const auditAfter = await auditFor(pathwayId)
      await recordAtomicObservation(name, {
        status: response.status,
        before,
        after,
        auditBefore,
        auditAfter,
      })
      assert.equal(response.status, 500)
      assert.deepEqual(after, before, 'a rejected mandatory audit must roll back all domain state')
      assert.deepEqual(auditAfter, auditBefore)
    } finally {
      await restoreSqlAudit()
    }
  })
}

const sourceWrites = [
  ['submit', 'EVIDENCE_SOURCE_CREATED'],
  ['edit', 'EVIDENCE_SOURCE_UPDATED'],
  ['approve', 'EVIDENCE_SOURCE_APPROVED'],
  ['reject', 'EVIDENCE_SOURCE_REJECTED'],
  ['pause', 'EVIDENCE_SOURCE_PAUSED'],
  ['resume', 'EVIDENCE_SOURCE_RESUMED'],
]

async function prepareSourceWrite(action, name) {
  let sourceId
  if (action !== 'submit') {
    sourceId = (await successful('/api/admin/rag/sources', 'POST', { ...websiteSubmission, name }))
      .sourceId
    if (action === 'resume')
      await successful(`/api/admin/rag/sources/${sourceId}/pause`, 'POST', {})
  }
  const path = `/api/admin/rag/sources/${sourceId}`
  const operation =
    action === 'submit'
      ? ['/api/admin/rag/sources', 'POST', { ...websiteSubmission, name }]
      : action === 'edit'
        ? [path, 'PATCH', { description: 'Updated atomic source' }]
        : [
            `${path}/${action}`,
            'POST',
            action === 'reject' ? { reason: 'Atomic rejection' } : { note: 'Atomic decision' },
          ]
  return { sourceId, operation }
}

async function sourceSnapshot(sourceId, name) {
  if (sourceId) return admin.client.query(anyApi.ragSources.getSource, { sourceId })
  const result = await admin.client.query(anyApi.ragSources.listSources, {
    includeAllForAdmin: true,
  })
  return result.items.filter((source) => source.name === name)
}

registrationGroup = 'source-rollback'

for (const [action, actionType] of sourceWrites) {
  test(`source-${action} rolls back its mutation and approval history on audit failure`, async () => {
    const name = `Rollback governance ${action}`
    const { sourceId, operation } = await prepareSourceWrite(action, name)
    const before = await sourceSnapshot(sourceId, name)
    const auditBefore = await auditFor(sourceId ?? name)
    await rejectSqlAudit(actionType)
    try {
      const [route, method, body] = operation
      const response = await request(route, admin, method, body)
      const after = await sourceSnapshot(sourceId, name)
      const auditAfter = await auditFor(sourceId ?? name)
      await recordAtomicObservation(`source-${action}`, {
        status: response.status,
        before,
        after,
        auditBefore,
        auditAfter,
      })
      assert.equal(response.status, 500)
      assert.deepEqual(
        after,
        before,
        'a rejected mandatory audit must roll back the source and approval history',
      )
      assert.deepEqual(auditAfter, auditBefore)
    } finally {
      await restoreSqlAudit()
    }
  })
}

async function newAuditEvents(entityId, previous) {
  const result = await auditFor(entityId)
  const known = new Set(previous.items.map((event) => event.eventId))
  return result.items.filter((event) => !known.has(event.eventId))
}

async function assertAuditDetail(event, actionType, before, after) {
  assert.equal(event.actionType, actionType)
  assert.equal(event.actorUserId, admin.userId)
  assert.equal(event.actorEmail, admin.email)
  assert.equal(event.actorRole, 'admin')
  const detail = await successful(`/api/admin/audit-trail/${event.eventId}`)
  assert.deepEqual(detail.event.changeContext, { before, after })
}

registrationGroup = 'audit-success'

for (const [name, action] of sqlWrites) {
  test(`${name} commits exactly one actor-bound audit with its domain change`, async () => {
    const { pathwayId, path, operation, rule } = await prepareSqlWrite(name, 'success')
    const before = await pathwaySnapshot(path)
    const auditBefore = await auditFor(pathwayId)
    const [route, method, body] = operation
    await successful(route, method, body, name === 'pathway-create' ? 201 : 200)
    const after = await pathwaySnapshot(path)
    const events = await newAuditEvents(pathwayId, auditBefore)
    assert.equal(events.length, 1)
    const ruleWrite = name.startsWith('rule')
    await assertAuditDetail(
      events[0],
      action,
      ruleWrite ? (rule ?? null) : (before?.pathway ?? null),
      ruleWrite ? (after.rules[0] ?? null) : after.pathway,
    )
    if (ruleWrite) assert.notEqual(after.pathway.updatedAt, before.pathway.updatedAt)
    await recordAtomicObservation(`${name}-success`, { before, after, events })
  })
}

for (const [action, actionType] of sourceWrites) {
  test(`source-${action} commits one canonical governance event visible in every audit view`, async () => {
    const name = `Success governance ${action}`
    const prepared = await prepareSourceWrite(action, name)
    const before = prepared.sourceId ? (await sourceSnapshot(prepared.sourceId, name)).source : null
    const auditBefore = await auditFor(prepared.sourceId ?? name)
    const [route, method, body] = prepared.operation
    const result = await successful(route, method, body)
    const sourceId = prepared.sourceId ?? result.sourceId
    const after = (await sourceSnapshot(sourceId, name)).source
    const events = await newAuditEvents(sourceId, auditBefore)
    assert.equal(events.length, 1)
    await assertAuditDetail(events[0], actionType, before, after)
    const filtered = await successful(
      `/api/admin/audit-trail?search=${sourceId}&actionType=${actionType}&actorId=${admin.userId}&pageSize=1`,
    )
    assert.equal(filtered.totalCount, 1)
    assert.equal(filtered.items[0].eventId, events[0].eventId)
    assert.equal(filtered.nextCursor, null)
    const canonical = await approvalHistory(sourceId)
    const row = canonical.find((item) => `rag-approval:${item._id}` === events[0].eventId)
    assert.ok(row, 'the displayed event must be the canonical approval row')
    assert.deepEqual(row.governance, { before, after })
    const sqlRows = await sqlFixture((db) =>
      db.query('SELECT event_id FROM governance_audit_log WHERE entity_id = $1', [sourceId]),
    )
    assert.equal(sqlRows.rows.length, 0, 'source writes must not create a second SQL audit')
    const all = await successful('/api/admin/audit-trail?pageSize=100')
    assert.equal((await successful('/api/admin/audit-trail/summary')).eventsToday, all.totalCount)
    await recordAtomicObservation(`source-${action}-success`, { before, after, events })
  })
}

registrationGroup = 'audit-consistency'

test('bulk failures and cross-parent rule identifiers leave both parents and all audits unchanged', async () => {
  const first = await prepareSqlWrite('rule-update', 'binding-first')
  const second = await prepareSqlWrite('rule-update', 'binding-second')
  const before = [await pathwaySnapshot(first.path), await pathwaySnapshot(second.path)]
  const audits = [await auditFor(first.pathwayId), await auditFor(second.pathwayId)]
  for (const [route, method, body, expected] of [
    [`${first.path}/rules/${second.rule.id}`, 'PATCH', atomicRule, 404],
    [`${first.path}/rules/${second.rule.id}`, 'DELETE', undefined, 404],
    [`${first.path}/rules`, 'POST', { ...atomicRule, id: second.rule.id }, 409],
    [`${first.path}/rules`, 'PUT', { rules: [{ ...atomicRule, id: second.rule.id }] }, 409],
    ['/api/admin/pathways/missing-atomic-parent/rules', 'POST', atomicRule, 404],
  ]) {
    assert.equal((await request(route, admin, method, body)).status, expected)
    assert.deepEqual(
      [await pathwaySnapshot(first.path), await pathwaySnapshot(second.path)],
      before,
    )
    assert.deepEqual([await auditFor(first.pathwayId), await auditFor(second.pathwayId)], audits)
  }
  await rejectSqlAudit('PATHWAY_RULE_UPDATED')
  try {
    const response = await request(`${first.path}/rules`, admin, 'PUT', {
      rules: [
        { ...atomicRule, unmetConditionId: 'atomic-new-before-failure' },
        { ...atomicRule, id: first.rule.id, comparisonValue: 9 },
      ],
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await pathwaySnapshot(first.path), before[0])
    assert.deepEqual(
      await auditFor(first.pathwayId),
      audits[0],
      'even an earlier successful audit insert must roll back',
    )
  } finally {
    await restoreSqlAudit()
  }
  await sqlFixture((db) =>
    db.exec('ALTER TABLE governance_audit_log RENAME TO atomic_audit_backup'),
  )
  let sourceId
  try {
    const response = await request('/api/admin/pathways', admin, 'POST', {
      pathwayId: 'atomic-missing-audit',
      displayName: 'Missing audit rollback',
      status: 'draft',
    })
    assert.equal(response.status, 503)
    assert.equal((await request('/api/admin/pathways/atomic-missing-audit', admin)).status, 404)
    assert.deepEqual(await pathwaySnapshot(first.path), before[0])
    sourceId = (
      await successful('/api/admin/rag/sources', 'POST', {
        ...websiteSubmission,
        name: 'Canonical source without SQL audit storage',
      })
    ).sourceId
    const canonical = await approvalHistory(sourceId)
    assert.equal(canonical.length, 1)
    assert.equal(canonical[0].governance.after._id, sourceId)
  } finally {
    await sqlFixture((db) =>
      db.exec('ALTER TABLE atomic_audit_backup RENAME TO governance_audit_log'),
    )
  }
  assert.equal((await auditFor(sourceId)).totalCount, 1)
  await fixture('approval_audit_log', [
    {
      sourceId,
      actorUserId: admin.userId,
      action: 'edit',
      timestamp: 1,
    },
  ])
  await sqlFixture((db) =>
    db.query(
      `INSERT INTO governance_audit_log
     (event_id, actor_id, action_type, entity_type, entity_id, entity_label, timestamp_ms)
     VALUES ('legacy-approval-sql', $1, 'EVIDENCE_SOURCE_UPDATED', 'EVIDENCE_SOURCE', $2, 'Retained legacy source event', 1)`,
      [admin.userId, sourceId],
    ),
  )
  const retained = await auditFor(sourceId)
  assert.equal(
    retained.totalCount,
    2,
    'legacy approval rows must not duplicate retained SQL history',
  )
  assert.equal(retained.items.filter((event) => event.eventId === 'legacy-approval-sql').length, 1)
})

async function assertSnapshotChain(events, initial, final) {
  const details = await Promise.all(
    events.map((event) => successful(`/api/admin/audit-trail/${event.eventId}`)),
  )
  const remaining = details.map((detail) => detail.event.changeContext)
  let current = initial
  while (remaining.length) {
    const next = remaining.findIndex((change) => isDeepStrictEqual(change.before, current))
    assert.notEqual(next, -1, 'concurrent writes must audit the serialized before-state')
    current = remaining.splice(next, 1)[0].after
  }
  assert.deepEqual(current, final)
}

test('concurrent pathway, rule and source writes serialize snapshots and duplicate creates record one event', async () => {
  const prepared = await prepareSqlWrite('pathway-update', 'concurrent')
  const before = await successful(prepared.path)
  const auditBefore = await auditFor(prepared.pathwayId)
  await Promise.all(
    ['First concurrent name', 'Second concurrent name'].map((displayName) =>
      successful(prepared.path, 'PATCH', { displayName }),
    ),
  )
  const events = await newAuditEvents(prepared.pathwayId, auditBefore)
  assert.equal(events.length, 2)
  await assertSnapshotChain(events, before, await successful(prepared.path))
  await Promise.all(
    ['first', 'second'].map((suffix) =>
      successful(`${prepared.path}/rules`, 'POST', {
        ...atomicRule,
        unmetConditionId: `concurrent-${suffix}`,
      }),
    ),
  )
  const rules = (await successful(`${prepared.path}/rules`)).items
  assert.deepEqual(
    rules.map((rule) => rule.displayOrder),
    [0, 1],
  )
  const duplicate = {
    pathwayId: 'atomic-duplicate',
    displayName: 'Concurrent duplicate',
    status: 'draft',
  }
  const responses = await Promise.all([
    request('/api/admin/pathways', admin, 'POST', duplicate),
    request('/api/admin/pathways', admin, 'POST', duplicate),
  ])
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409])
  assert.equal((await auditFor(duplicate.pathwayId)).totalCount, 1)
  const { sourceId } = await successful('/api/admin/rag/sources', 'POST', {
    ...websiteSubmission,
    name: 'Concurrent source snapshots',
  })
  const sourceBefore = (await sourceSnapshot(sourceId)).source
  const sourceAudits = await auditFor(sourceId)
  await Promise.all(
    ['First source update', 'Second source update'].map((description) =>
      successful(`/api/admin/rag/sources/${sourceId}`, 'PATCH', { description }),
    ),
  )
  const sourceEvents = await newAuditEvents(sourceId, sourceAudits)
  assert.equal(sourceEvents.length, 2)
  await assertSnapshotChain(sourceEvents, sourceBefore, (await sourceSnapshot(sourceId)).source)
})

registrationGroup = 'admission'

test('unavailable recommendation-review and ingestion routes reject before any write', async () => {
  const auditBefore = await successful('/api/admin/audit-trail?pageSize=100')
  const sourcesBefore = await admin.client.query(anyApi.ragSources.listSources, {
    includeAllForAdmin: true,
  })
  for (const path of [
    '/api/admin/recommendation-reviews/foreign-run/flag',
    '/api/admin/recommendation-reviews/foreign-run/dismiss',
    '/api/admin/recommendation-reviews/foreign-run/resolve',
    '/api/admin/recommendation-reviews/foreign-run/citations/foreign-citation/flag',
    '/api/admin/rag/ingestion/run',
  ]) {
    assert.equal(
      (await request(path, admin, 'POST', { force: true, reason: 'Unavailable operation' })).status,
      503,
    )
  }
  assert.deepEqual(await successful('/api/admin/audit-trail?pageSize=100'), auditBefore)
  assert.deepEqual(
    await admin.client.query(anyApi.ragSources.listSources, { includeAllForAdmin: true }),
    sourcesBefore,
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

function auditStateHash(value) {
  const json = JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : item,
  )
  return createHash('sha256').update(json).digest('hex')
}

registrationGroup = 'design'

test('#166 F1: capped submissions and digest-audited legacy records remain maintainable', async () => {
  const oversized = {
    ...websiteSubmission,
    name: '166 oversized input',
    description: 'z'.repeat(600000),
  }
  let rejected = false
  try {
    await admin.client.mutation(anyApi.ragSources.createSourceSubmission, oversized)
  } catch (error) {
    rejected = /description|size|limit/i.test(String(error))
  }
  const { sourceId } = await successful('/api/admin/rag/sources', 'POST', {
    ...websiteSubmission,
    name: '166 legacy template',
  })
  const template = (await sourceSnapshot(sourceId)).source
  await fixture('sources', [
    {
      ...Object.fromEntries(
        Object.entries(template).filter(([key]) => !['_id', '_creationTime'].includes(key)),
      ),
      name: '166 legacy oversized',
      description: oversized.description,
    },
  ])
  const legacy = (
    await admin.client.query(anyApi.ragSources.listSources, { includeAllForAdmin: true })
  ).items.find((row) => row.name === '166 legacy oversized')
  const response = await request(`/api/admin/rag/sources/${legacy._id}`, admin, 'PATCH', {
    name: '166 legacy edited',
  })
  const result = { rejected, status: response.status, body: await response.json() }
  await recordAtomicObservation('166-f1', result)
  assert.equal(response.status, 200, 'a legacy 600 KB description must not block an ordinary edit')
  assert.equal(
    rejected,
    true,
    'new 600 KB descriptions must be rejected at the direct Convex boundary',
  )
  const trail = await auditFor(legacy._id)
  const detail = await successful(`/api/admin/audit-trail/${trail.items[0].eventId}`)
  assert.match(detail.event.stateDigests.before, /^[a-f0-9]{64}$/)
  const final = (await sourceSnapshot(legacy._id)).source
  assert.equal(final.description.length, 600000)
  assert.deepEqual(detail.event.stateDigests, {
    before: auditStateHash(legacy),
    after: auditStateHash(final),
  })
  assert.deepEqual(detail.event.changeContext.after.description, {
    digest: auditStateHash(legacy.description),
    bytes: 600002,
    truncated: true,
  })
  assert.notEqual(detail.event.stateDigests.before, detail.event.stateDigests.after)
  assert.equal(detail.event.truncated, true)
  assert.ok(JSON.stringify(detail).length < 32768)
})

test('#166 F2: sequential and concurrent creates return one actor-bound receipt', async () => {
  for (const concurrent of [false, true]) {
    const body = { ...websiteSubmission, name: `166 replay ${concurrent}` }
    const headers = { 'Idempotency-Key': `166-replay-${concurrent}` }
    const send = () => request('/api/admin/rag/sources', admin, 'POST', body, headers)
    const responses = concurrent
      ? await Promise.all([send(), send()])
      : [await send(), await send()]
    const receipts = await Promise.all(responses.map((response) => response.json()))
    const matches = (
      await admin.client.query(anyApi.ragSources.listSources, { includeAllForAdmin: true })
    ).items.filter((row) => row.name === body.name)
    const events = await successful(
      `/api/admin/audit-trail?search=${encodeURIComponent(body.name)}`,
    )
    await recordAtomicObservation(`166-f2-${concurrent}`, {
      statuses: responses.map((response) => response.status),
      receipts,
      ids: matches.map((row) => row._id),
      events,
    })
    assert.deepEqual(
      responses.map((response) => response.status),
      [200, 200],
    )
    assert.equal(matches.length, 1, 'replay must create one source')
    assert.deepEqual(receipts[0], receipts[1], 'replay must return the original receipt')
    assert.equal(events.totalCount, 1, 'replay must append one governance event')
    assert.equal(
      (
        await request(
          '/api/admin/rag/sources',
          admin,
          'POST',
          { ...body, name: 'changed payload' },
          headers,
        )
      ).status,
      409,
    )
  }
})

async function deployAuditProbe(source) {
  await writeFile(join(directory, 'backend/convex/ragSourceAudit.ts'), source)
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
      'disable',
    ],
    { cwd: join(directory, 'backend'), env: cliEnv },
  )
}

test('#166 direct creates deduplicate concurrent requests and bind the receipt to the actor', async () => {
  const payload = {
    ...websiteSubmission,
    idempotencyKey: '166-direct-replay',
    name: '166 direct replay',
  }
  const receipts = await Promise.all(
    Array.from({ length: 6 }, () =>
      admin.client.mutation(anyApi.ragSources.createSourceSubmission, payload, { skipQueue: true }),
    ),
  )
  for (const receipt of receipts) assert.deepEqual(receipt, receipts[0])
  assert.deepEqual(
    await admin.client.mutation(anyApi.ragSources.createSourceSubmission, payload),
    receipts[0],
  )
  await assert.rejects(
    admin.client.mutation(anyApi.ragSources.createSourceSubmission, {
      ...payload,
      name: 'different',
    }),
    (error) => error.data?.code === 'IDEMPOTENCY_CONFLICT',
  )
  assert.equal((await approvalHistory(receipts[0].sourceId)).length, 1)
  assert.equal((await auditFor(receipts[0].sourceId)).totalCount, 1)
  const second = await register('second-reviewed-admin')
  await fixture('rag_admins', [
    {
      userId: second.userId,
      createdAt: Date.now(),
      subjectBinding: {
        issuer: origin,
        reviewedAt: Date.now(),
        operatorEvidence: 'isolated operator second subject review',
      },
    },
  ])
  const other = await second.client.mutation(anyApi.ragSources.createSourceSubmission, payload)
  assert.notEqual(other.sourceId, receipts[0].sourceId)
  const event = (await auditFor(other.sourceId)).items[0]
  assert.equal(event.actorUserId, second.userId)
  await recordAtomicObservation('166-direct-receipts', { receipts, other, event })
})

test('#166 SQL pathway and rule creates replay their original receipts without another event', async () => {
  const pathway = { pathwayId: '166-sql-replay', displayName: '166 SQL replay', status: 'draft' }
  for (const [path, payload, expected] of [
    ['/api/admin/pathways', pathway, 201],
    [
      `/api/admin/pathways/${pathway.pathwayId}/rules`,
      { ...atomicRule, unmetConditionId: '166-replay' },
      200,
    ],
  ]) {
    const headers = { 'Idempotency-Key': `166-sql-${expected}` }
    const send = () => request(path, admin, 'POST', payload, headers)
    const responses = await Promise.all([send(), send()])
    const receipts = await Promise.all(responses.map((response) => response.json()))
    assert.deepEqual(
      responses.map((response) => response.status),
      [expected, expected],
    )
    assert.deepEqual(receipts[0], receipts[1])
    const replay = await send()
    assert.equal(replay.status, expected)
    assert.deepEqual(await replay.json(), receipts[0])
    const changed = path.endsWith('rules')
      ? { ...payload, comparisonValue: 10 }
      : { ...payload, displayName: 'different' }
    assert.equal((await request(path, admin, 'POST', changed, headers)).status, 409)
    const entityId = receipts[0].item?.id ?? receipts[0].pathwayId
    assert.equal((await auditFor(entityId)).totalCount, 1)
    await recordAtomicObservation(`166-sql-receipt-${expected}`, { receipts, entityId })
  }
})

function maximumSourcePayload() {
  const body = {
    ...websiteSubmission,
    name: '166 payload maximum',
    description: '甲'.repeat(4000),
    trustScore: 72,
    tenantId: 'default',
    enabled: true,
    linkedPathwayIds: [],
    tags: Array.from({ length: 12 }, (_, index) => `${index}${'甲'.repeat(118)}`),
    websiteConfig: {
      ...websiteSubmission.websiteConfig,
      seedUrls: Array.from(
        { length: 130 },
        (_, index) => `https://www.canada.ca/${String(index).padStart(3, '0')}/${'p'.repeat(90)}`,
      ),
    },
  }
  delete body.idempotencyKey
  while (Buffer.byteLength(JSON.stringify(body)) < 32768) {
    const remaining = 32768 - Buffer.byteLength(JSON.stringify(body))
    const overhead = body.linkedPathwayIds.length ? 3 : 2
    if (remaining < overhead + 1) {
      body.name += 'x'.repeat(remaining)
      break
    }
    const length = Math.min(120, remaining - overhead)
    body.linkedPathwayIds.push(String(body.linkedPathwayIds.length).padStart(length, 'p'))
  }
  assert.ok(body.linkedPathwayIds.length <= 16)
  assert.ok(Buffer.byteLength(JSON.stringify(body.websiteConfig)) <= 16384)
  assert.equal(Buffer.byteLength(JSON.stringify(body)), 32768)
  return body
}

function sourcePayloadWithByteOffset(body, delta) {
  return { ...body, name: delta < 0 ? body.name.slice(0, -1) : `${body.name}${'x'.repeat(delta)}` }
}

async function assertCreateSizeBoundary(body, delta) {
  assert.equal(Buffer.byteLength(JSON.stringify(body)), 32768 + delta)
  const response = await request('/api/admin/rag/sources', admin, 'POST', body, {
    'Idempotency-Key': `166-http-size-${delta}-`.padEnd(128, 'k'),
  })
  assert.equal(response.status, delta > 0 ? 400 : 200)
  await response.arrayBuffer()
  const direct = admin.client.mutation(anyApi.ragSources.createSourceSubmission, {
    ...body,
    idempotencyKey: `166-direct-size-${delta}-`.padEnd(128, 'k'),
  })
  if (delta > 0) await assert.rejects(direct, /32768 byte limit/)
  else assert.ok((await direct).sourceId)
}

async function assertUpdateSizeBoundary(sourceId, body, delta) {
  assert.equal(Buffer.byteLength(JSON.stringify(body)), 32768 + delta)
  const snapshot = await sourceSnapshot(sourceId)
  const response = await request(`/api/admin/rag/sources/${sourceId}`, admin, 'PATCH', body)
  assert.equal(response.status, delta > 0 ? 400 : 200)
  await response.arrayBuffer()
  const direct = admin.client.mutation(anyApi.ragSources.updateSourceConfig, { sourceId, ...body })
  if (delta > 0) {
    await assert.rejects(direct, /32768 byte limit/)
    assert.deepEqual(await sourceSnapshot(sourceId), snapshot)
  } else assert.equal((await direct).ok, true)
}

test('#166 source caps cover create and update at HTTP and direct Convex seams', async () => {
  const { sourceId } = await successful('/api/admin/rag/sources', 'POST', {
    ...websiteSubmission,
    name: '166 size boundary',
  })
  const changes = [
    { name: 'n'.repeat(256) },
    { name: `${' '.repeat(256)}Source` },
    { description: `${' '.repeat(4000)}x` },
    { schedule: { frequency: 'interval', intervalHours: 169 } },
    { schedule: { frequency: 'interval', intervalHours: 0 } },
    { schedule: { frequency: 'interval', intervalHours: 1.5 } },
    { tags: ['t'.repeat(121)] },
    { linkedPathwayIds: ['p'.repeat(121)] },
    { description: 'd'.repeat(600000) },
    {
      websiteConfig: {
        ...websiteSubmission.websiteConfig,
        seedUrls: Array.from(
          { length: 300 },
          (_, i) => `https://www.canada.ca/${i}/${'p'.repeat(70)}`,
        ),
      },
    },
    { tags: Array.from({ length: 300 }, () => 't'.repeat(120)) },
    ...[700, 2000].map((count) => ({
      websiteConfig: {
        ...websiteSubmission.websiteConfig,
        seedUrls: Array(count).fill('https://www.canada.ca/en.html'),
      },
    })),
    {
      description: '甲'.repeat(4000),
      websiteConfig: maximumSourcePayload().websiteConfig,
      tags: Array(24).fill('甲'.repeat(120)),
      linkedPathwayIds: Array(16).fill('p'.repeat(120)),
    },
  ]
  const before = await sourceSnapshot(sourceId)
  for (const change of changes) {
    await assert.rejects(
      admin.client.mutation(anyApi.ragSources.createSourceSubmission, {
        ...websiteSubmission,
        ...change,
      }),
      /size|limit|characters|intervalHours/i,
    )
    await assert.rejects(
      admin.client.mutation(anyApi.ragSources.updateSourceConfig, { sourceId, ...change }),
      /size|limit|characters|intervalHours/i,
    )
    assert.equal(
      (await request('/api/admin/rag/sources', admin, 'POST', { ...websiteSubmission, ...change }))
        .status,
      400,
    )
    assert.equal(
      (await request(`/api/admin/rag/sources/${sourceId}`, admin, 'PATCH', change)).status,
      400,
    )
  }
  assert.deepEqual(await sourceSnapshot(sourceId), before)
  const valid = await admin.client.mutation(anyApi.ragSources.updateSourceConfig, {
    sourceId,
    name: 'n'.repeat(255),
    description: 'd'.repeat(4000),
    schedule: { frequency: 'interval', intervalHours: 168 },
    tags: ['t'.repeat(120)],
    linkedPathwayIds: ['p'.repeat(120)],
  })
  assert.equal(valid.ok, true)
  const events = await auditFor(sourceId)
  const detail = await successful(`/api/admin/audit-trail/${events.items[0].eventId}`)
  assert.equal(detail.event.truncated, true)
  assert.equal(detail.event.changeContext.after.description.truncated, true)

  const maximum = maximumSourcePayload()
  for (const delta of [-1, 0, 1]) {
    await assertCreateSizeBoundary(sourcePayloadWithByteOffset(maximum, delta), delta)
  }

  const patch = { ...maximum }
  delete patch.type
  patch.name += 'x'.repeat(32768 - Buffer.byteLength(JSON.stringify(patch)))
  for (const delta of [-1, 0, 1]) {
    await assertUpdateSizeBoundary(sourceId, sourcePayloadWithByteOffset(patch, delta), delta)
  }
  const invalidKey = 'k'.repeat(129)
  const invalid = await request('/api/admin/rag/sources', admin, 'POST', maximum, {
    'Idempotency-Key': invalidKey,
  })
  assert.equal(invalid.status, 400)
  await invalid.arrayBuffer()
  await assert.rejects(
    admin.client.mutation(anyApi.ragSources.createSourceSubmission, {
      ...maximum,
      idempotencyKey: invalidKey,
    }),
    /idempotency key/i,
  )
})

test('source schedule approval rejects invalid input and legacy bounds cannot break HTTP reads', async () => {
  const { sourceId } = await successful('/api/admin/rag/sources', 'POST', {
    ...websiteSubmission,
    name: 'Legacy bounds template',
  })
  for (const intervalHours of [0, 169, 1.5]) {
    await assert.rejects(
      admin.client.mutation(anyApi.ragSources.approveSource, {
        sourceId,
        schedule: { frequency: 'interval', intervalHours },
      }),
      /intervalHours/,
    )
  }
  const template = (await sourceSnapshot(sourceId)).source
  await fixture('sources', [
    {
      ...Object.fromEntries(
        Object.entries(template).filter(([key]) => !['_id', '_creationTime'].includes(key)),
      ),
      name: 'Legacy invalid bounds',
      schedule: { frequency: 'interval', intervalHours: 500 },
      tags: ['valid-tag', 't'.repeat(121)],
      linkedPathwayIds: ['valid-pathway', 'p'.repeat(121)],
    },
  ])
  const raw = (
    await admin.client.query(anyApi.ragSources.listSources, { includeAllForAdmin: true })
  ).items.find((row) => row.name === 'Legacy invalid bounds')
  const list = await successful('/api/admin/rag/sources')
  const projected = list.items.find((row) => row.id === raw._id)
  const detail = await successful(`/api/admin/rag/sources/${raw._id}`)
  assert.deepEqual(
    Object.fromEntries(Object.keys(detail.source).map((key) => [key, projected[key]])),
    detail.source,
  )
  assert.deepEqual(projected.schedule, { frequency: 'interval', intervalHours: 168 })
  assert.deepEqual(projected.tags, ['valid-tag'])
  assert.deepEqual(projected.linkedPathwayIds, ['valid-pathway'])
  assert.equal((await sourceSnapshot(raw._id)).source.schedule.intervalHours, 500)
  await successful(`/api/admin/rag/sources/${raw._id}`, 'PATCH', { name: 'Legacy bounds edited' })
  await admin.client.mutation(anyApi.ragSources.approveSource, {
    sourceId,
    schedule: { frequency: 'interval', intervalHours: 168 },
  })
  await recordAtomicObservation('sb1-source-bounds', { projected, detail })
})

test('#166 source audit failure is a designed error and SQL detail stays in its own store', async () => {
  const sql = await successful('/api/admin/audit-trail?entityType=PATHWAY&pageSize=1')
  const source = await successful('/api/admin/audit-trail?entityType=EVIDENCE_SOURCE&pageSize=1')
  const module = await readFile(join(directory, 'backend/convex/ragSourceAudit.ts'), 'utf8')
  const broken = module.replaceAll(
    'await requireRagAdmin(ctx)',
    "await requireRagAdmin(ctx)\n    throw new Error('166 injected audit read failure')",
  )
  try {
    await deployAuditProbe(broken)
    assert.equal((await request('/api/admin/access', admin)).status, 200)
    const responses = []
    for (const path of [
      '/api/admin/audit-trail?pageSize=1',
      '/api/admin/audit-trail/summary',
      `/api/admin/audit-trail/${source.items[0].eventId}`,
    ]) {
      const response = await request(path, admin)
      responses.push({ path, status: response.status, body: await response.json() })
    }
    assert.deepEqual(
      responses.map((response) => response.status),
      [503, 503, 503],
    )
    assert.ok(
      responses.every((response) =>
        /Source audit storage is unavailable/.test(response.body.statusMessage),
      ),
    )
    assert.equal(
      (await request(`/api/admin/audit-trail/${sql.items[0].eventId}`, admin)).status,
      200,
    )
    await recordAtomicObservation('166-audit-unavailable', {
      responses,
      sqlEventId: sql.items[0].eventId,
    })
  } finally {
    await deployAuditProbe(module)
  }
})

test('#166 equal timestamps, filters and opaque cursors agree across both stores', async () => {
  const { sourceId } = await successful('/api/admin/rag/sources', 'POST', {
    ...websiteSubmission,
    name: '166 tie template',
  })
  const timestamp = Date.now() - 86400000
  await fixture(
    'approval_audit_log',
    [0, 1].map((index) => ({
      sourceId,
      actorUserId: admin.userId,
      action: 'edit',
      timestamp,
      governance: { before: null, after: { name: `166 tied event ${index}` } },
    })),
  )
  await sqlFixture((db) =>
    db.query(
      `INSERT INTO governance_audit_log (event_id, actor_id, action_type, entity_type, entity_id, entity_label, timestamp_ms) VALUES ('audit-166-z', $1, 'PATHWAY_UPDATED', 'PATHWAY', '166-tie', '166 tied event Z', $2), ('audit-166-a', $1, 'PATHWAY_UPDATED', 'PATHWAY', '166-tie', '166 tied event A', $2)`,
      [admin.userId, timestamp],
    ),
  )
  const query = new URLSearchParams({
    search: '166 tied event',
    actorId: admin.userId,
    dateFrom: new Date(timestamp).toISOString(),
    dateTo: new Date(timestamp).toISOString(),
    pageSize: '1',
  })
  const events = []
  let cursor
  do {
    const page = await successful(
      `/api/admin/audit-trail?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    )
    assert.equal(page.totalCount, 4)
    events.push(...page.items)
    if (!cursor && page.nextCursor) {
      assert.equal(
        (await request(`/api/admin/audit-trail?search=changed&cursor=${page.nextCursor}`, admin))
          .status,
        400,
      )
    }
    cursor = page.nextCursor
  } while (cursor)
  const ids = events.map((event) => event.eventId)
  assert.deepEqual(ids, [...ids].sort().reverse())
  assert.equal(new Set(ids).size, 4)
  assert.equal((await request('/api/admin/audit-trail?cursor=invalid', admin)).status, 400)
  assert.equal((await successful('/api/admin/audit-trail?search=%25')).totalCount, 0)
  await recordAtomicObservation('166-keyset-ties', { events })
})

test('#166 counter failures roll back changes, events and create receipts in both stores', async () => {
  const pathway = {
    pathwayId: '166-counter-rollback',
    displayName: '166 counter rollback',
    status: 'draft',
  }
  const headers = { 'Idempotency-Key': '166-counter-rollback' }
  await sqlFixture((db) =>
    db.exec(
      "ALTER TABLE governance_audit_counts ADD CONSTRAINT counter_fault CHECK (kind <> 'actor') NOT VALID",
    ),
  )
  try {
    assert.equal(
      (await request('/api/admin/pathways', admin, 'POST', pathway, headers)).status,
      500,
    )
    assert.equal((await request(`/api/admin/pathways/${pathway.pathwayId}`, admin)).status, 404)
    assert.equal((await auditFor(pathway.pathwayId)).totalCount, 0)
  } finally {
    await sqlFixture((db) =>
      db.exec('ALTER TABLE governance_audit_counts DROP CONSTRAINT counter_fault'),
    )
  }
  assert.equal((await request('/api/admin/pathways', admin, 'POST', pathway, headers)).status, 201)
  assert.equal((await auditFor(pathway.pathwayId)).totalCount, 1)

  const helper = join(directory, 'backend/convex/lib/sourceAudit.ts')
  const original = await readFile(helper, 'utf8')
  const module = await readFile(join(directory, 'backend/convex/ragSourceAudit.ts'), 'utf8')
  const marker = "for (const key of eventCountKeys(event)) await increment(ctx, key, 'filter')"
  assert.ok(original.includes(marker))
  const payload = { ...websiteSubmission, name: '166 source counter rollback' }
  const sourceHeaders = { 'Idempotency-Key': '166-source-counter-rollback' }
  const before = await successful('/api/admin/audit-trail/summary')
  try {
    await writeFile(
      helper,
      original.replace(
        marker,
        `${marker}\n  if (event.after?.name === '166 source counter rollback') throw new Error('166 injected counter failure')`,
      ),
    )
    await deployAuditProbe(module)
    assert.equal(
      (await request('/api/admin/rag/sources', admin, 'POST', payload, sourceHeaders)).status,
      500,
    )
    assert.equal(
      (await successful('/api/admin/audit-trail?search=166%20source%20counter%20rollback'))
        .totalCount,
      0,
    )
    assert.equal(
      (
        await admin.client.query(anyApi.ragSources.listSources, { includeAllForAdmin: true })
      ).items.filter((row) => row.name === payload.name).length,
      0,
    )
    assert.deepEqual(await successful('/api/admin/audit-trail/summary'), before)
  } finally {
    await writeFile(helper, original)
    await deployAuditProbe(module)
  }
  const response = await request('/api/admin/rag/sources', admin, 'POST', payload, sourceHeaders)
  assert.equal(response.status, 200)
  const { sourceId } = await response.json()
  assert.equal((await auditFor(sourceId)).totalCount, 1)
})

test(
  '#166 F3: 1000 source events keep list, summary and detail reads bounded',
  async () => {
    const retained = []
    let cursor = null
    do {
      const page = await admin.client.query(anyApi.ragSourceAudit.listApprovalEvents, {
        paginationOpts: { cursor, numItems: 100 },
      })
      retained.push(...page.page)
      cursor = page.isDone ? null : page.continueCursor
    } while (cursor)
    const sourceId = retained[0].sourceId
    await fixture(
      'approval_audit_log',
      Array.from({ length: 1000 }, (_, i) => ({
        sourceId,
        actorUserId: admin.userId,
        action: 'edit',
        timestamp: Date.now() - 10000 - i,
        governance: { before: null, after: { name: `166 synthetic ${i}` } },
      })),
    )
    const module = await readFile(join(directory, 'backend/convex/ragSourceAudit.ts'), 'utf8')
    const probe = `
function boundedProbe(target, budget) {
  return new Proxy(target, { get(value, key) {
    const member = Reflect.get(value, key)
    if (typeof member !== 'function') return member
    return (...args) => {
      if (key === 'paginate' && (!(args[0]?.maximumRowsRead <= 512) || !(args[0]?.maximumBytesRead <= 2097152))) throw new Error('166 pagination must impose backend row and byte budgets')
    if (key === 'take' && args[0] > 2001) throw new Error('166 indexed take exceeds the read budget')
    const result = member.apply(value, args)
      if (['get', 'take', 'collect', 'paginate', 'first', 'unique'].includes(String(key))) {
        return Promise.resolve(result).then(rows => {
          budget.rows += Array.isArray(rows) ? rows.length : Array.isArray(rows?.page) ? rows.page.length : rows ? 1 : 0
          if (budget.rows > budget.max) throw new Error('166 audit read row budget exceeded: ' + budget.rows)
          return rows
        })
      }
      return result && typeof result === 'object' ? boundedProbe(result, budget) : result
    }
  } })
}
`
    const instrumented =
      module.replaceAll(
        'await requireRagAdmin(ctx)',
        "await requireRagAdmin(ctx)\n    ctx = { ...ctx, db: boundedProbe(ctx.db, { rows: 0, max: typeof args !== 'undefined' && ('limit' in args || 'paginationOpts' in args) ? 8 : 128 }) }",
      ) + probe
    try {
      await deployAuditProbe(instrumented)
      const known = await successful('/api/admin/audit-trail?entityType=PATHWAY&pageSize=1')
      const knownSource = await successful(
        '/api/admin/audit-trail?entityType=EVIDENCE_SOURCE&pageSize=1',
      )
      const paths = [
        '/api/admin/audit-trail?pageSize=1',
        '/api/admin/audit-trail?entityType=PATHWAY&pageSize=1',
        '/api/admin/audit-trail/summary',
        `/api/admin/audit-trail/${known.items[0].eventId}`,
        `/api/admin/audit-trail/${knownSource.items[0].eventId}`,
      ]
      const results = []
      for (const path of paths) {
        const response = await request(path, admin)
        results.push({ path, status: response.status, body: await response.json() })
      }
      await recordAtomicObservation('166-f3', {
        syntheticEvents: 1000,
        results,
        rowBudgets: { list: 8, summary: 128, detail: 128 },
      })
      assert.deepEqual(
        results.map((row) => row.status),
        [200, 200, 200, 200, 200],
        'real database result instrumentation must enforce bounded reads',
      )
    } finally {
      await deployAuditProbe(module)
      await fixture('approval_audit_log', retained, true)
    }
  },
  { timeout: 60000 },
)

test('#166 F4: concurrent inserts never repeat or skip the original traversal', async () => {
  const before = await successful('/api/admin/audit-trail?pageSize=100')
  const originalIds = before.items.map((event) => event.eventId)
  let originalCursor = before.nextCursor
  while (originalCursor) {
    const page = await successful(
      `/api/admin/audit-trail?pageSize=100&cursor=${encodeURIComponent(originalCursor)}`,
    )
    originalIds.push(...page.items.map((event) => event.eventId))
    originalCursor = page.nextCursor
  }
  const first = await successful('/api/admin/audit-trail?pageSize=2')
  const received = [...first.items]
  let cursor = first.nextCursor
  let pages = 0
  do {
    await Promise.all([
      successful('/api/admin/rag/sources', 'POST', {
        ...websiteSubmission,
        name: `166 intervening ${pages}`,
      }),
      successful(
        '/api/admin/pathways',
        'POST',
        {
          pathwayId: `166-intervening-${pages}`,
          displayName: `166 intervening ${pages}`,
          status: 'draft',
        },
        201,
      ),
    ])
    const page = await successful(
      `/api/admin/audit-trail?pageSize=100&cursor=${encodeURIComponent(cursor)}`,
    )
    received.push(...page.items)
    cursor = page.nextCursor
    assert.ok(++pages < 30)
  } while (cursor)
  const ids = received.map((row) => row.eventId)
  await recordAtomicObservation('166-f4', {
    first,
    received: ids,
    originalCount: before.totalCount,
  })
  assert.equal(new Set(ids).size, ids.length, 'a keyset traversal must never repeat an event')
  assert.equal(
    ids.length,
    before.totalCount,
    'inserts above the traversal watermark must not replace or skip original events',
  )
  assert.deepEqual(new Set(ids), new Set(originalIds))
})

registrationGroup = 'admission'

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

registrationGroup = 'network'
const adminDeadlineMs = 10_000
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function stalledUpstream({ functions = [], authPath }, verify) {
  const holds = []
  const proxy = createServer(async (req, res) => {
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks)
      const path = body.length ? JSON.parse(body.toString()).path : undefined
      if (functions.includes(path) || (authPath && req.url === authPath)) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.write('{"status":')
        const hold = { path: path ?? req.url, closed: false, ticks: 0 }
        holds.push(hold)
        const timer = setInterval(() => {
          hold.ticks++
          res.write(' ')
        }, 50)
        res.once('close', () => {
          clearInterval(timer)
          hold.closed = true
        })
        return
      }
      const upstream = await fetch(
        (req.url.startsWith('/api/auth/') ? origin : backend) + req.url,
        {
          method: req.method,
          headers: {
            'content-type': 'application/json',
            ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
            ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
          },
          ...(body.length ? { body } : {}),
          redirect: 'manual',
        },
      )
      res.writeHead(upstream.status, { 'content-type': 'application/json' })
      res.end(Buffer.from(await upstream.arrayBuffer()))
    } catch (error) {
      res.writeHead(502)
      res.end(String(error))
    }
  })
  await new Promise((resolve) => proxy.listen(0, '127.0.0.1', resolve))
  const originalUrl = runtimeEnv.CONVEX_URL
  const originalSite = runtimeEnv.NUXT_PUBLIC_SITE_URL
  try {
    await stopRuntime()
    runtimeEnv.CONVEX_URL = `http://127.0.0.1:${proxy.address().port}`
    if (authPath) runtimeEnv.NUXT_PUBLIC_SITE_URL = runtimeEnv.CONVEX_URL
    await startRuntime()
    await verify(holds)
  } finally {
    proxy.closeAllConnections()
    await new Promise((resolve) => proxy.close(resolve))
    await stopRuntime()
    runtimeEnv.CONVEX_URL = originalUrl
    runtimeEnv.NUXT_PUBLIC_SITE_URL = originalSite
    await startRuntime()
  }
}

async function deadlineResponse(path, method = 'GET', body) {
  const start = Date.now()
  const response = await fetch(origin + path, {
    method,
    headers: {
      cookie: admin.cookie,
      origin,
      'content-type': 'application/json',
      'Idempotency-Key': randomBytes(16).toString('hex'),
    },
    ...(body
      ? {
          body: JSON.stringify(
            Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'idempotencyKey')),
          ),
        }
      : {}),
    signal: globalThis.AbortSignal.timeout(adminDeadlineMs + 5000),
  })
  const responseBody = await response.text()
  const elapsedMs = Date.now() - start
  assert.equal(response.status, 503, `${method} ${path}: ${responseBody}`)
  assert(
    elapsedMs >= adminDeadlineMs - 500 && elapsedMs < adminDeadlineMs + 3000,
    `${path}: ${elapsedMs}ms`,
  )
  return { path, method, elapsedMs, status: response.status }
}

async function assertUpstreamsClosed(holds, count) {
  const deadline = Date.now() + 1000
  while (holds.some((hold) => !hold.closed) && Date.now() < deadline) await wait(20)
  assert.equal(holds.length, count)
  assert(
    holds.every((hold) => hold.closed),
    'all stalled upstream reads must be cancelled',
  )
}

test('admin audit, source query and mutation streams return 503 within one deadline', async () => {
  await stalledUpstream(
    {
      functions: [
        'ragSourceAudit:listEvents',
        'ragSourceAudit:getSummary',
        'ragSourceAudit:getEvent',
        'ragSources:listSources',
        'ragSources:createSourceSubmission',
      ],
    },
    async (holds) => {
      const timings = []
      for (let i = 0; i < 10; i++) {
        const start = Date.now()
        assert.equal(
          (await request('/api/admin/access', admin)).status,
          200,
          'real authority positive control',
        )
        timings.push(Date.now() - start)
      }
      const responses = await Promise.all([
        deadlineResponse('/api/admin/audit-trail?pageSize=1'),
        deadlineResponse('/api/admin/audit-trail/summary'),
        deadlineResponse('/api/admin/audit-trail/rag-approval:synthetic'),
        deadlineResponse('/api/admin/rag/sources'),
        deadlineResponse('/api/admin/rag/sources', 'POST', websiteSubmission),
      ])
      await assertUpstreamsClosed(holds, 5)
      assert(
        holds.every((hold) => hold.ticks >= 100),
        'periodic bytes must not renew the application deadline',
      )
      await recordAtomicObservation('network-deadlines', {
        authorityTimingsMs: timings,
        responses,
        holds,
      })
    },
  )
})

test('stalled real authority reads return the designed 503 within the deadline', async () => {
  await stalledUpstream({ functions: ['ragSources:getAdminStatus'] }, async (holds) => {
    const response = await deadlineResponse('/api/admin/access')
    await assertUpstreamsClosed(holds, 1)
    await recordAtomicObservation('network-authority-deadline', { response, holds })
  })
})

test('session and token HTTP reads share the finite admin deadline', async () => {
  const observations = []
  for (const authPath of ['/api/auth/get-session', '/api/auth/convex/token']) {
    await stalledUpstream({ authPath }, async (holds) => {
      const response = await deadlineResponse('/api/admin/access')
      await assertUpstreamsClosed(holds, 1)
      observations.push({ authPath, response, holds })
    })
  }
  await recordAtomicObservation('network-auth-deadlines', observations)
})

test('disconnect cancels actual audit, authority, session and token upstream reads', async () => {
  const observations = []
  for (const config of [
    { functions: ['ragSourceAudit:listEvents'], path: '/api/admin/audit-trail?pageSize=1' },
    { functions: ['ragSources:getAdminStatus'], path: '/api/admin/access' },
    { authPath: '/api/auth/get-session', path: '/api/admin/access' },
    { authPath: '/api/auth/convex/token', path: '/api/admin/access' },
  ]) {
    await stalledUpstream(config, async (holds) => {
      const controller = new globalThis.AbortController()
      let settled = false
      const pending = fetch(origin + config.path, {
        headers: { cookie: admin.cookie, origin },
        signal: controller.signal,
      }).then(
        (response) => {
          settled = true
          return { response }
        },
        (error) => {
          settled = true
          return { error }
        },
      )
      try {
        const deadline = Date.now() + 2000
        while (holds.length === 0 && !settled && Date.now() < deadline) await wait(10)
        assert.equal(settled, false, 'stalled response must not complete before disconnect')
        assert.equal(holds.length, 1)
        controller.abort()
        const outcome = await pending
        assert.equal(outcome.error?.name, 'AbortError')
        await assertUpstreamsClosed(holds, 1)
        observations.push({ ...config, holds })
      } finally {
        controller.abort()
        await pending
      }
    })
  }
  await recordAtomicObservation('network-client-aborts', observations)
})

registrationGroup = 'audit-search'

for (const count of [513, 2101]) {
  test(`bounded search resumes through ${count} source events and interleaved SQL matches`, async () => {
    const marker = `sb1-search-${count}`
    const base = Date.now() - 60000
    const targets = new Set([0, Math.floor(count / 2), count - 512, count - 1])
    const rows = Array.from({ length: count }, (_, index) => {
      const eventId = `rag-approval:${marker}-${String(index).padStart(4, '0')}`
      const timestamp = base + index
      return {
        eventId,
        timestamp,
        orderKey: `${String(timestamp).padStart(16, '0')}:${eventId}`,
        actorId: admin.userId,
        actorEmail: admin.email,
        entityType: 'EVIDENCE_SOURCE',
        actionType: 'EVIDENCE_SOURCE_UPDATED',
        entityId: marker,
        entityLabel: `${marker} ${targets.has(index) ? 'target' : 'filler'} ${index}`,
        changeSummary: 'Synthetic search boundary fixture',
      }
    })
    rows[2].actorId = ordinary.userId
    rows[2].entityLabel = `${marker} target foreign actor`
    rows[3].timestamp = base - 1
    rows[3].orderKey = `${String(base - 1).padStart(16, '0')}:${rows[3].eventId}`
    rows[3].entityLabel = `${marker} target outside date range`
    await fixture('rag_audit_events', rows)
    const sqlRows = [100, count - 2].map((index) => ({
      eventId: `audit-${marker}-${index}`,
      timestamp: base + index,
      entityLabel: `${marker} target SQL ${index}`,
    }))
    await sqlFixture(async (db) => {
      for (const row of sqlRows)
        await db.query(
          `INSERT INTO governance_audit_log (event_id, actor_id, action_type, entity_type, entity_id, entity_label, timestamp_ms) VALUES ($1, $2, 'PATHWAY_UPDATED', 'PATHWAY', $3, $4, $5)`,
          [row.eventId, admin.userId, marker, row.entityLabel, row.timestamp],
        )
    })
    const observations = []
    async function traverse(filters) {
      const events = []
      const cursors = new Set()
      let cursor
      let first
      do {
        const query = new URLSearchParams({
          pageSize: '1',
          ...filters,
          ...(cursor ? { cursor } : {}),
        })
        const page = await successful(`/api/admin/audit-trail?${query}`)
        first ??= page
        assert.equal(page.totalCount, first.totalCount)
        assert.equal(page.totalCountCapped, first.totalCountCapped)
        events.push(...page.items)
        cursor = page.nextCursor
        if (cursor) {
          assert.ok(!cursors.has(cursor), 'each scan must advance even without a match')
          cursors.add(cursor)
        }
        assert.ok(cursors.size < 30)
      } while (cursor)
      const ids = events.map((row) => row.eventId)
      assert.equal(new Set(ids).size, ids.length)
      const sorted = [...events].sort(
        (a, b) =>
          Date.parse(b.timestamp) - Date.parse(a.timestamp) || (a.eventId < b.eventId ? 1 : -1),
      )
      assert.deepEqual(events, sorted)
      observations.push({ filters, pages: cursors.size + 1, first, ids })
      return ids
    }
    for (const index of [count - 1, 0, Math.floor(count / 2)]) {
      assert.deepEqual(await traverse({ search: rows[index].entityLabel }), [rows[index].eventId])
    }
    const expected = [...rows.filter((row) => targets.has(row.timestamp - base)), ...sqlRows]
      .sort((a, b) => b.timestamp - a.timestamp || (a.eventId < b.eventId ? 1 : -1))
      .map((row) => row.eventId)
    assert.deepEqual(
      await traverse({
        search: `${marker} target`,
        actorId: admin.userId,
        dateFrom: new Date(base).toISOString(),
        dateTo: new Date(base + count - 1).toISOString(),
      }),
      expected,
    )
    assert.deepEqual(await traverse({ search: `${marker} absent`, actorId: admin.userId }), [])
    const broad = await successful(
      `/api/admin/audit-trail?${new URLSearchParams({
        search: marker,
        entityType: 'EVIDENCE_SOURCE',
        entityId: marker,
        actorId: admin.userId,
        dateFrom: new Date(base).toISOString(),
        dateTo: new Date(base + count - 1).toISOString(),
      })}`,
    )
    assert.equal(broad.totalCount, Math.min(count - 2, 2000))
    assert.equal(broad.totalCountCapped, count > 2000)
    await recordAtomicObservation(`sb1-search-${count}`, { observations, broad })
  })
}

for (const count of [600, 2100]) {
  test(`every indexed audit filter finds its match behind ${count} newer non-matching source events`, async () => {
    const marker = `sb3-filter-${count}-${randomBytes(4).toString('hex')}`
    const base = Date.now()
    let clock = 0
    const rows = []
    const event = (actorId, entityId, actionType, label) => {
      const timestamp = base + clock++
      const eventId = `rag-approval:${marker}-${String(rows.length).padStart(4, '0')}`
      const row = {
        eventId,
        timestamp,
        orderKey: `${String(timestamp).padStart(16, '0')}:${eventId}`,
        actorId,
        entityType: 'EVIDENCE_SOURCE',
        actionType,
        entityId,
        entityLabel: `${marker} ${label}`,
        changeSummary: 'Synthetic indexed filter fixture',
      }
      rows.push(row)
      return row
    }
    const [actorA, actorB, actorC, entityA, entityB, entityC] = [
      'actor-a',
      'actor-b',
      'actor-c',
      'entity-a',
      'entity-b',
      'entity-c',
    ].map((name) => `${marker}-${name}`)
    const rejected = 'EVIDENCE_SOURCE_REJECTED'
    const updated = 'EVIDENCE_SOURCE_UPDATED'
    const lone = event(actorC, entityC, rejected, 'lone entity')
    const pair = event(actorB, entityB, rejected, 'actor entity pair')
    for (let index = 0; index < count; index++)
      event(`${marker}-other-${index % 7}`, entityB, updated, `other actor ${index}`)
    const target = event(actorA, entityA, rejected, 'rejected target')
    let pathway
    for (let index = 0; index < count; index++) {
      if (index === count / 2)
        pathway = {
          eventId: `audit-${marker}-pathway`,
          entityLabel: `${marker} pathway`,
          timestamp: base + clock++,
        }
      event(actorA, entityA, updated, `same actor and entity ${index}`)
    }
    await fixture('rag_audit_events', rows)
    await fixture(
      'rag_audit_details',
      rows.map(({ eventId, entityLabel }) => ({
        eventId,
        changeContext: { before: null, after: { name: entityLabel } },
        stateDigests: { before: 'none', after: 'none' },
        truncated: false,
      })),
    )
    await sqlFixture((db) =>
      db.query(
        `INSERT INTO governance_audit_log (event_id, actor_id, action_type, entity_type, entity_id, entity_label, timestamp_ms) VALUES ($1, $2, 'PATHWAY_CREATED', 'PATHWAY', $3, $4, $5)`,
        [pathway.eventId, actorA, `${marker}-pathway`, pathway.entityLabel, pathway.timestamp],
      ),
    )
    const ids = (events) => events.map((row) => row.eventId)
    const cases = [
      [{ actorId: actorB }, [pair]],
      [{ entityId: entityC }, [lone]],
      [{ actorId: actorA, actionType: rejected }, [target]],
      [{ entityId: entityA, actionType: rejected }, [target]],
      [{ entityId: entityB, actorId: actorB }, [pair]],
      [{ entityId: entityA, actorId: actorA, actionType: rejected }, [target]],
      [{ entityType: 'EVIDENCE_SOURCE', actorId: actorA, actionType: rejected }, [target]],
      [{ search: 'rejected target', actorId: actorA, actionType: rejected }, [target]],
      [{ actorId: actorA, actionType: 'PATHWAY_CREATED' }, [pathway]],
      [
        {
          actorId: actorA,
          actionType: rejected,
          dateFrom: new Date(base).toISOString(),
          dateTo: new Date(base + clock).toISOString(),
        },
        [target],
      ],
    ]
    const observations = []
    const newest = await successful(
      `/api/admin/audit-trail?${new URLSearchParams({ actionType: rejected, pageSize: '25' })}`,
    )
    observations.push({ filters: { actionType: rejected }, ids: ids(newest.items).slice(0, 3) })
    assert.deepEqual(ids(newest.items).slice(0, 3), ids([target, pair, lone]))
    for (const [filters, expected] of cases) {
      const page = await successful(
        `/api/admin/audit-trail?${new URLSearchParams({ ...filters, pageSize: '25' })}`,
      )
      observations.push({ filters, ids: ids(page.items), totalCount: page.totalCount })
      assert.deepEqual(
        ids(page.items),
        ids(expected),
        `${JSON.stringify(filters)} must return its match on the first page`,
      )
      assert.equal(page.nextCursor, null)
      if (filters.dateFrom) {
        assert.equal(page.totalCount, 1)
        assert.equal(page.totalCountCapped, false)
      }
    }
    async function traverse(filters) {
      const events = []
      const cursors = new Set()
      let cursor
      do {
        const page = await successful(
          `/api/admin/audit-trail?${new URLSearchParams({
            ...filters,
            pageSize: '100',
            ...(cursor ? { cursor } : {}),
          })}`,
        )
        assert.ok(page.items.length > 0 || !page.nextCursor, 'indexed pages must not be empty')
        events.push(...page.items)
        cursor = page.nextCursor
        if (cursor) {
          assert.ok(!cursors.has(cursor))
          cursors.add(cursor)
        }
      } while (cursor)
      observations.push({ traversal: filters, pages: cursors.size + 1, items: events.length })
      return ids(events)
    }
    const order = (events) =>
      ids([...events].sort((a, b) => b.timestamp - a.timestamp || (a.eventId < b.eventId ? 1 : -1)))
    assert.deepEqual(
      await traverse({ actorId: actorA }),
      order([...rows.filter((row) => row.actorId === actorA), pathway]),
    )
    assert.deepEqual(
      await traverse({ entityId: entityB }),
      order(rows.filter((row) => row.entityId === entityB)),
    )
    const browser = await chromium.launch({
      executablePath: process.env.CONTAINMENT_BROWSER_EXECUTABLE,
    })
    try {
      for (const [actorId, actionType, expected] of [
        [null, rejected, target],
        [actorB, null, pair],
        [actorA, rejected, target],
        [actorA, 'PATHWAY_CREATED', pathway],
      ]) {
        const { context, page, problems } = await openAuditTrail(browser)
        if (actionType)
          await applyAuditFilter(
            page,
            () =>
              page
                .getByTestId('admin-audit-filter-ribbon')
                .locator('select')
                .selectOption(actionType),
            { actionType },
          )
        if (actorId) {
          const actor = page.getByPlaceholder('Actor user id')
          await applyAuditFilter(
            page,
            async () => {
              await actor.fill(actorId)
              await actor.press('Enter')
              await actor.blur()
            },
            { actorId, ...(actionType ? { actionType } : {}) },
          )
        }
        const row = page.getByRole('button', { name: new RegExp(expected.entityLabel) })
        await row.first().waitFor({ timeout: 10_000 })
        assert.equal(await row.count(), 1)
        assert.equal(
          await page.getByText('No audit events matched the current filters.').count(),
          0,
          `${actorId} ${actionType} must be visible on the first page`,
        )
        observations.push({ ui: { actorId, actionType }, visible: expected.eventId })
        assert.deepEqual(problems, [])
        await context.close()
      }
    } finally {
      await browser.close()
    }
    await recordAtomicObservation(`sb3-filters-${count}`, observations)
  })
}
