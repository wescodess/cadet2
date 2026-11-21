import { resolve } from 'node:path'
import { performance } from 'node:perf_hooks'
import { createServer } from 'node:net'
import { writeFileSync } from 'node:fs'
import {
  captureBoundaryResult,
  combineBoundaryResults,
  readBoundaryResult,
} from './boundary-results.mjs'

const resultFile = process.env.CONTAINMENT_RESULTS
if (!resultFile) throw new Error('Missing isolated boundary result path')
writeFileSync(resolve(process.env.CONTAINMENT_DIRECTORY, 'backend-ready'), '')
const children = []
const evidence = process.env.QUALITY_OUTPUT_DIR

async function availableOrigin() {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return `http://127.0.0.1:${port}`
}

try {
  for (const [name, expectedTests] of [
    ['admission', 21],
    ['source-audit', 9],
    ['sql-rollback', 7],
    ['source-rollback', 6],
    ['audit-success', 13],
    ['audit-consistency', 2],
    ['design', 10],
    ['navigation', 2],
    ['network', 4],
  ]) {
    const file = evidence
      ? resolve(evidence, `admin-boundaries-${name}.json`)
      : `${resultFile}.${name}`
    const started = performance.now()
    captureBoundaryResult(
      resolve(import.meta.dirname, '../../tests/security/admin-rag.test.mjs'),
      file,
      'inherit',
      {
        ...process.env,
        CONTAINMENT_TEST_GROUP: name,
        CONTAINMENT_ORIGIN: await availableOrigin(),
      },
    )
    console.log(
      `Admin boundary group ${name}: ${(performance.now() - started).toFixed(0)}ms (limit 120000ms)`,
    )
    children.push({ name, file, expectedTests })
    readBoundaryResult(file, expectedTests)
  }
  const launcherFile = evidence
    ? resolve(evidence, 'admin-boundaries-launcher.json')
    : `${resultFile}.launcher`
  captureBoundaryResult(
    resolve(import.meta.dirname, '../../tests/security/launcher.test.mjs'),
    launcherFile,
    'inherit',
  )
  children.push({ name: 'launcher', file: launcherFile, expectedTests: 2 })
  readBoundaryResult(launcherFile, 2)
  combineBoundaryResults(children, resultFile)
  readBoundaryResult(resultFile)
} catch (error) {
  writeFileSync(
    resultFile,
    JSON.stringify({ exitCode: 1, signal: null, error: String(error), counts: null }, null, 2),
  )
  throw error
}
