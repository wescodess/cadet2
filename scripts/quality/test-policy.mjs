import { main, ratchet, sourceFiles } from './common.mjs'
import { runPlaywright, runVitest } from './test-results.mjs'
import { credited, scanFile } from './test-policy-source.mjs'

main(() => {
  const counts = {}
  const tests = {}
  const files = sourceFiles()
  const runtime = {
    ...runVitest(),
    ...runPlaywright(
      files.filter((file) => /^tests\/(api|e2e|integration)\/.*\.spec\.ts$/.test(file)),
    ),
  }
  for (const file of files.filter(
    (file) => file.startsWith('tests/') || /\.(?:spec|test)\.[cm]?[jt]s$/.test(file),
  ))
    scanFile(file, counts, tests)
  for (const [file, skips] of Object.entries(runtime)) {
    const unticketed = Math.max(
      counts[file] ?? 0,
      skips.filter((location) => !credited(tests[file], location)).length,
    )
    if (unticketed > 0) counts[file] = unticketed
  }
  ratchet('test-policy', counts)
})
