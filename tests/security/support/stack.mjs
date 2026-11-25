import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { ConvexHttpClient } from 'convex/browser'
import { backendBinary, backendVersion } from './backend.mjs'
import { command, freePort, ready, start, stop } from './processes.mjs'

const root = resolve('.')
const cli = join(root, 'node_modules/convex/bin/main.js')

async function initializeSql(directory) {
  await mkdir(directory, { recursive: true })
  const database = new PGlite(directory)
  const migrations = join(root, 'server/db/migrations/postgresql')
  for (const file of (await readdir(migrations)).filter((file) => file.endsWith('.sql')).sort()) {
    await database.exec(await readFile(join(migrations, file), 'utf8'))
  }
  await database.close()
}

async function register(origin, role) {
  const response = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({
      name: `Synthetic ${role}`,
      email: `${role}@example.test`,
      password: randomBytes(24).toString('hex'),
    }),
  })
  assert.equal(response.status, 200, `real signup ${role}: ${await response.clone().text()}`)
  const { user } = await response.json()
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  assert.ok(cookie.includes('session_token='), 'real session cookie')
  const session = await fetch(`${origin}/api/auth/get-session`, { headers: { cookie } })
  assert.equal((await session.json()).user.id, user.id, 'live session positive control')
  const tokenResponse = await fetch(`${origin}/api/auth/convex/token`, { headers: { cookie } })
  assert.equal(tokenResponse.status, 200, 'real JWT transport')
  const { token } = await tokenResponse.json()
  assert.ok(token, 'real JWT supplied by application auth')
  return { role, id: user.id, cookie, token }
}

