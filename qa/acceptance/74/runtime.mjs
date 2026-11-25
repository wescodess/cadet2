import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const [root, runtime] = process.argv.slice(2).map((s) => path.resolve(s))
const appPort = process.env.QA_APP_PORT || '3000'
const convexPort = process.env.QA_CONVEX_PORT || '4511'
const convexSitePort = String(Number(convexPort) + 1)
const site = `http://127.0.0.1:${appPort}`
const convex = `http://127.0.0.1:${convexPort}`
const version = 'precompiled-2026-11-16-80befbc'
const children = new Set()
const serviceLogs = []
await fs.mkdir(runtime, { recursive: true })
const env = {
  ...process.env,
  NUXT_PUBLIC_SITE_URL: site,
  CONVEX_SITE_URL: site,
  CONVEX_URL: convex,
  NUXT_PUBLIC_CONVEX_URL: convex,
  NUXT_RAG_ADMIN_EMAILS: ['desktop', 'mobile', 'probes']
    .flatMap((project) =>
      ['reviewed', 'private', 'freeze', 'emailonly', 'diagnostics'].map(
        (persona) => `qa74-${path.basename(runtime)}-${project}-${persona}@example.invalid`,
      ),
    )
    .join(','),
}
for (const key of [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRESQL_URL',
  'NUXT_HUB_DIR',
  'NUXT_HUB_DB_DATA_DIR',
  'CONVEX_ADMIN_KEY',
])
  delete env[key]

async function lightLoad() {
  while (os.loadavg()[0] > 15) {
    console.log(`Holding heavy setup: load1=${os.loadavg()[0].toFixed(2)}`)
    await new Promise((r) => setTimeout(r, 60000))
  }
}
async function command(name, args, cwd = root, extra = {}) {
  const logfile = await fs.open(path.join(runtime, `${name}.log`), 'w')
  const child = spawn(args[0], args.slice(1), {
    cwd,
    env: { ...env, ...extra },
    stdio: ['ignore', logfile.fd, logfile.fd],
  })
  serviceLogs.push(logfile)
  children.add(child)
  const result = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => resolve({ code, signal }))
  })
  children.delete(child)
  await logfile.close()
  if (result.code !== 0)
    throw Error(`${name} failed: ${JSON.stringify(result)}; ${runtime}/${name}.log`)
}
async function service(name, args, cwd, extra = {}) {
  const logfile = await fs.open(path.join(runtime, `${name}.log`), 'w')
  serviceLogs.push(logfile)
  const child = spawn(args[0], args.slice(1), {
    cwd,
    env: { ...env, ...extra },
    stdio: ['ignore', logfile.fd, logfile.fd],
  })
  children.add(child)
  child.on('exit', (code) => console.log(`${name} exited ${code}`))
  return child
}
async function ready(url) {
  for (let n = 0; n < 90; n++) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      console.log(`Waiting for ${url}`)
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw Error(`Not ready: ${url}`)
}
async function stop() {
  for (const child of children) child.kill('SIGTERM')
  await fs.writeFile(path.join(runtime, 'stopped.txt'), new Date().toISOString())
  process.exit(0)
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)

