import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { clearInterval, setInterval } from 'node:timers'
import { chromium } from '@playwright/test'
import { inspectAdminSources, inspectBuiltAdminRoutes } from './admin-surfaces.mjs'
import { readBoundaryResult } from './boundary-results.mjs'
import { acquireStartupLock } from './startup-lock.mjs'

const root = resolve(import.meta.dirname, '../..')
const sources = await inspectAdminSources(root)
const routes = inspectBuiltAdminRoutes(root)
console.log(
  `Admin surface guard: PASS (${sources.convex} Convex registrations, ${sources.http} HTTP files, ${routes.length} built routes)`,
)
const isolatedEnv = { ...process.env }
for (const key of [
  'CONVEX_DEPLOYMENT',
  'CONVEX_DEPLOY_KEY',
  'CONVEX_ADMIN_KEY',
  'CONVEX_URL',
  'CONVEX_SELF_HOSTED_URL',
  'CONVEX_SELF_HOSTED_ADMIN_KEY',
])
  delete isolatedEnv[key]
await mkdir(join(root, '.quality-output'), { recursive: true })
const evidence = process.env.QUALITY_OUTPUT_DIR
  ? resolve(root, process.env.QUALITY_OUTPUT_DIR)
  : await mkdtemp(join(root, '.quality-output/run-admin-'))
const directory = await mkdtemp(join(tmpdir(), 'cadet2-containment-'))
const resultFile = join(directory, 'boundary-results.json')
const cliHome = join(directory, 'home')
await mkdir(cliHome, { mode: 0o700 })
console.log(`Isolated boundary workspace: ${directory}`)
await mkdir(join(directory, 'backend/convex'), { recursive: true })
await writeFile(
  join(directory, 'backend/convex/schema.ts'),
  "import { defineSchema } from 'convex/server'\nexport default defineSchema({})\n",
)
await symlink(join(root, 'node_modules'), join(directory, 'backend/node_modules'), 'dir')
await writeFile(
  join(directory, 'backend/package.json'),
  JSON.stringify({
    type: 'module',
    dependencies: { convex: '1.32.0', '@convex-dev/better-auth': '0.10.11' },
  }),
)

async function availablePort() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

const ports = await Promise.all([availablePort(), availablePort(), availablePort()])
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`
const releaseStartup = await acquireStartupLock(
  join(homedir(), '.cache/cadet2-containment-startup'),
)
const child = spawn(
  process.execPath,
  [
    join(root, 'node_modules/convex/bin/main.js'),
    'dev',
    '--once',
    '--local',
    '--typecheck',
    'disable',
    '--codegen',
    'disable',
    '--local-backend-version',
    'precompiled-2026-11-16-80befbc',
    '--local-cloud-port',
    String(ports[0]),
    '--local-site-port',
    String(ports[1]),
    '--run-sh',
    `${quote(process.execPath)} ${quote(join(root, 'scripts/security/execute-boundaries.mjs'))}`,
  ],
  {
    cwd: join(directory, 'backend'),
    stdio: 'inherit',
    env: {
      ...isolatedEnv,
      HOME: cliHome,
      USERPROFILE: cliHome,
      LOCALAPPDATA: join(cliHome, 'AppData/Local'),
      XDG_CACHE_HOME: join(cliHome, '.cache'),
      CONTAINMENT_BROWSER_EXECUTABLE: chromium.executablePath(),
      CONVEX_AGENT_MODE: 'anonymous',
      CONTAINMENT_DIRECTORY: directory,
      CONTAINMENT_ORIGIN: `http://127.0.0.1:${ports[2]}`,
      CONTAINMENT_RESULTS: resultFile,
      QUALITY_OUTPUT_DIR: evidence,
    },
  },
)
const startupMonitor = setInterval(() => {
  if (!existsSync(join(directory, 'backend-ready'))) return
  clearInterval(startupMonitor)
  releaseStartup()
}, 50)
child.once('error', (error) => {
  clearInterval(startupMonitor)
  releaseStartup()
  throw error
})
child.once('exit', async (code) => {
  try {
    if (code !== 0) throw new Error(`Convex boundary launcher exited ${code}`)
    await cp(resultFile, join(evidence, 'admin-boundary-results.json'))
    readBoundaryResult(resultFile)
    console.log('Admin boundary result: PASS (70 passed; zero failures, skips or cancellations)')
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    clearInterval(startupMonitor)
    releaseStartup()
    await cp(join(directory, 'nitro.log'), join(evidence, 'nitro.log')).catch(() => {})
    if (process.env.CONTAINMENT_RETAIN !== '1')
      await rm(directory, { recursive: true, force: true })
  }
})
