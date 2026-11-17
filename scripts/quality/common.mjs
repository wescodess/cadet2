import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs'
import { relative } from 'node:path'

export const baselineCommit = 'fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3'
export const writingBaseline = process.argv.includes('--write-baseline')
if (
  (Object.hasOwn(process.env, 'CI') || Object.hasOwn(process.env, 'GITHUB_ACTIONS')) &&
  process.argv.some((arg) => /^--(?:write|fix|update)(?:-|=|$)/.test(arg))
)
  throw new Error('Quality baseline and writer flags are forbidden in CI')

mkdirSync('.quality-output', { recursive: true })
export const outputDir = process.env.QUALITY_OUTPUT_DIR ?? mkdtempSync('.quality-output/run-')
process.env.QUALITY_OUTPUT_DIR = outputDir

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  })
  if (result.error) throw result.error
  if (result.signal) throw new Error(`${command} terminated by ${result.signal}`)
  return result
}

export function git(...args) {
  const result = run('git', args)
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}

export function files() {
  return [
    ...new Set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0')),
  ]
    .filter(Boolean)
    .sort()
}

export function sourceFiles() {
  return files()
    .filter((file) => !file.startsWith('convex/_generated/'))
    .filter((file) =>
      /^(app|server|shared|convex|tests|scripts)\/.*\.(?:[cm]?js|ts|vue)$|^[^/]+\.(?:[cm]?js|ts)$/.test(
        file,
      ),
    )
}

export function json(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

export function writeJSON(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

export function localPath(path) {
  return relative(process.cwd(), path).replaceAll('\\', '/')
}

export function count(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1
}

export function ratchet(name, counts) {
  const path = `scripts/quality/baselines/${name}.json`
  const legacy = new Set(git('ls-tree', '-r', '--name-only', baselineCommit).split('\n'))
  for (const key of Object.keys(counts)) {
    if (!legacy.has(key.split('|')[0])) throw new Error(`${name}: new files must be clean: ${key}`)
  }
  if (writingBaseline) {
    writeJSON(path, {
      date: '2026-11-17',
      commit: baselineCommit,
      counts: Object.fromEntries(Object.entries(counts).sort()),
    })
    console.log(`${name}: wrote ${Object.values(counts).reduce((a, b) => a + b, 0)} violations`)
    return
  }
  const baseline = json(path)
  const failures = []
  for (const [key, value] of Object.entries(counts)) {
    if (value > (baseline.counts[key] ?? 0))
      failures.push(`${key}: ${value} > ${baseline.counts[key] ?? 0}`)
  }
  if (failures.length) throw new Error(`${name} regression:\n${failures.join('\n')}`)
  console.log(
    `${name}: PASS (${Object.values(counts).reduce((a, b) => a + b, 0)} current; ${Object.values(baseline.counts).reduce((a, b) => a + b, 0)} baseline)`,
  )
}

export function main(fn) {
  Promise.resolve()
    .then(fn)
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