export async function createStack() {
  const directory = await mkdtemp(join(tmpdir(), 'cadet2-legacy-access-'))
  const cleanup = []
  let appProcess
  try {
    const port = await freePort()
    const backendPort = await freePort()
    const sitePort = await freePort()
    const origin = `http://127.0.0.1:${port}`
    const backendOrigin = `http://127.0.0.1:${backendPort}`
    const binary = await backendBinary()
    const instanceSecret = randomBytes(32).toString('hex')
    const keyArgs = ['--instance-name', 'legacy-access', '--instance-secret', instanceSecret]
    const { stdout } = await command(binary, ['keygen', 'admin-key', ...keyArgs])
    const adminKey = stdout.trim()
    const env = {
      ...process.env,
      CONVEX_DEPLOYMENT: '',
      CONVEX_DEPLOY_KEY: '',
      CONVEX_SELF_HOSTED_URL: backendOrigin,
      CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
      CONVEX_SITE_URL: origin,
      DO_NOT_TRACK: '1',
    }
    const backend = start(
      binary,
      [
        '--interface',
        '127.0.0.1',
        '--port',
        String(backendPort),
        '--site-proxy-port',
        String(sitePort),
        '--convex-origin',
        backendOrigin,
        '--convex-site',
        origin,
        '--disable-beacon',
        ...keyArgs,
        '--local-storage',
        join(directory, 'storage'),
        join(directory, 'backend.sqlite3'),
      ],
      { env },
    )
    cleanup.push(() => stop(backend))
    await ready(`${backendOrigin}/version`, backend)
    await cp(join(root, 'convex'), join(directory, 'convex'), { recursive: true })
    await cp(join(root, 'shared'), join(directory, 'shared'), { recursive: true })
    await symlink(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir')
    await cp(join(root, 'package.json'), join(directory, 'package.json'))
    const convex = async (...args) =>
      command(process.execPath, [cli, ...args], { cwd: directory, env })
    await convex('env', 'set', 'CADET_AUTH_ISSUER', origin)
    await convex(
      'dev',
      '--once',
      '--url',
      backendOrigin,
      '--admin-key',
      adminKey,
      '--typecheck',
      'disable',
      '--codegen',
      'disable',
    )
    const sqlDirectory = join(directory, '.data/db/pglite-dev')
    await initializeSql(sqlDirectory)
    const observationsFile = join(directory, 'observations.txt')
    await writeFile(observationsFile, '')
    const appEnv = {
      ...env,
      SECURITY_OBSERVATIONS: observationsFile,
      SECURITY_PGLITE_MODULE: join(
        root,
        '.output/server/node_modules/@electric-sql/pglite/dist/index.js',
      ),
      BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
      NUXT_BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
      NUXT_PUBLIC_SITE_URL: origin,
      NUXT_RAG_ADMIN_EMAILS: 'ordinary@example.test',
      CONVEX_URL: backendOrigin,
      CONVEX_ADMIN_KEY: adminKey,
      NUXT_PUBLIC_CONVEX_URL: backendOrigin,
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: String(port),
    }
    const launchApp = (overrides = {}) =>
      start(
        process.execPath,
        [
          '--import',
          join(root, 'tests/security/support/observe.mjs'),
          join(root, '.output/server/index.mjs'),
        ],
        {
          cwd: directory,
          env: { ...appEnv, ...overrides },
        },
      )
    let app = launchApp()
    appProcess = app
    cleanup.push(() => stop(app))
    const restartApp = async (overrides = {}) => {
      await stop(app)
      app = launchApp(overrides)
      appProcess = app
      await ready(`${origin}/auth`, app)
    }
    await ready(`${origin}/auth`, app)
    const users = []
    for (const role of ['ordinary', 'foreign-user', 'own-client', 'admin'])
      users.push(await register(origin, role))
    const owner = users.find((user) => user.role === 'own-client')
    const admin = users.find((user) => user.role === 'admin')
    async function importTable(table, rows) {
      const file = join(directory, `${table}.json`)
      await writeFile(file, JSON.stringify(rows))
      await convex('import', '--table', table, '--replace', '--yes', file)
    }
    await importTable('rag_admins', [
      {
        userId: admin.id,
        createdAt: Date.now(),
        subjectBinding: {
          issuer: origin,
          reviewedAt: Date.now(),
          operatorEvidence: 'isolated legacy-access operator subject review',
        },
      },
    ])
    const clientFor = (user) => {
      const client = new ConvexHttpClient(backendOrigin, { logger: false })
      if (user.token) client.setAuth(user.token)
      return client
    }
    const actors = [{ role: 'anonymous', id: '', cookie: '' }, ...users]
    const fixtureRun = {
      userId: owner.id,
      runId: 'legacy-private-run',
      profileSnapshotId: 'legacy-private-snapshot',
      status: 'completed',
      createdAt: 1,
      updatedAt: 1,
      recommendationResults: {
        direct: [
          {
            pathwayId: 'private-pathway-canary',
            type: 'direct',
            rank: 1,
            tier: 'strong-fit',
            score: 91,
            rationale: 'PRIVATE_UNSIGNED_RESULT_CANARY',
          },
        ],
        blocked: [],
        composed: [],
        rankedAt: 1,
        rankerVersion: 'legacy-unverified-fixture',
      },
    }
    await importTable('recommendation_runs', [fixtureRun])
    await importTable('auditLog', [
      {
        actorId: owner.id,
        actionType: 'RECOMMENDATION_FLAGGED',
        entityType: 'RECOMMENDATION_RUN',
        entityId: fixtureRun.runId,
        entityLabel: 'PRIVATE_AUDIT_CANARY',
        changeContext: { before: null, after: null },
        timestamp: 1,
      },
    ])
    for (const user of users) {
      if (user.role !== 'admin') {
        await assert.rejects(
          clientFor(user).query('ragSources:getAdminStatus', {}),
          /Admin access required/,
        )
        continue
      }
      const status = await clientFor(user).query('ragSources:getAdminStatus', {})
      assert.equal(status.signedIn, true, 'backend admits the genuine JWT')
      assert.equal(status.currentUser.userId, user.id, 'backend recognizes each real subject')
      assert.equal(status.currentUserIsAdmin, true, 'the reviewed fixture grantee is admin')
    }
    const observations = () => readFile(observationsFile, 'utf8')
    return {
      origin,
      backendOrigin,
      backendVersion,
      users,
      actors,
      owner,
      admin,
      fixtureRun,
      clientFor,
      importTable,
      convex,
      observations,
      directory,
      app,
      restartApp,
      close: async () => {
        for (const close of cleanup.reverse()) await close()
        await rm(directory, { recursive: true, force: true })
      },
    }
  } catch (error) {
    for (const close of cleanup.reverse()) await close()
    await rm(directory, { recursive: true, force: true })
    throw new Error(`${error.message}\n${appProcess?.output() ?? ''}`, { cause: error })
  }
}
