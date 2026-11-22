// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { parse } from '../../scripts/quality/convex-authority.parser.mjs'
import { digestJSON } from '../../scripts/quality/convex-authority-inputs.mjs'
import { authorityReceiptFixture } from '../support/quality-authority-fixture.mjs'

vi.setConfig({ hookTimeout: 30000 })
let fixture, genuine, binding
beforeAll(() => {
  ;({ fixture, genuine, binding } = authorityReceiptFixture())
})
afterAll(() => fixture?.remove())
function consume(receipt, status = 0) {
  return parse({ status, stdout: JSON.stringify(receipt) }, binding)
}
function changed(mutate) {
  const receipt = JSON.parse(JSON.stringify(genuine))
  mutate(receipt)
  receipt.closureDigest = digestJSON({
    modules: receipt.modules,
    edges: receipt.edges,
    claims: receipt.claims,
  })
  return receipt
}
it('accepts a genuine source-bound worker receipt with an independent named-export oracle', () => {
  expect(consume(genuine).claims).toEqual([
    { file: 'convex/functions.ts', name: 'named', kind: 'query' },
  ])
})
const mutations = [
  [
    'generated mapping without a registrar role',
    (r) => {
      const generated = r.modules.find((m) => m.file === 'convex/_generated/server.js')
      generated.bindings.find((binding) => binding.name === 'query').role = 'data'
      generated.exports.find((entry) => entry.name === 'query').role = 'data'
    },
  ],
  [
    'empty closure',
    (r) => {
      r.modules = []
      r.edges = []
      r.claims = []
      r.sources = []
    },
  ],
  [
    'omitted helper',
    (r) => {
      r.modules = r.modules.filter((m) => m.file !== 'shared/helper.ts')
    },
  ],
  [
    'omitted binding',
    (r) => {
      r.modules.find((m) => m.file === 'convex/functions.ts').bindings.pop()
    },
  ],
  [
    'omitted reference',
    (r) => {
      r.modules.find((m) => m.file === 'convex/functions.ts').references.pop()
    },
  ],
  [
    'omitted initializer statement',
    (r) => {
      r.modules[0].statements.pop()
    },
  ],
  [
    'omitted platform',
    (r) => {
      r.platforms = []
    },
  ],
  [
    'omitted generated mapping',
    (r) => {
      r.modules.find((m) => m.file === 'convex/_generated/server.js').generated.pop()
    },
  ],
  [
    'external resolution',
    (r) => {
      r.edges.find((edge) => edge.runtime).resolution.external = true
    },
  ],
  [
    'foreign resolution namespace',
    (r) => {
      r.edges.find((edge) => edge.runtime).resolution.namespace = 'virtual'
    },
  ],
  [
    'omitted absence witness',
    (r) => {
      r.witnesses = r.witnesses.filter((w) => w.present)
    },
  ],
  [
    'duplicate module',
    (r) => {
      r.modules.push(r.modules[0])
    },
  ],
  [
    'extra claim',
    (r) => {
      r.claims.push({ file: 'shared/helper.ts', name: 'work', kind: 'query' })
    },
  ],
  [
    'unknown nested key',
    (r) => {
      r.modules[0].bindings[0].unknown = true
    },
  ],
  [
    'stale run',
    (r) => {
      r.nonce = '00000000-0000-4000-8000-000000000000'
    },
  ],
  [
    'stale source',
    (r) => {
      r.sources[0].identity.sha256 = '0'.repeat(64)
    },
  ],
  [
    'different options',
    (r) => {
      r.options.conditions = ['module', 'convex']
    },
  ],
  [
    'different SDK identity',
    (r) => {
      r.sdk[0].root += '-foreign'
    },
  ],
  [
    'different SDK leaf',
    (r) => {
      r.sdkBindings[0].leaf.start++
    },
  ],
  [
    'wrong exported declaration span',
    (r) => {
      r.modules.find((m) => m.file === 'convex/functions.ts').exports[0].declaration.start++
    },
  ],
  [
    'unprotected registrar',
    (r) => {
      r.modules
        .find((m) => m.file === 'convex/functions.ts')
        .bindings.find((b) => b.name === 'ask').protected = false
    },
  ],
  [
    'ordinary value masquerading as a claimed declaration',
    (r) => {
      const m = r.modules.find((m) => m.file === 'convex/functions.ts')
      m.bindings.find((b) => b.name === 'named').role = 'data'
      m.exports.find((e) => e.name === 'named').role = 'data'
    },
  ],
  [
    'wrong imported helper role',
    (r) => {
      r.modules
        .find((m) => m.file === 'convex/functions.ts')
        .bindings.find((b) => b.name === 'work').role = 'data'
    },
  ],
  [
    'unrooted helper chain',
    (r) => {
      r.modules.find((m) => m.file === 'shared/helper.ts').chain = ['shared/helper.ts']
    },
  ],
]
it.each(mutations)('rejects a coherently digested receipt with %s', (_, mutate) => {
  expect(() => consume(changed(mutate))).toThrow(/receipt_incomplete/)
})
it.each(['', '{', '{"status":"ok"}', 'null'])(
  'rejects malformed or partial output %s',
  (stdout) => {
    expect(() => parse({ status: 0, stdout }, binding)).toThrow(/receipt_incomplete/)
  },
)
it('rejects exit mismatches and an error receipt carrying partial success', () => {
  expect(() => consume(genuine, 1)).toThrow(/exit mismatch/)
  const error = {
    schemaVersion: 1,
    proof: 'declaration_convention_v1',
    nonce: binding.nonce,
    snapshotDigest: binding.snapshot.digest,
    status: 'error',
    errors: [
      {
        file: 'convex/functions.ts',
        code: 'value_role',
        detail: 'controlled error',
        chain: ['convex/functions.ts'],
      },
    ],
  }
  expect(() => consume(error, 0)).toThrow(/exit mismatch/)
  expect(() => consume({ ...error, claims: genuine.claims }, 1)).toThrow(/receipt_incomplete/)
  expect(() => consume(error, 1)).toThrow(/value_role controlled error/)
})
