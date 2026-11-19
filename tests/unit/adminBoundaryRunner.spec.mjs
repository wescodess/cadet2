// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import {
  captureBoundaryResult,
  combineBoundaryResults,
  readBoundaryResult,
} from '../../scripts/security/boundary-results.mjs'

async function probe(source, verify) {
  const directory = await mkdtemp(join(tmpdir(), 'cadet2-boundary-result-'))
  try {
    const file = join(directory, 'fixture.test.mjs')
    const result = join(directory, 'result.json')
    await writeFile(file, `import { test } from 'node:test'\n${source}\n`)
    captureBoundaryResult(file, result, 'pipe')
    verify(result)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

it('accepts a completed real Node test result', async () => {
  await probe("test('positive', () => {})", (result) => {
    expect(readBoundaryResult(result, 1).counts.passed).toBe(1)
  })
})

it('rejects a failed child even if an enclosing CLI returns success', async () => {
  await probe("test('negative', () => { throw new Error('deliberate red') })", (result) => {
    expect(() => readBoundaryResult(result, 1)).toThrow()
  })
})

it('rejects skipped mandatory tests even when Node exits zero', async () => {
  await probe("test.skip('skipped fixture #74', () => {})", (result) => {
    expect(() => readBoundaryResult(result, 1)).toThrow()
  })
})

it('rejects a passing but incomplete mandatory population', async () => {
  await probe("test('partial', () => {})", (result) => {
    expect(() => readBoundaryResult(result)).toThrow()
  })
})

it('rejects absent completion evidence', () => {
  expect(() => readBoundaryResult('/nonexistent/cadet2-boundary-result.json')).toThrow()
})

it('combines complete mandatory child results without dropping a population', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cadet2-boundary-groups-'))
  try {
    const file = join(directory, 'fixture.test.mjs')
    await writeFile(file, "import { test } from 'node:test'\ntest('positive', () => {})\n")
    const children = ['core', 'design'].map((name) => ({
      name,
      file: join(directory, name + '.json'),
      expectedTests: 1,
    }))
    for (const child of children) captureBoundaryResult(file, child.file, 'pipe')
    const aggregate = join(directory, 'aggregate.json')
    combineBoundaryResults(children, aggregate)
    expect(readBoundaryResult(aggregate, 2).counts.passed).toBe(2)
    expect(() => readBoundaryResult(aggregate, 3)).toThrow()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

it('rejects a missing or failed mandatory child instead of reporting aggregate success', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'cadet2-boundary-groups-'))
  try {
    const file = join(directory, 'fixture.test.mjs')
    await writeFile(
      file,
      "import { test } from 'node:test'\ntest('negative', () => { throw new Error('deliberate red') })\n",
    )
    const failed = join(directory, 'failed.json')
    captureBoundaryResult(file, failed, 'pipe')
    expect(() =>
      combineBoundaryResults(
        [{ file: failed, expectedTests: 1 }],
        join(directory, 'aggregate.json'),
      ),
    ).toThrow()
    expect(() =>
      combineBoundaryResults(
        [{ file: join(directory, 'missing.json'), expectedTests: 1 }],
        join(directory, 'aggregate.json'),
      ),
    ).toThrow()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
