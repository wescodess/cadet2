import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, before, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { command, freePort, ready, start, stop } from './support/processes.mjs'
import { rawRequest } from './support/raw-paths.mjs'

let directory
let app
let origin
before(
  async () => {
    directory = await mkdtemp(join(tmpdir(), 'cadet2-baseurl-'))
    const output = join(directory, 'output')
    const layer = join(directory, 'layer')
    await mkdir(layer)
    await writeFile(
      join(layer, 'nuxt.config.ts'),
      `export default ${JSON.stringify({
        buildDir: join(directory, 'build'),
        nitro: {
          output: {
            dir: output,
            serverDir: join(output, 'server'),
            publicDir: join(output, 'public'),
          },
        },
        hub: { dir: join(directory, 'hub') },
      })}`,
    )
    await command(
      process.execPath,
      [resolve('node_modules/nuxt/bin/nuxt.mjs'), 'build', '--extends', layer],
      {
        env: { ...process.env, NODE_ENV: 'production', NUXT_APP_BASE_URL: '/cadet/' },
        timeout: 210_000,
      },
    )
    const sql = join(directory, '.data/db/pglite-dev')
    await mkdir(sql, { recursive: true })
    const database = new PGlite(sql)
    try {
      for (const name of (await readdir('server/db/migrations/postgresql'))
        .filter((name) => name.endsWith('.sql'))
        .sort()) {
        await database.exec(await readFile(join('server/db/migrations/postgresql', name), 'utf8'))
      }
    } finally {
      await database.close()
    }
    origin = `http://127.0.0.1:${await freePort()}`
    app = start(process.execPath, [resolve(output, 'server/index.mjs')], {
      cwd: directory,
      env: {
        ...process.env,
        NUXT_APP_BASE_URL: '/cadet/',
        CONVEX_URL: '',
        CONVEX_ADMIN_KEY: '',
        NUXT_PUBLIC_SITE_URL: origin,
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: new URL(origin).port,
      },
    })
    await ready(`${origin}/cadet/auth`, app)
  },
  { timeout: 240_000 },
)
after(async () => {
  await stop(app)
  if (directory) await rm(directory, { recursive: true, force: true })
})

for (const [path, status, contentType] of [
  ['/cadet/api/does-not-exist', 404, 'application/json'],
  ['/cadet/api', 404, 'application/json'],
  ['/cadet/api/', 404, 'application/json'],
  ['/cadet/API/does-not-exist', 404, 'application/json'],
  ['/cadet/api/admin/pathways/does-not-exist', 503, 'application/json'],
  ['/cadet/apix/does-not-exist', 404, 'text/html'],
  ['/api/does-not-exist', 302, null],
]) {
  test(`error privacy: non-root build ${path}`, async () => {
    const response = await rawRequest(origin, path, { accept: 'text/html' })
    assert.equal(response.status, status)
    assert.equal(response.headers['cache-control'], 'private, no-store')
    if (contentType) assert.equal(response.headers['content-type']?.split(';')[0], contentType)
    if (contentType === 'application/json') {
      assert.equal(JSON.parse(response.body).statusCode, status)
      assert.doesNotMatch(response.body, /__NUXT_DATA__|\$sauth/)
    } else if (contentType === 'text/html') assert.match(response.body, /__NUXT_DATA__/)
    else assert.equal(response.headers.location, '/cadet/api/does-not-exist')
  })
}
