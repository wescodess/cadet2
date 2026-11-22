import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { test } from 'node:test'

async function sources(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = `${directory}/${entry.name}`
      return entry.isDirectory() ? sources(path) : entry.name.endsWith('.ts') ? [path] : []
    }),
  )
  return nested.flat()
}

test('Playwright specs and their helpers contain no retired demo route assertions', async () => {
  const violations = []
  for (const directory of [
    'tests/e2e',
    'tests/api',
    'tests/integration',
    'tests/support/fixtures',
  ]) {
    for (const path of await sources(directory)) {
      const source = await readFile(path, 'utf8')
      if (
        /\/api\/(?:workspace|intake|recommendations\/runs)(?:[/'"`?]|$)|\/workspace(?:[/'"`?$]|\\)/m.test(
          source,
        )
      )
        violations.push(path)
    }
  }
  assert.deepEqual(
    violations,
    [],
    'retired success assertions belong in the closure suite as denials',
  )
})