try {
  await lightLoad()
  console.log('Building pinned production artifact')
  if (process.env.QA_REUSE_BUILD !== '1') await command('build', ['pnpm', 'build'])
  await lightLoad()
  await fs.cp(path.join(root, 'convex'), path.join(runtime, 'convex'), { recursive: true })
  await fs.cp(path.join(root, 'shared'), path.join(runtime, 'shared'), { recursive: true })
  await fs.copyFile(path.join(root, 'package.json'), path.join(runtime, 'package.json'))
  try {
    await fs.symlink(path.join(root, 'node_modules'), path.join(runtime, 'node_modules'))
  } catch (e) {
    if (e.code !== 'EEXIST') throw e
  }
  const cli = path.join(root, 'node_modules/convex/bin/main.js')
  const cache = path.join(os.homedir(), '.cache/convex/binaries', version)
  await fs.mkdir(cache, { recursive: true })
  await fs.copyFile(
    `/Users/wesleyukadike/.cache/convex/binaries/${version}/convex-local-backend`,
    path.join(cache, 'convex-local-backend'),
  )
  await fs.chmod(path.join(cache, 'convex-local-backend'), 0o755)
  console.log('Initializing real private local Convex')
  const deployDir = path.join(runtime, '.convex/local/default')
  if (!(await fs.stat(path.join(deployDir, 'config.json')).catch(() => null))) {
    try {
      await command(
        'convex-init',
        [
          process.execPath,
          cli,
          'dev',
          '--local',
          '--once',
          '--codegen',
          'disable',
          '--typecheck',
          'disable',
          '--local-cloud-port',
          convexPort,
          '--local-site-port',
          convexSitePort,
          '--local-backend-version',
          version,
        ],
        runtime,
        { CONVEX_AGENT_MODE: 'anonymous' },
      )
    } catch (error) {
      if (!(await fs.stat(path.join(deployDir, 'config.json')).catch(() => null))) throw error
      console.log('Local deployment configured; setting auth issuer before actual deploy')
    }
  }
  const config = JSON.parse(await fs.readFile(path.join(deployDir, 'config.json'), 'utf8'))
  const backend = await service(
    'backend',
    [
      path.join(cache, 'convex-local-backend'),
      '--interface',
      '127.0.0.1',
      '--port',
      convexPort,
      '--site-proxy-port',
      convexSitePort,
      '--convex-origin',
      convex,
      '--convex-site',
      site,
      '--instance-name',
      config.deploymentName,
      '--instance-secret',
      config.instanceSecret,
      '--disable-beacon',
      '--local-storage',
      path.join(deployDir, 'convex_local_storage'),
      path.join(deployDir, 'convex_local_backend.sqlite3'),
    ],
    runtime,
  )
  await ready(`${convex}/version`)
  const selfHosted = path.join(runtime, 'self-hosted.env')
  await fs.writeFile(
    selfHosted,
    `CONVEX_SELF_HOSTED_URL=${convex}\nCONVEX_SELF_HOSTED_ADMIN_KEY=${config.adminKey}\n`,
    { mode: 0o600 },
  )
  await command(
    'convex-issuer',
    [process.execPath, cli, 'env', 'set', 'CADET_AUTH_ISSUER', site, '--env-file', selfHosted],
    runtime,
  )
  await command(
    'convex-deploy',
    [
      process.execPath,
      cli,
      'deploy',
      '--yes',
      '--codegen',
      'disable',
      '--typecheck',
      'disable',
      '--env-file',
      selfHosted,
    ],
    runtime,
  )
  const dbDir = path.join(runtime, '.data/db/pglite-dev')
  await command(
    'auth-init',
    [process.execPath, path.join(root, 'qa/acceptance/28/init-db.mjs'), root],
    root,
    { QA_DB_DIR: dbDir },
  )
  const require = createRequire(path.join(root, 'package.json'))
  const { PGlite } = await import(require.resolve('@electric-sql/pglite'))
  const database = new PGlite(dbDir)
  try {
    const migrations = await fs.readdir(path.join(root, 'server/db/migrations/postgresql'))
    for (const name of migrations.filter((s) => /^000[4-9]_.*\.sql$/.test(s)).sort()) {
      await database.exec(
        await fs.readFile(path.join(root, 'server/db/migrations/postgresql', name), 'utf8'),
      )
    }
  } finally {
    await database.close()
  }
  const app = await service(
    'app',
    [process.execPath, path.join(root, '.output/server/index.mjs')],
    runtime,
    {
      NODE_ENV: 'production',
      PORT: appPort,
      HOST: '127.0.0.1',
      NITRO_PORT: appPort,
      NITRO_HOST: '127.0.0.1',
      CONVEX_ADMIN_KEY: config.adminKey,
    },
  )
  await ready(`${site}/api/auth/get-session`)
  await fs.writeFile(
    path.join(runtime, 'ready.json'),
    JSON.stringify(
      {
        root,
        site,
        convex,
        pids: [process.pid, backend.pid, app.pid],
        version,
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )
  console.log(`READY ${runtime}/ready.json`)
  await new Promise(() => {})
} catch (error) {
  console.error(error)
  for (const child of children) child.kill('SIGTERM')
  process.exitCode = 1
}
