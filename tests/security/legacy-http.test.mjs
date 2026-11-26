import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { request } from 'node:http'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { createStack } from './support/stack.mjs'
import { rawRequest, retiredDotPaths, retiredEncodedBoundaryPaths } from './support/raw-paths.mjs'

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

test('error privacy: Client and admin sessions are live', async () => {
  for (const actor of [stack.owner, stack.admin]) {
    const response = await fetch(`${stack.origin}/api/auth/get-session`, {
      headers: { cookie: actor.cookie },
    })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).user.id, actor.id)
  }
})

for (const role of ['own-client', 'admin']) {
  for (const [path, method, status] of [
    ['/api/auth/does-not-exist', 'GET', 404],
    ['/api/auth/sign-in/email', 'POST', 400],
    ['/api/auth/sign-up/email', 'POST', 400],
  ]) {
    test(`error privacy: returned ${role} ${method} ${path}`, async () => {
      const actor = stack.actors.find((candidate) => candidate.role === role)
      const response = await fetch(`${stack.origin}${path}`, {
        method,
        redirect: 'manual',
        headers: {
          cookie: actor.cookie,
          accept: 'text/html',
          origin: stack.origin,
          ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
        },
        ...(method === 'POST' ? { body: '{}' } : {}),
      })
      const body = await response.text()
      assert.equal(response.status, status, body)
      if (method === 'GET') assert.equal(body, '')
      else {
        assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json')
        assert.equal(JSON.parse(body).code, 'VALIDATION_ERROR')
        assert.match(JSON.parse(body).message, /body.email/)
      }
      assert.equal(response.headers.get('cache-control'), 'private, no-store')
      const session = await fetch(`${stack.origin}/api/auth/get-session`, {
        headers: { cookie: actor.cookie },
      })
      assert.equal((await session.json()).user.id, actor.id, 'error preserves the live session')
    })
  }
  for (const host of ['[', 'bad host', 'localhost:bad']) {
    for (const path of ['/does-not-exist', '/api/does-not-exist']) {
      test(`error privacy: malformed authority ${role} ${host} ${path}`, async () => {
        const actor = stack.actors.find((candidate) => candidate.role === role)
        const response = await rawRequest(stack.origin, path, {
          cookie: actor.cookie,
          accept: 'text/html',
          host,
        })
        assert.equal(response.status, 500)
        assert.equal(response.headers['cache-control'], 'private, no-store')
        assert.equal(response.headers['content-type']?.split(';')[0], 'application/json')
        assert.deepEqual(JSON.parse(response.body), {
          error: true,
          statusCode: 500,
          statusMessage: 'Server Error',
          message: 'Server Error',
        })
        assert.ok(!response.body.includes(actor.id))
      })
    }
  }
}

for (const path of [
  '/api',
  '/api/',
  '/API/does-not-exist',
  '/apix/does-not-exist',
  '/%ZZ',
  '/api/%ZZ',
]) {
  test(`error privacy: default-base classification ${path}`, async () => {
    const response = await rawRequest(stack.origin, path, {
      cookie: stack.owner.cookie,
      accept: 'text/html',
    })
    assert.equal(response.status, path.includes('%ZZ') ? 400 : 404)
    assert.equal(response.headers['cache-control'], 'private, no-store')
    const json = path !== '/apix/does-not-exist' && path !== '/%ZZ'
    assert.equal(
      response.headers['content-type']?.split(';')[0],
      json ? 'application/json' : 'text/html',
    )
    if (json) {
      assert.equal(JSON.parse(response.body).statusCode, response.status)
      assert.doesNotMatch(response.body, /__NUXT_DATA__|\$sauth/)
    } else assert.match(response.body, /__NUXT_DATA__/)
  })
}

for (const role of ['own-client', 'admin']) {
  for (const path of [
    '/./api/admin/does-not-exist',
    '/%2e/api/admin/does-not-exist',
    '/x/../api/admin/does-not-exist',
    '/x/%2E%2E/api/does-not-exist',
    '//api/does-not-exist',
    '/\\api/admin/does-not-exist',
    '//\\api/admin/does-not-exist',
    '/\\/api/admin/does-not-exist',
    '/\\\\API/does-not-exist',
    '/\\api',
    '/x/../does-not-exist',
  ]) {
    test(`error privacy: non-canonical target ${role} ${path}`, async () => {
      const actor = stack.actors.find((candidate) => candidate.role === role)
      const response = await rawRequest(stack.origin, path, {
        cookie: actor.cookie,
        accept: 'text/html',
      })
      assert.equal(response.status, 404)
      assert.equal(response.headers['cache-control'], 'private, no-store')
      assert.equal(response.headers['content-type']?.split(';')[0], 'application/json')
      assert.equal(JSON.parse(response.body).statusCode, 404)
      assert.doesNotMatch(response.body, /__NUXT_DATA__|\$sauth/)
      assert.ok(!response.body.includes(actor.id))
    })
  }
}

