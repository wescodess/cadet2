import { count, main, outputDir, ratchet, run, writeJSON } from './common.mjs'
import { configuration, structuralCommit } from './structural.mjs'
import { parse } from './dead-code.parser.mjs'

main(() => {
  const result = run(configuration('../../node_modules/.bin/knip'), [
    '--config',
    configuration('knip.json'),
    '--include',
    'files,exports,types,dependencies',
    '--reporter',
    'json',
    '--no-progress',
  ])
  const report = parse({ status: result.status, stdout: result.stdout })
  writeJSON(`${outputDir}/dead-code.json`, report)
  const counts = {}
  for (const { file, ...issues } of report.issues)
    for (const [kind, symbols] of Object.entries(issues))
      for (const symbol of symbols) count(counts, `${file}|${kind}|${symbol.name}`)
  ratchet('dead-code', counts, { commit: structuralCommit, date: '2026-11-21' })
})
