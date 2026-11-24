import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { count, main, outputDir, ratchet, writeJSON } from './common.mjs'
import { runScanner } from './scanner.mjs'
import { configuration, structuralCommit, structuralFiles } from './structural.mjs'
import config from './boundaries.config.mjs'
import { parse } from './boundaries.parser.mjs'

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
main(async () => {
  const selected = structuralFiles()
  const owners = new Map()
  for (const file of selected) {
    const privatePath = file.match(/^(.+\/)\b(?:private|internal)\//)?.[1]
    const modulePath = file.match(/^((?:app|server|shared)\/modules\/[^/]+\/)/)?.[1]
    if (privatePath && !owners.has(privatePath))
      owners.set(privatePath, `${escape(privatePath)}(?:private|internal)/`)
    if (modulePath) owners.set(modulePath, escape(modulePath))
  }
  const forbidden = [
    ...config.forbidden,
    ...[...owners].map(([directory, target]) => {
      return {
        name: `entry:${directory}`,
        severity: 'error',
        from: { pathNot: `^${escape(directory)}` },
        to: {
          path: `^${target}`,
          ...(!target.includes('private|internal')
            ? { pathNot: `^${escape(directory)}index[.][cm]?[jt]s$` }
            : {}),
        },
      }
    }),
  ]
  const tsConfig = resolve(outputDir, 'boundaries-tsconfig.json')
  writeJSON(tsConfig, {
    files: selected.map((file) => resolve(file)),
    compilerOptions: {
      baseUrl: process.cwd(),
      paths: {
        '~/*': ['app/*'],
        '@/*': ['app/*'],
        '~~/*': ['*'],
        '@@/*': ['*'],
        '#shared/*': ['shared/*'],
      },
    },
  })
  const path = resolve(outputDir, 'boundaries-config.json')
  writeJSON(path, {
    ...config,
    forbidden,
    options: { ...config.options, tsConfig: { fileName: tsConfig } },
  })
  const result = await runScanner(
    'boundaries',
    configuration('../../node_modules/.bin/depcruise'),
    ['--config', path, '--output-type', 'json', ...selected],
  )
  writeFileSync(`${outputDir}/boundaries-raw.json`, result.stdout)
  writeJSON(`${outputDir}/boundaries-process.json`, {
    status: result.status,
    stderr: result.stderr,
    selected,
  })
  const report = parse({ status: result.status, stdout: result.stdout, selected })
  writeJSON(`${outputDir}/boundaries.json`, report)
  const counts = {}
  for (const violation of report.summary.violations) {
    const cycle = violation.cycle
      ? `:${createHash('sha256').update(JSON.stringify(violation.cycle)).digest('hex')}`
      : ''
    count(counts, `${violation.from}|${violation.rule.name}|${violation.to}${cycle}`)
  }
  ratchet('boundaries', counts, { commit: structuralCommit, date: '2026-11-21' })
})
