import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn, execFileSync } from 'node:child_process'

const config = JSON.parse(await fs.readFile(process.argv[2], 'utf8'))
const ready = JSON.parse(await fs.readFile(path.join(config.runtime, 'ready.json'), 'utf8'))
if (
  execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ready.root, encoding: 'utf8' }).trim() !==
  '407b7445dc3ea48c5a259e449c8f5d118d48a416'
)
  throw Error('Base correction pin changed')
const qa = path.join(process.cwd(), 'qa/acceptance/74')
const evidence = path.join(config.evidence, 'freeze-control')
await fs.rename(evidence, path.join(config.evidence, config.archiveName || 'freeze-setup-attempt2'))
await fs.mkdir(evidence, { recursive: true })
const env = {
  ...process.env,
  QA_BUILD: 'base',
  QA_URL: ready.site,
  QA_CONVEX_URL: ready.convex,
  QA_RUNTIME_DIR: config.runtime,
  QA_EVIDENCE: evidence,
}
async function run(name, args) {
  while (os.loadavg()[0] > 15) {
    console.log(`Holding corrected freeze journey: load1=${os.loadavg()[0].toFixed(2)}`)
    await new Promise((resolve) => setTimeout(resolve, 60000))
  }
  const log = await fs.open(path.join(config.runtime, `${name}.log`), 'w')
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', log.fd, log.fd],
  })
  const status = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', resolve)
  })
  await log.close()
  await fs.writeFile(
    path.join(config.runtime, `${name}.exit.json`),
    JSON.stringify({ status, finishedAt: new Date().toISOString() }),
  )
  return status
}
if (await run('freeze-final-fixtures', [path.join(qa, 'fixtures.mjs'), ready.root, config.runtime]))
  throw Error('Fixture reset failed')
if (
  await run('freeze-final-before', [
    path.join(qa, 'snapshot.mjs'),
    path.join(evidence, 'before.json'),
  ])
)
  throw Error('Before snapshot failed')
await run('freeze-final-ui', [
  path.join(process.cwd(), 'node_modules/@playwright/test/cli.js'),
  'test',
  '-c',
  path.join(qa, 'playwright.config.ts'),
  '--grep',
  'J74-05',
])
if (
  await run('freeze-final-after', [
    path.join(qa, 'snapshot.mjs'),
    path.join(evidence, 'after.json'),
  ])
)
  throw Error('After snapshot failed')
const report = JSON.parse(await fs.readFile(path.join(evidence, 'results.json'), 'utf8'))
const tests = report.suites.flatMap((s) => s.specs || []).flatMap((s) => s.tests)
if (
  report.stats.unexpected !== 2 ||
  report.stats.skipped ||
  report.stats.flaky ||
  tests.length !== 2 ||
  tests.some((t) => !t.results[0].attachments.some((a) => a.name === 'frozen-ui-actions.json'))
)
  throw Error('Corrected base freeze journeys did not complete all visible actions')
await fs.writeFile(config.proceed, 'corrected base freeze journeys completed')
await fs.writeFile(
  path.join(evidence, 'correction-result.json'),
  JSON.stringify(
    {
      meaningfulRed: true,
      cases: tests.length,
      unchanged:
        (await fs.readFile(path.join(evidence, 'before.json'), 'utf8')) ===
        (await fs.readFile(path.join(evidence, 'after.json'), 'utf8')),
    },
    null,
    2,
  ),
)
