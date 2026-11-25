import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
const root = process.cwd()
const qa = path.join(root, 'qa/acceptance/74')
const runtime = process.env.QA_RUNTIME_DIR
const evidence = process.env.QA_EVIDENCE
const appRoot = JSON.parse(await fs.readFile(path.join(runtime, 'ready.json'), 'utf8')).root
async function run(name, args, extra = {}) {
  while (os.loadavg()[0] > 15) {
    console.log(`Holding ${name}: load1=${os.loadavg()[0].toFixed(2)}`)
    await new Promise((r) => setTimeout(r, 60000))
  }
  const log = await fs.open(path.join(runtime, `${name}.log`), 'w')
  const child = spawn(process.execPath, args, {
    cwd: root,
    env: { ...process.env, ...extra },
    stdio: ['ignore', log.fd, log.fd],
  })
  const status = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code) => resolve(code))
  })
  await log.close()
  await fs.writeFile(
    path.join(runtime, `${name}.exit.json`),
    JSON.stringify({ status, finishedAt: new Date().toISOString() }),
  )
  console.log(`${name}: exit ${status}`)
  return status
}
let accounts
try {
  accounts = JSON.parse(await fs.readFile(path.join(runtime, 'accounts.json'), 'utf8'))
} catch {
  accounts = {}
}
if (!accounts.probes?.reviewed || !accounts.mobile?.diagnostics) {
  if (await run('accounts', [path.join(qa, 'accounts.mjs')])) process.exit(2)
}
if (await run('fixtures', [path.join(qa, 'fixtures.mjs'), appRoot, runtime])) process.exit(2)
if (
  await run('inspect', [path.join(qa, 'inspect.mjs')], {
    QA_EVIDENCE: path.join(evidence, 'inspect-ready'),
  })
)
  console.log('Inspection needs review; retained evidence is available')
await fs.writeFile(path.join(runtime, 'browser-review-ready.txt'), new Date().toISOString())
const proceed = path.join(runtime, 'run-ui')
while (!(await fs.stat(proceed).catch(() => null))) await new Promise((r) => setTimeout(r, 1000))
const before = path.join(evidence, 'ui-before.json')
const after = path.join(evidence, 'ui-after.json')
if (await run('ui-before', [path.join(qa, 'snapshot.mjs'), before])) process.exit(2)
const ui = await run(
  'ui',
  [
    path.join(root, 'node_modules/@playwright/test/cli.js'),
    'test',
    '-c',
    path.join(qa, 'playwright.config.ts'),
  ],
  { QA_EVIDENCE: path.join(evidence, 'ui') },
)
if (await run('ui-after', [path.join(qa, 'snapshot.mjs'), after])) process.exit(2)
const unchanged = (await fs.readFile(before, 'utf8')) === (await fs.readFile(after, 'utf8'))
await fs.writeFile(
  path.join(evidence, 'ui-state-result.json'),
  JSON.stringify(
    {
      unchanged,
      oracle:
        'contract frozen YouTube actions reject before writing; retained source/item/batch/audit history remains unchanged',
    },
    null,
    2,
  ),
)
const api = await run('api', [path.join(qa, 'api-probes.mjs')])
const worker = await run('worker', [path.join(qa, 'worker-probes.mjs')])
process.exitCode = ui || api || worker || !unchanged ? 1 : 0
