// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as common from '../../scripts/quality/common.mjs'

const names = ['types', 'types-convex', 'lint', 'test-policy', 'format', 'secrets', 'dependencies']
const original = Object.fromEntries(
  names.map((name) => [
    `scripts/quality/baselines/${name}.json`,
    JSON.parse(readFileSync(`scripts/quality/baselines/${name}.json`, 'utf8')),
  ]),
)
let current, prior, completion, run, git, inventory
beforeEach(() => {
  vi.resetModules()
  current = globalThis.structuredClone(original)
  prior = globalThis.structuredClone(original)
  inventory = Object.keys(current)
  run = vi.fn((command, args) => ({
    status: 0,
    stdout: JSON.stringify(prior[args[1].slice('base:'.length)]),
    stderr: '',
  }))
  git = vi.fn((...args) => (args[0] === 'merge-base' ? 'base' : args.at(-1)))
  vi.doMock('../../scripts/quality/common.mjs', () => ({
    ...common,
    run,
    git,
    files: () => inventory,
    json: (path) => current[path],
    main: (fn) => {
      completion = Promise.resolve().then(fn)
    },
  }))
})
afterEach(() => {
  vi.doUnmock('../../scripts/quality/common.mjs')
  vi.unstubAllEnvs()
})
async function policy() {
  await import('../../scripts/quality/baseline-policy.mjs')
  return completion
}
const path = (name) => `scripts/quality/baselines/${name}.json`

describe('baseline policy public entry point', () => {
  it('accepts unchanged manifests and checks the integration merge-base', async () => {
    vi.stubEnv('QUALITY_BASE_REF', 'integration')
    await expect(policy()).resolves.toBeUndefined()
    expect(git.mock.calls[0]).toEqual(['merge-base', 'integration', 'HEAD'])
    expect(run).toHaveBeenCalledTimes(7)
  })
  it('accepts initial adoption when no prior manifests exist', async () => {
    git.mockImplementation((...args) => (args[0] === 'merge-base' ? 'base' : ''))
    await expect(policy()).resolves.toBeUndefined()
    expect(run).not.toHaveBeenCalled()
  })
  it('rejects inaccessible prior contents', async () => {
    run.mockReturnValue({ status: 1, stdout: '', stderr: 'missing baseline object' })
    await expect(policy()).rejects.toThrow(/missing baseline object/)
  })
  it('rejects unknown manifests', async () => {
    inventory.push(path('unknown'))
    await expect(policy()).rejects.toThrow(/Unknown baseline manifest/)
  })
  it.each(['types', 'types-convex', 'lint', 'test-policy'])(
    'allows reductions but rejects increases for %s',
    async (name) => {
      const key = Object.keys(current[path(name)].counts)[0]
      current[path(name)].counts[key] += 1
      await expect(policy()).rejects.toThrow(/Baseline count increased/)
    },
  )
  it('accepts reductions and removals across every manifest kind', async () => {
    for (const name of ['types', 'types-convex', 'lint', 'test-policy']) {
      for (const key of Object.keys(current[path(name)].counts)) current[path(name)].counts[key] = 0
    }
    current[path('format')] = {}
    current[path('secrets')] = []
    current[path('dependencies')] = { advisories: {}, licenses: {} }
    await expect(policy()).resolves.toBeUndefined()
  })
  it('rejects an added count key', async () => {
    current[path('types')].counts['nuxt.config.ts|TS9999'] = 1
    await expect(policy()).rejects.toThrow(/Baseline entry added/)
  })
  it('rejects a replaced format hash', async () => {
    current[path('format')][Object.keys(current[path('format')])[0]] = 'sha256:' + '0'.repeat(64)
    await expect(policy()).rejects.toThrow(/Baseline value changed/)
  })
  it('rejects an added secret digest', async () => {
    current[path('secrets')].push('fixture|fixture.ts|' + '0'.repeat(64))
    await expect(policy()).rejects.toThrow(/Baseline increased/)
  })
  it.each(['paths', 'expires', 'reason'])(
    'rejects dependency allowance changes to %s',
    async (key) => {
      const entry = Object.values(current[path('dependencies')].advisories)[0]
      if (key === 'paths') entry.paths.push('new > path')
      else entry[key] = key === 'expires' ? '2028-01-16' : 'changed reason'
      await expect(policy()).rejects.toThrow(/Baseline (?:value changed|entry added|increased)/)
    },
  )
  it.each([
    [
      'unknown key',
      (value) => {
        value.extra = true
      },
    ],
    [
      'missing counts',
      (value) => {
        delete value.counts
      },
    ],
    [
      'invalid day',
      (value) => {
        value.date = '2026-02-30'
      },
    ],
    [
      'invalid month',
      (value) => {
        value.date = '2026-13-01'
      },
    ],
    [
      'invalid spelling',
      (value) => {
        value.date = '2026-1-01'
      },
    ],
    [
      'empty date',
      (value) => {
        value.date = ''
      },
    ],
    [
      'wrong commit',
      (value) => {
        value.commit = 'other'
      },
    ],
    [
      'negative count',
      (value) => {
        value.counts['nuxt.config.ts|TS2322'] = -1
      },
    ],
    [
      'fraction count',
      (value) => {
        value.counts['nuxt.config.ts|TS2322'] = 0.5
      },
    ],
    [
      'invalid diagnostic key',
      (value) => {
        value.counts['nuxt.config.ts'] = 1
      },
    ],
  ])('rejects malformed current and prior schema: %s', async (_name, change) => {
    change(current[path('types')])
    await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
  })
  it('validates prior schemas independently', async () => {
    prior[path('types')].extra = true
    await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
  })
  it.each(['', ' ', 'file', 'file.ts|extra'])('rejects invalid format paths "%s"', async (file) => {
    current[path('format')][file] = 'sha256:' + '0'.repeat(64)
    await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
  })
})

