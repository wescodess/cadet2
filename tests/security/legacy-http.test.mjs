import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { request } from 'node:http'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { createStack } from './support/stack.mjs'

let stack
before(
  async () => {
    stack = await createStack()
  },
  { timeout: 240_000 },
)
after(async () => {
  await stack?.close()
})

const pages = [
  '/workspace',
  '/workspace/intake',
  '/workspace/recommendations',
  '/workspace/recommendations/legacy-private-run',
  '/workspace/recommendations/legacy-private-run/pathways/private-pathway-canary',
  '/workspace/history',
  '/workspace/compare',
  '/workspace/settings',
  '/workspace/unknown',
  '/tasks',
]
const apis = [
  '/api/workspace',
  '/api/workspace/me',
  '/api/workspace/summary',
  '/api/workspace/recommendation-runs',
  '/api/workspace/runs',
  '/api/workspace/runs/legacy-private-run',
  '/api/workspace/runs/compare',
  '/api/workspace/unknown',
  '/api/intake',
  '/api/intake/draft',
  '/api/intake/submit',
  '/api/intake/unknown',
  '/api/recommendations/runs',
  ...['status', 'pathways', 'results', 'start', 'refresh', 'unknown'].map(
    (operation) => `/api/recommendations/runs/legacy-private-run/${operation}`,
  ),
]
const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

for (const path of [...pages, ...apis]) {
  test(`${path} is unavailable to every caller and method`, async () => {
    const failures = []
    const before = await stack.observations()
    for (const actor of stack.actors) {
      for (const method of methods) {
        const response = await fetch(
          `${stack.origin}${path}?runId=legacy-private-run&sourceRunId=legacy-private-run&runA=legacy-private-run&runB=foreign-run&force=true&mode=mock-completed`,
          {
            method,
            headers: { cookie: actor.cookie, accept: 'application/json' },
            redirect: 'manual',
          },
        )
        const body = await response.text()
        if (response.status !== 404) failures.push(`${actor.role} ${method}: ${response.status}`)
        assert.equal(response.headers.get('cache-control'), 'private, no-store')
        assert.equal(
          response.headers.get('location'),
          null,
          'no guessed Signed plan or auth redirect',
        )
        assert.doesNotMatch(
          body,
          /PRIVATE_UNSIGNED_RESULT_CANARY|PRIVATE_AUDIT_CANARY|profileSnapshotId|recommendationResults|"rank"|"score"/,
        )
      }
    }
    assert.deepEqual(failures, [])
    assert.equal(
      await stack.observations(),
      before,
      'no private SQL read/write, backend call or provider attempt',
    )
  })
}

test('SSR payloads, encoded paths and prefetches cannot reach a retired loader', async () => {
  const before = await stack.observations()
  const paths = [
    ...pages.map((path) => `${path}/_payload.json`),
    '/WORKSPACE/HISTORY',
    '/%77orkspace/recommendations/legacy-private-run',
    '/workspace%2frecommendations%2flegacy-private-run',
    '/workspace/%',
    '/workspace/',
    '/api/%77orkspace/summary',
    '/api/workspace%2fruns',
    '/api/INTAKE/DRAFT',
    '/api/intake/',
    '/api/recommendations/%72uns/legacy-private-run/start',
  ]
  for (const path of paths) {
    for (const actor of stack.actors) {
      const response = await fetch(`${stack.origin}${path}`, {
        headers: { cookie: actor.cookie, accept: 'text/html', purpose: 'prefetch' },
        redirect: 'manual',
      })
      assert.equal(response.status, 404, `${actor.role} ${path}`)
      assert.equal(response.headers.get('cache-control'), 'private, no-store')
      assert.doesNotMatch(await response.text(), /__NUXT_DATA__|PRIVATE_UNSIGNED_RESULT_CANARY/)
    }
  }
  assert.equal(await stack.observations(), before)
})

test('JSON, malformed bodies and extension methods are rejected before reading input', async () => {
  const before = await stack.observations()
  for (const path of apis) {
    for (const body of [
      '{',
      JSON.stringify({
        runId: stack.fixtureRun.runId,
        userId: stack.owner.id,
        sourceRunId: stack.fixtureRun.runId,
        force: true,
        mode: 'standard',
      }),
    ]) {
      const response = await fetch(`${stack.origin}${path}`, {
        method: 'POST',
        headers: { cookie: stack.owner.cookie, 'content-type': 'application/json' },
        body,
      })
      assert.equal(response.status, 404, path)
      await response.arrayBuffer()
    }
  }
  for (const path of [...pages, ...apis]) {
    for (const method of ['TRACE', 'PROPFIND']) {
      await new Promise((resolve, reject) => {
        const req = request(
          `${stack.origin}${path}`,
          { method, headers: { cookie: stack.owner.cookie } },
          (response) => {
            response.resume()
            response.on('end', () => {
              try {
                assert.equal(response.statusCode, 404, `${method} ${path}`)
                resolve()
              } catch (error) {
                reject(error)
              }
            })
          },
        )
        req.on('error', reject)
        req.end()
      })
    }
  }
  assert.equal(await stack.observations(), before)
})

test('the shipped browser chunks contain no legacy navigation, polling or automatic starts', async () => {
  const directory = '.output/public/_nuxt'
  const files = (await readdir(directory)).filter((file) => file.endsWith('.js'))
  assert.ok(files.length > 0, 'actual built browser chunks')
  for (const file of files) {
    const source = await readFile(join(directory, file), 'utf8')
    assert.doesNotMatch(
      source,
      /\/api\/workspace\/|\/api\/intake\/|\/api\/recommendations\/runs\/|\/workspace\/recommendations/,
      file,
    )
  }
})

test('public entry preserves authentication without advertising retired navigation', async () => {
  const response = await fetch(stack.origin)
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /href="\/auth"/)
  assert.doesNotMatch(html, /href="\/(?:workspace|tasks)(?:["/?])/)
})

test('real sign-in, session and backend admission still work after denied requests', async () => {
  for (const user of stack.users) {
    const response = await fetch(`${stack.origin}/api/auth/get-session`, {
      headers: { cookie: user.cookie },
    })
    assert.equal((await response.json()).user.id, user.id)
  }
  assert.equal(
    (await stack.clientFor(stack.admin).query('ragSources:getAdminStatus', {})).currentUserIsAdmin,
    true,
  )
})
