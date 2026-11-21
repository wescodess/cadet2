import { resolve } from 'node:path'
import { createServer } from 'node:net'
import { writeFileSync } from 'node:fs'
import {
  captureBoundaryResult,
  combineBoundaryResults,
  readBoundaryResult,
} from './boundary-results.mjs'

const resultFile = process.env.CONTAINMENT_RESULTS
if (!resultFile) throw new Error('Missing isolated boundary result path')
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
    ['core', 58],
    ['design', 10],
    ['navigation', 2],
  ]) {
    const file = evidence
      ? resolve(evidence, `admin-boundaries-${name}.json`)
      : `${resultFile}.${name}`
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
    children.push({ name, file, expectedTests })
    readBoundaryResult(file, expectedTests)
  }
  combineBoundaryResults(children, resultFile)
  readBoundaryResult(resultFile)
} catch (error) {
  writeFileSync(
    resultFile,
    JSON.stringify({ exitCode: 1, signal: null, error: String(error), counts: null }, null, 2),
  )
  throw error
}
