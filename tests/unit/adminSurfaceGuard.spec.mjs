// @vitest-environment node
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it } from 'vitest'
import { inspectAdminSources } from '../../scripts/security/admin-surfaces.mjs'

const root = resolve(import.meta.dirname, '../..')

it('classifies the actual source registrations', () => {
  expect(inspectAdminSources(root).convex).toBeGreaterThan(0)
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
  ],
  [
    'default export',
    'convex/ragSources.ts',
    (text) =>
      `${text}\nexport default query({ args: {}, handler: async (ctx) => ctx.db.query('sources').collect() })`,
  ],
  [
    'unguarded export',
    'convex/ragSources.ts',
    (text) =>
      `${text}\nexport const exposed = query({ args: {}, handler: async (ctx) => ctx.db.query('sources').collect() })`,
  ],
  ['export alias', 'convex/ragSources.ts', (text) => `${text}\nexport const alias = listSources`],
  [
    'removed admission',
    'convex/ragSources.ts',
    (text) => text.replace('await requireRagAdmin(ctx)', '{ userId: "forged" }'),
  ],
  [
    'generic internal wrapper',
    'convex/ragSources.ts',
    (text) =>
      `${text}\nexport const arbitrary = mutation({ args: { name: v.string() }, handler: async (ctx, args) => ctx.runMutation(args.name, {}) })`,
  ],
  [
    'dormant ingestion import',
    'server/utils/dormant.ts',
    () =>
      "import { executePreparedBatchPhase3 } from './rag-ingestion-phase3'\nexport const dormant = () => executePreparedBatchPhase3\n",
  ],
  [
    'runtime demo DDL',
    'server/utils/pathways/pathwayDefinitionService.ts',
    (text) => `${text}\nconst ddl = 'CREATE TABLE demo (id text)'\n`,
  ],
  [
    'internal visibility escape',
    'convex/ragIngestionInternal.ts',
    (text) => text.replace('= internalMutation(', '= query('),
  ],
]

it.each(mutations)('rejects %s at the real source-manifest guard', async (_name, file, mutate) => {
  const directory = await mkdtemp(join(tmpdir(), 'cadet2-guard-'))
  try {
    for (const name of ['app', 'server', 'convex']) {
      await cp(join(root, name), join(directory, name), { recursive: true })
    }
    await mkdir(join(directory, 'scripts/security'), { recursive: true })
    await cp(
      join(root, 'scripts/security/admin-surfaces.json'),
      join(directory, 'scripts/security/admin-surfaces.json'),
    )
    const path = join(directory, file)
    const previous = await readFile(path, 'utf8').catch(() => '')
    await writeFile(path, mutate(previous))
    expect(() => inspectAdminSources(directory)).toThrow()
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
