import { main, ratchet, sourceFiles } from './common.mjs'
import { runPlaywright, runVitest } from './test-results.mjs'
import { scanFile } from './test-policy-source.mjs'

main(() => {
  const counts = {}
  const files = sourceFiles()
  const runtime = {
    ...runVitest(),
    ...runPlaywright(
      files.filter((file) => /^tests\/(api|e2e|integration)\/.*\.spec\.ts$/.test(file)),
    ),
  }
  ratchet('test-policy', runtime)
  for (const file of files.filter(
    (file) => file.startsWith('tests/') || /\.(?:spec|test)\.[cm]?[jt]s$/.test(file),
  ))
    scanFile(file, counts)
  ratchet('test-policy', counts)
})
