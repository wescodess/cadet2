// @vitest-environment node
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { inspectAdminSources, sourceFiles } from '../../scripts/security/admin-surfaces.mjs'

const root = resolve(import.meta.dirname, '../..')

let directory
let fixtureSources

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'cadet2-guard-'))
  const trees = await Promise.all(
    ['app', 'server', 'convex'].map((name) => sourceFiles(join(root, name))),
  )
  const files = trees
    .flat()
    .filter(
      (path) =>
        /\.(ts|vue)$/.test(path) &&
        !(path.startsWith(`${join(root, 'convex')}/`) && path.includes('/_generated/')),
    )
  files.push(join(root, 'scripts/security/admin-surfaces.json'))
  await Promise.all(
    files.map(async (path) => {
      const target = join(directory, relative(root, path))
      await mkdir(dirname(target), { recursive: true })
      await copyFile(path, target)
    }),
  )
  fixtureSources = await inspectAdminSources(directory)
})

afterAll(async () => {
  if (directory) await rm(directory, { recursive: true, force: true })
})

it('classifies the actual source registrations', async () => {
  const actual = await inspectAdminSources(root)
  expect(actual.convex).toBeGreaterThan(0)
  expect(fixtureSources).toEqual(actual)
})

const mutations = [
  [
    'AI Search provider resurrection',
    'server/api/ai-search/query.post.ts',
    () => `import { requireAdminSession } from '../../utils/auth/requireAdminSession'
import { queryCloudflareAiSearch } from '../../utils/cloudflare-ai-search'
export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  return queryCloudflareAiSearch({ accountId: 'synthetic', apiToken: 'synthetic', instanceName: 'synthetic' }, { query: 'Synthetic', mode: 'search' })
})\n`,
    /Disabled AI Search provider reference/,
  ],
  [
    'default export',
    'convex/ragSources.ts',
    (text) =>
      `${text}\nexport default query({ args: {}, handler: async (ctx) => ctx.db.query('sources').collect() })`,
    /Unclassified Convex default export/,
  ],
  [
    'unguarded export',
    'convex/ragSources.ts',
    (text) =>
      `${text}\nexport const exposed = query({ args: {}, handler: async (ctx) => ctx.db.query('sources').collect() })`,
    /Unclassified Convex registration: ragSources:exposed/,
  ],
  [
    'export alias',
    'convex/ragSources.ts',
    (text) => `${text}\nexport const alias = listSources`,
    /Unclassified Convex export alias/,
  ],
  [
    'removed admission',
    'convex/ragSources.ts',
    (text) => text.replace('await requireRagAdmin(ctx)', '{ userId: "forged" }'),
    /Missing admin admission before reads: ragSources:getAdminStatus/,
  ],
  [
    'generic internal wrapper',
    'convex/ragSources.ts',
    (text) =>
      `${text}\nexport const arbitrary = mutation({ args: { name: v.string() }, handler: async (ctx, args) => ctx.runMutation(args.name, {}) })`,
    /Unclassified Convex registration: ragSources:arbitrary/,
  ],
  [
    'dormant ingestion import',
    'server/utils/dormant.ts',
    () =>
      "import { executePreparedBatchPhase3 } from './rag-ingestion-phase3'\nexport const dormant = () => executePreparedBatchPhase3\n",
    /Removed execution or bootstrap reference/,
  ],
  [
    'runtime demo DDL',
    'server/utils/pathways/pathwayDefinitionService.ts',
    (text) => `${text}\nconst ddl = 'CREATE TABLE demo (id text)'\n`,
    /Request-time initialization: pathwayDefinitionService/,
  ],
  [
    'internal visibility escape',
    'convex/ragIngestionInternal.ts',
    (text) => text.replace('= internalMutation(', '= query('),
    /Changed Convex visibility/,
  ],
]

it.each(mutations)(
  'rejects %s at the real source-manifest guard',
  async (_name, file, mutate, rejection) => {
    const path = join(directory, file)
    const previous = await readFile(path, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    try {
      await writeFile(path, mutate(previous ?? ''))
      await expect(inspectAdminSources(directory)).rejects.toThrow(rejection)
    } finally {
      if (previous === null) await rm(path)
      else await writeFile(path, previous)
    }
  },
)