for (const role of ['own-client', 'admin', 'anonymous']) {
  for (const path of [
    '/does-not-exist',
    '/api/does-not-exist',
    '/api/admin/does-not-exist',
    '/api/admin/pathways/does-not-exist',
  ]) {
    for (const accept of ['text/html', 'application/json', '*/*']) {
      test(`error privacy: ${role} ${path} Accept ${accept}`, async () => {
        const actor = stack.actors.find((candidate) => candidate.role === role)
        const response = await fetch(`${stack.origin}${path}`, {
          headers: { cookie: actor.cookie, accept },
          redirect: 'manual',
        })
        const body = await response.text()
        const api = path.startsWith('/api/')
        const denied = path === '/api/admin/pathways/does-not-exist' && role !== 'admin'
        const status = denied ? (role === 'anonymous' ? 401 : 403) : 404
        const json = api || accept !== 'text/html'
        assert.deepEqual(
          {
            status: response.status,
            cacheControl: response.headers.get('cache-control'),
            contentType: response.headers.get('content-type')?.split(';')[0],
            privateApiData:
              api && /\$sauth|__NUXT_DATA__|session|profile|currentUser|PRIVATE_/.test(body),
            actorInApi: api && Boolean(actor.id) && body.includes(actor.id),
          },
          {
            status,
            cacheControl: 'private, no-store',
            contentType: json ? 'application/json' : 'text/html',
            privateApiData: false,
            actorInApi: false,
          },
        )
        if (json) {
          const error = JSON.parse(body)
          assert.equal(error.statusCode, status)
          assert.equal(typeof error.message, 'string')
        } else {
          assert.match(body, /__NUXT_DATA__/)
        }
      })
    }
  }
}

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

test('both review readers remain unavailable with or without operator credentials', async (context) => {
  await stack.restartApp({ CONVEX_ADMIN_KEY: '', CONVEX_DEPLOY_KEY: '' })
  try {
    for (const suffix of ['', `/${stack.fixtureRun.runId}`]) {
      await context.test(suffix || 'list', async () => {
        const response = await fetch(`${stack.origin}/api/admin/recommendation-reviews${suffix}`, {
          headers: { cookie: stack.admin.cookie },
        })
        assert.equal(response.status, 503, await response.text())
      })
    }
  } finally {
    await stack.restartApp()
  }
  for (const suffix of ['', `/${stack.fixtureRun.runId}`]) {
    const response = await fetch(`${stack.origin}/api/admin/recommendation-reviews${suffix}`, {
      headers: { cookie: stack.admin.cookie },
    })
    assert.equal(response.status, 503)
    assert.doesNotMatch(
      await response.text(),
      /PRIVATE_UNSIGNED_RESULT_CANARY|recommendationResults/,
    )
  }
  const access = await fetch(`${stack.origin}/api/admin/access`, {
    headers: { cookie: stack.admin.cookie },
  })
  assert.equal(access.status, 200, 'reviewed admin admission remains available')
})

test('review boundaries consistently require a stored grant before reads or actions', async (context) => {
  const root = `/api/admin/recommendation-reviews/${stack.fixtureRun.runId}`
  const citationId = 'legacy-private-citation'
  const routes = [
    ['GET', '/api/admin/access'],
    ['GET', '/api/admin/recommendation-reviews'],
    ['GET', root],
    ['GET', `${root}/citations`],
    ['POST', `${root}/citations/${encodeURIComponent(citationId)}/flag`],
    ...['flag', 'dismiss', 'resolve'].map((action) => ['POST', `${root}/${action}`]),
  ]
  const allowlistOnly = stack.users.find((user) => user.role === 'ordinary')
  await assert.rejects(
    stack.clientFor(allowlistOnly).query('ragSources:getAdminStatus', {}),
    /Admin access required/,
  )
  for (const [method, path] of routes) {
    await context.test(`${method} ${path}`, async () => {
      const before = await stack.observations()
      const denied = await fetch(`${stack.origin}${path}`, {
        method,
        headers: {
          cookie: allowlistOnly.cookie,
          'content-type': 'application/json',
          origin: stack.origin,
        },
        ...(method === 'POST'
          ? { body: JSON.stringify({ reason: 'Synthetic boundary probe' }) }
          : {}),
      })
      assert.equal(denied.status, 403, await denied.text())
      const attempts = (await stack.observations()).slice(before.length)
      assert.doesNotMatch(attempts, /private-sql|\/api\/mutation/)
      const admittedBefore = await stack.observations()
      const allowed = await fetch(`${stack.origin}${path}`, {
        method,
        headers: {
          cookie: stack.admin.cookie,
          'content-type': 'application/json',
          origin: stack.origin,
        },
        ...(method === 'POST'
          ? { body: JSON.stringify({ reason: 'Synthetic admin positive control' }) }
          : {}),
      })
      assert.equal(allowed.status, path === '/api/admin/access' ? 200 : 503, await allowed.text())
      assert.doesNotMatch(
        (await stack.observations()).slice(admittedBefore.length),
        /private-sql|\/api\/mutation/,
      )
    })
  }
})

test('raw dot-segment and encoded-boundary requests stop before routing, including mixed-case forms', async () => {
  const before = await stack.observations()
  for (const path of [...retiredDotPaths, ...retiredEncodedBoundaryPaths]) {
    for (const actor of stack.actors) {
      const response = await rawRequest(stack.origin, path, { cookie: actor.cookie })
      assert.equal(response.status, 404, `${actor.role} ${path}`)
      assert.equal(response.headers['cache-control'], 'private, no-store', path)
      assert.doesNotMatch(response.body, /__NUXT_DATA__|PRIVATE_UNSIGNED_RESULT_CANARY/)
    }
  }
  assert.equal(await stack.observations(), before)
})