describe('baseline manifest boundaries', () => {
  it('uses origin/dev by default and ignores ordinary repository files', async () => {
    vi.stubEnv('QUALITY_BASE_REF', '')
    inventory.push('README.md')
    await expect(policy()).resolves.toBeUndefined()
    expect(git.mock.calls[0]).toEqual(['merge-base', 'origin/dev', 'HEAD'])
    expect(git.mock.calls[1]).toEqual(['ls-tree', '--name-only', 'base', '--', path('types')])
    expect(run.mock.calls[0]).toEqual(['git', ['show', `base:${path('types')}`]])
  })
  it.each(['', ' '])('rejects a blank dependency allowance reason "%s"', async (reason) => {
    Object.values(current[path('dependencies')].advisories)[0].reason = reason
    await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
  })
  it.each([
    ['types', 'file.ts|TS2322suffix'],
    ['types', '\nfile.ts|TS2322'],
    ['types', 'file.ts|TS2322\n'],
    ['types-convex', 'prefixconvex/file.ts|TS2322'],
    ['types-convex', 'convex/file.ts|TS2322suffix'],
    ['lint', '\nfile.ts|rule'],
    ['lint', 'file.ts|'],
    ['lint', 'file.ts|rule|'],
  ])('rejects malformed %s diagnostic key %s', async (name, key) => {
    current[path(name)].counts = { [key]: 1 }
    await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
  })
  it.each(['prefixsha256:' + '0'.repeat(64), 'sha256:' + '0'.repeat(64) + 'suffix'])(
    'rejects an unanchored format digest %s',
    async (digest) => {
      current[path('format')] = { 'file.ts': digest }
      await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
    },
  )
  it('rejects an extra suffix in secret digest identities', async () => {
    current[path('secrets')] = ['rule|file.ts|' + '0'.repeat(64) + 'suffix']
    await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
  })
})

describe('secret identity anchoring', () => {
  it('rejects a leading empty secret identity segment', async () => {
    current[path('secrets')] = ['|rule|file.ts|' + '0'.repeat(64)]
    await expect(policy()).rejects.toThrow(/Invalid baseline schema/)
  })
})
