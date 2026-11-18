import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'
import { rawRequest, retiredDotPaths, retiredEncodedBoundaryPaths } from './support/raw-paths.mjs'

const require = createRequire(import.meta.url)
const h3Path = require.resolve('h3', { paths: [fileURLToPath(import.meta.resolve('nuxt'))] })
const { createApp, defineEventHandler, toNodeListener } = require(h3Path)
const source = await readFile('server/middleware/retired-legacy-surfaces.ts', 'utf8')
const compiled = ts.transpileModule(
  source.replace("from 'h3'", `from '${pathToFileURL(h3Path).href}'`),
  {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
  },
).outputText
const { default: retirementGate } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)

test('test-only raw router canaries cannot be reached through dot segments or encoded boundaries', async (context) => {
  let effects = 0
  const canary = defineEventHandler(() => {
    effects += 1
    return 'RETIRED_ROUTER_CANARY'
  })
  const app = createApp().use(retirementGate)
  const control = createApp()
  for (const root of [
    '/workspace',
    '/api/workspace',
    '/api/intake',
    '/api/recommendations/runs',
    '/tasks',
  ]) {
    app.use(root, canary)
    control.use(root, canary)
  }
  app.use(defineEventHandler(() => 'public-entry'))
  control.use(defineEventHandler(() => 'public-entry'))
  const servers = [createServer(toNodeListener(app)), createServer(toNodeListener(control))]
  try {
    for (const server of servers)
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const [origin, controlOrigin] = servers.map(
      (server) => `http://127.0.0.1:${server.address().port}`,
    )
    for (const path of [...retiredDotPaths, ...retiredEncodedBoundaryPaths]) {
      await context.test(path, async () => {
        const before = effects
        const response = await rawRequest(origin, path)
        assert.equal(response.status, 404, path)
        assert.equal(response.headers['cache-control'], 'private, no-store', path)
        assert.equal(effects, before, 'no canary loader or effect')
      })
    }
    for (const path of [
      '/workspace/..',
      '/workspace/%2e%2e',
      '/workspace/.%2E',
      '/api/workspace/..',
      '/api/recommendations/runs/%2e%2e?runId=legacy-private-run',
      '/workspace\\..',
      '/workspace%5c..',
      '/workspace;x/..',
      '/workspace%00/..',
    ]) {
      const before = effects
      const response = await rawRequest(controlOrigin, path)
      assert.equal(response.status, 200)
      assert.equal(response.body, 'RETIRED_ROUTER_CANARY')
      assert.equal(effects, before + 1, 'the unguarded raw router reaches the canary')
    }
    assert.equal((await rawRequest(origin, '/auth')).body, 'public-entry')
  } finally {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
    )
  }
})

test('non-retired paths that share a retired prefix pass the gate', async () => {
  const app = createApp()
    .use(retirementGate)
    .use(defineEventHandler(() => 'public-entry'))
  const server = createServer(toNodeListener(app))
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  try {
    const origin = `http://127.0.0.1:${server.address().port}`
    for (const path of [
      '/workspaces-help',
      '/workspace-help',
      '/Workspace_Archive',
      '/tasks2',
      '/api/intake-status',
      '/api/recommendations/runs-summary',
      '/workspaces%2dhelp',
      '/tasks2%41',
      '/api/intake-status%2541',
    ]) {
      const response = await rawRequest(origin, path)
      assert.equal(response.status, 200, path)
      assert.equal(response.body, 'public-entry', path)
    }
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
  }
})
