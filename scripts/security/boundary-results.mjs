import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { z } from 'zod'

export function captureBoundaryResult(file, resultFile, stdio = 'inherit') {
  const result = spawnSync(
    process.execPath,
    [
      '--test',
      '--test-reporter=spec',
      '--test-reporter-destination=stdout',
      '--test-reporter=tap',
      `--test-reporter-destination=${resultFile}.tap`,
      file,
    ],
    { stdio, timeout: 120_000 },
  )
  let counts = null
  try {
    const tap = readFileSync(`${resultFile}.tap`, 'utf8')
    const match =
      /\n1\.\.(\d+)\n# tests (\d+)\n# suites (\d+)\n# pass (\d+)\n# fail (\d+)\n# cancelled (\d+)\n# skipped (\d+)\n# todo (\d+)\n# duration_ms [\d.]+\s*$/.exec(
        tap,
      )
    if (match) {
      counts = Object.fromEntries(
        ['planned', 'tests', 'suites', 'passed', 'failed', 'cancelled', 'skipped', 'todo'].map(
          (name, index) => [name, Number(match[index + 1])],
        ),
      )
    }
  } catch {
    counts = null
  }
  const record = {
    exitCode: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    counts,
  }
  writeFileSync(resultFile, JSON.stringify(record, null, 2))
  return record
}

export function readBoundaryResult(file, expectedTests = 20) {
  return z
    .object({
      exitCode: z.literal(0),
      signal: z.null(),
      error: z.null(),
      counts: z
        .object({
          planned: z.literal(expectedTests),
          tests: z.literal(expectedTests),
          suites: z.literal(0),
          passed: z.literal(expectedTests),
          failed: z.literal(0),
          cancelled: z.literal(0),
          skipped: z.literal(0),
          todo: z.literal(0),
        })
        .strict(),
    })
    .strict()
    .parse(JSON.parse(readFileSync(file, 'utf8')))
}
