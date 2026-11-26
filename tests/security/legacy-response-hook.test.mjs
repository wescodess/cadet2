import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const h3Path = require.resolve('h3', { paths: [fileURLToPath(import.meta.resolve('nuxt'))] })
const { createApp, createError, defineEventHandler, setResponseStatus, toNodeListener } = require(
  h3Path,
)
const source = await readFile('server/plugins/private-errors.ts', 'utf8')
const compiled = ts.transpileModule(
  source
    .replace("from 'h3'", `from '${pathToFileURL(h3Path).href}'`)
    .replace(
      "import { defineNitroPlugin } from 'nitropack/runtime'",
      'const defineNitroPlugin = (plugin) => plugin',
    ),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } },
).outputText
const { default: plugin } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)
let beforeResponse
plugin({
  hooks: {
    hook(name, callback) {
      assert.equal(name, 'beforeResponse')
      beforeResponse = callback
    },
  },
})

for (const status of [200, 400, 404, 500]) {
  for (const format of ['web', 'h3', ...(status >= 400 ? ['thrown'] : [])]) {
    test(`error privacy: response hook preserves ${format} ${status} body and cookies`, async () => {
      const app = createApp({ onBeforeResponse: beforeResponse })
      app.use(
        defineEventHandler((event) => {
          if (format === 'thrown') {
            throw createError({ statusCode: status, statusMessage: 'Synthetic status' })
          }
          if (format === 'web') {
            const headers = new globalThis.Headers({ 'cache-control': 'public, max-age=600' })
            headers.append('set-cookie', 'first=one; Path=/; HttpOnly')
            headers.append('set-cookie', 'second=two; Path=/; SameSite=Lax')
            return new globalThis.Response('SYNTHETIC_ERROR_BODY', {
              status,
              statusText: 'Synthetic status',
              headers,
            })
          }
          setResponseStatus(event, status, 'Synthetic status')
          event.node.res.setHeader('cache-control', 'public, max-age=600')
          event.node.res.setHeader('set-cookie', [
            'first=one; Path=/; HttpOnly',
            'second=two; Path=/; SameSite=Lax',
          ])
          return 'SYNTHETIC_ERROR_BODY'
        }),
      )
      const server = createServer(toNodeListener(app))
      try {
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
        const response = await fetch(`http://127.0.0.1:${server.address().port}/`)
        assert.equal(response.status, status)
        assert.equal(response.statusText, 'Synthetic status')
        if (format === 'thrown') {
          assert.equal((await response.json()).statusCode, status)
        } else assert.equal(await response.text(), 'SYNTHETIC_ERROR_BODY')
        assert.equal(
          response.headers.get('cache-control'),
          status >= 400 ? 'private, no-store' : 'public, max-age=600',
        )
        assert.deepEqual(
          response.headers.getSetCookie(),
          format === 'thrown'
            ? []
            : ['first=one; Path=/; HttpOnly', 'second=two; Path=/; SameSite=Lax'],
        )
      } finally {
        await new Promise((resolve) => server.close(resolve))
      }
    })
  }
}
