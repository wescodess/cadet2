import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { localPath, outputDir, run, writeJSON } from './common.mjs'
import { parse } from './vitest-results.parser.mjs'
import { parse as parsePlaywright, specifications } from './playwright-list.parser.mjs'

export function vitestFindings(report) {
  return Object.fromEntries(
    report.testResults.map((file) => {
      const tests = file.assertionResults
      const focused = tests.filter((test) =>
        test.failureMessages.some((message) =>
          message.includes('[Vitest] Unexpected .only modifier'),
        ),
      ).length
      return [
        localPath(file.name),
        {
          skipped: tests.filter((test) => ['skipped', 'pending'].includes(test.status)).length,
          todo: tests.filter((test) => test.status === 'todo').length,
          focused: focused || Number(file.message.includes('[Vitest] Unexpected .only modifier')),
        },
      ]
    }),
  )
}

export function vitestSkips(report) {
  return Object.fromEntries(
    report.testResults
      .map((file) => [
        localPath(file.name),
        file.assertionResults
          .filter((test) => ['skipped', 'pending', 'todo'].includes(test.status))
          .map((test) => test.location ?? null),
      ])
      .filter(([, skips]) => skips.length > 0),
  )
}

export function runVitest() {
  const discovered = run('pnpm', ['exec', 'vitest', 'list', '--filesOnly', '--json'])
  if (discovered.status !== 0) throw new Error(`Vitest discovery failed: ${discovered.stderr}`)
  const path = resolve(outputDir, 'vitest-results.json')
  const result = run('pnpm', [
    'exec',
    'vitest',
    'run',
    '--maxWorkers=2',
    '--allowOnly=false',
    '--includeTaskLocation',
    '--reporter=json',
    `--outputFile=${path}`,
  ])
  const report = parse({
    status: result.status,
    files: discovered.stdout,
    stdout: readFileSync(path, 'utf8'),
  }).stdout
  const findings = vitestFindings(report)
  writeJSON(`${outputDir}/vitest-policy.json`, findings)
  for (const [file, counts] of Object.entries(findings)) {
    if (counts.focused)
      throw new Error(`${file}: ${counts.focused} focused tests are forbidden; see ${path}`)
  }
  if (!report.success) throw new Error(`Vitest failed (focused tests are forbidden); see ${path}`)
  return vitestSkips(report)
}

export function runPlaywright(files) {
  const path = resolve(outputDir, 'playwright-list.json')
  const result = run(
    'pnpm',
    ['exec', 'playwright', 'test', '--list', '--forbid-only', '--reporter=json'],
    {
      env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: path },
    },
  )
  if (result.status !== 0)
    throw new Error(
      `Playwright discovery failed (focus forbidden): ${result.stdout}${result.stderr}`,
    )
  const report = parsePlaywright({ files, stdout: readFileSync(path, 'utf8') }).stdout
  const skips = {}
  for (const spec of specifications(report.suites)) {
    if (spec.tests.some((test) => test.expectedStatus === 'skipped'))
      (skips[localPath(resolve(report.config.rootDir, spec.file))] ??= []).push({
        line: spec.line,
        column: spec.column,
      })
  }
  writeJSON(`${outputDir}/playwright-skips.json`, skips)
  return skips
}
