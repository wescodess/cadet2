import { main, ratchet, sourceFiles } from './common.mjs'
import { runPlaywright, runVitest } from './test-results.mjs'
import { unobservedSkips } from './test-policy-source.mjs'

main(() => {
  const files = sourceFiles()
  const counts = {
    ...runVitest(),
    ...runPlaywright(
      files.filter((file) => /^tests\/(api|e2e|integration)\/.*\.spec\.ts$/.test(file)),
    ),
  }
  for (const file of files.filter(
    (file) => file.startsWith('tests/') || /\.(?:spec|test)\.[cm]?[jt]s$/.test(file),
  )) {
    const hidden = unobservedSkips(file)
    if (hidden > 0) counts[file] = (counts[file] ?? 0) + hidden
  }
  ratchet('test-policy', counts)
})
