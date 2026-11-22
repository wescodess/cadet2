import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [outputArgument, auditArgument, licenseArgument] = process.argv.slice(2)
const output = resolve(outputArgument)
mkdirSync(output, { recursive: true })
const audit = resolve(auditArgument)
const licenses = resolve(licenseArgument)
const shim = resolve(output, 'coverage-shim.cjs')
writeFileSync(
  shim,
  `const cp = require('node:child_process')
const { readFileSync } = require('node:fs')
const original = cp.spawnSync
cp.spawnSync = function(command, args, options) {
  if (command === 'pnpm' && args.includes('audit')) {
    const report = JSON.parse(readFileSync(${JSON.stringify(audit)}, 'utf8'))
    if (process.env.PROBE_INCOMPLETE === 'audit') {
      report.metadata.dependencies -= 1
      report.metadata.totalDependencies -= 1
    }
    return { status: 1, signal: null, stdout: JSON.stringify(report), stderr: '' }
  }
  if (command === 'pnpm' && args.includes('licenses')) {
    const report = JSON.parse(readFileSync(${JSON.stringify(licenses)}, 'utf8'))
    return { status: 0, signal: null, stdout: JSON.stringify(process.env.PROBE_INCOMPLETE === 'licenses' ? { MIT: report.MIT } : report), stderr: '' }
  }
  return original(command, args, options)
}
require('node:module').syncBuiltinESMExports()
`,
)
const baselinePath = 'scripts/quality/baselines/dependencies.json'
const original = readFileSync(baselinePath)
const records = []
try {
  for (const mode of ['complete', 'licenses', 'audit', 'complete-tightened-baseline']) {
    const baseline = JSON.parse(original)
    if (mode === 'complete-tightened-baseline')
      delete baseline.licenses['eslint-plugin-sonarjs@4.2.2|LGPL-3.0-only']
    writeFileSync(baselinePath, JSON.stringify(baseline))
    const result = spawnSync(
      process.execPath,
      ['--require', shim, 'scripts/quality/dependencies.mjs'],
      {
        env: { ...process.env, PROBE_INCOMPLETE: mode },
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
      },
    )
    const expected = mode === 'complete' ? 0 : 1
    records.push({
      mode,
      status: result.status,
      expected,
      passed: result.status === expected,
      stdout: result.stdout,
      stderr: result.stderr,
    })
  }
} finally {
  writeFileSync(baselinePath, original)
}
writeFileSync(resolve(output, 'coverage-probes.json'), JSON.stringify(records, null, 2) + '\n')
console.log(JSON.stringify(records, null, 2))
if (records.some((record) => !record.passed)) process.exitCode = 1
