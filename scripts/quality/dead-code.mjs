import { resolve } from 'node:path'
import { count, json, main, outputDir, ratchet, writeJSON } from './common.mjs'
import { runScanner, scannerBudgets } from './scanner.mjs'
import {
  configuration,
  ignoredStructuralFiles,
  structuralCommit,
  structuralFiles,
} from './structural.mjs'
import { rejectKnipSuppressions } from './structural-preflight.mjs'
import { convexEntries, verifyConvexEntries } from './convex-entries.mjs'
import { executableDefaults } from './executable-entries.mjs'
import { parse } from './dead-code.parser.mjs'

main(async () => {
  const budgetMs = scannerBudgets['dead-code']
  const execution = {
    budgetMs,
    deadlineMs: Number(process.hrtime.bigint()) / 1e6 + budgetMs,
    captureBudget: { bytes: 0 },
  }
  const selected = structuralFiles().filter((file) => !file.startsWith('docs/'))
  rejectKnipSuppressions(selected)
  const authority = await convexEntries(selected, execution)
  const framework = [...authority.entries, ...executableDefaults(selected)]
  const admitted = new Set(framework.map(({ file, name }) => `${file}|${name}`))
  for (const file of ['app/auth.config.ts', 'server/auth.config.ts'])
    admitted.add(`${file}|default`)
  const inventory = resolve(outputDir, 'dead-code-inventory.json')
  const ignored = ignoredStructuralFiles().filter((file) => !file.startsWith('docs/'))
  writeJSON(inventory, { selected, ignored, framework })
  const config = resolve(outputDir, 'knip-config.json')
  writeJSON(config, {
    ...json(configuration('knip.json')),
    convex: false,
    includeEntryExports: true,
    entry: [
      ...json(configuration('knip.json')).entry,
      ...new Set(framework.map(({ file }) => file)),
    ],
    project: selected.map((file) => file.replace(/([*?[\]{}()!+@])/g, '\\$1')),
  })
  const result = await runScanner(
    'dead-code',
    process.execPath,
    [configuration('knip.scanner.mjs'), config, inventory],
    execution,
  )
  if (!result.stdout.trim() && result.stderr) throw new Error(result.stderr.trim())
  const report = parse({ status: result.status, stdout: result.stdout })
  writeJSON(`${outputDir}/dead-code.json`, report)
  verifyConvexEntries(authority)
  const counts = {}
  for (const { file, ...issues } of report.issues)
    for (const [kind, symbols] of Object.entries(issues))
      for (const symbol of symbols) {
        if (kind !== 'exports' || !admitted.has(`${file}|${symbol.name}`))
          count(counts, `${file}|${kind}|${symbol.name}`)
      }
  writeJSON(`${outputDir}/dead-code-counts.json`, counts)
  ratchet('dead-code', counts, { commit: structuralCommit, date: '2026-11-21' })
})
