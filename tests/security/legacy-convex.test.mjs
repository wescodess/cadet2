import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createStack } from './support/stack.mjs'

let stack
let snapshot
let eventId
async function storedState() {
  const tables = {}
  for (const table of ['recommendation_runs', 'auditLog']) {
    const { stdout } = await stack.convex('data', table, '--format', 'json', '--order', 'asc')
    tables[table] = JSON.parse(stdout || '[]')
  }
  return tables
}

before(
  async () => {
    stack = await createStack()
    snapshot = await storedState()
    eventId = snapshot.auditLog[0]._id
  },
  { timeout: 240_000 },
)
after(async () => {
  await stack?.close()
})

test('an admitted admin still reads governance review through the real HTTP guard', async () => {
  const response = await fetch(`${stack.origin}/api/admin/recommendation-reviews`, {
    headers: { cookie: stack.admin.cookie },
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.ok(
    JSON.stringify(body).includes(stack.fixtureRun.runId),
    'the actual fixture is returned, not fallback emptiness',
  )
  const detail = await fetch(
    `${stack.origin}/api/admin/recommendation-reviews/${stack.fixtureRun.runId}`,
    { headers: { cookie: stack.admin.cookie } },
  )
  assert.equal(detail.status, 200)
  assert.equal((await detail.json()).run.runId, stack.fixtureRun.runId)
  assert.equal(
    (await stack.clientFor(stack.admin).query('ragSources:getAdminStatus', {})).currentUserIsAdmin,
    true,
  )
  assert.match(
    await stack.observations(),
    /private-sql query/,
    'the observer sees an admitted real private SQL read',
  )
  assert.match(
    await stack.observations(),
    /fetch .*\/api\/query/,
    'the observer sees the admitted real backend call',
  )
})

test('anonymous and ordinary sessions cannot use the preserved admin HTTP readers', async () => {
  for (const actor of stack.actors.filter((actor) => actor.role !== 'admin')) {
    for (const path of [
      '/api/admin/recommendation-reviews',
      `/api/admin/recommendation-reviews/${stack.fixtureRun.runId}`,
    ]) {
      const response = await fetch(`${stack.origin}${path}`, { headers: { cookie: actor.cookie } })
      assert.equal(response.status, actor.role === 'anonymous' ? 401 : 403, `${actor.role} ${path}`)
      assert.doesNotMatch(
        await response.text(),
        /PRIVATE_UNSIGNED_RESULT_CANARY|recommendationResults/,
      )
    }
  }
})

function registrations() {
  const target = { userId: stack.owner.id, runId: stack.fixtureRun.runId }
  const snapshotTarget = { ...target, profileSnapshotId: stack.fixtureRun.profileSnapshotId }
  return [
    ['recommendationRuns:listForUser', 'query', { userId: target.userId }],
    ['recommendationRuns:readStatusForUser', 'query', target],
    ['recommendationRuns:readPathwayEvaluationForUser', 'query', target],
    ['recommendationRuns:readRankedRecommendationsForUser', 'query', target],
    ['recommendationRuns:listForAdmin', 'query', {}],
    ['recommendationRuns:readRankedRecommendationsForAdmin', 'query', { runId: target.runId }],
    ['recommendationRuns:listRunsForUserTesting', 'query', { userId: target.userId }],
    [
      'recommendationRuns:createQueuedRun',
      'mutation',
      { ...snapshotTarget, runId: 'unauthorized-created-run' },
    ],
    [
      'recommendationRuns:writePathwayEvaluationForUser',
      'mutation',
      { ...snapshotTarget, direct: [], blocked: [] },
    ],
    [
      'recommendationRuns:writeRankedRecommendationsForUser',
      'mutation',
      { ...snapshotTarget, direct: [], blocked: [], composed: [] },
    ],
    ['recommendationRuns:startProcessingForUser', 'mutation', target],
    ['recommendationRuns:setTerminalStatusForUser', 'mutation', { ...target, status: 'failed' }],
    [
      'recommendationRuns:seedRunForUser',
      'mutation',
      { ...snapshotTarget, runId: 'unauthorized-seeded-run', status: 'completed' },
    ],
    ['recommendationRuns:resetRunsForUser', 'mutation', { userId: target.userId }],
    ['tasks:list', 'query', { userId: target.userId }],
    ['auditLog:listAuditEvents', 'query', {}],
    ['auditLog:getAuditEvent', 'query', { eventId }],
    ['auditLog:getAuditSummary', 'query', {}],
    [
      'auditLog:recordAuditEvent',
      'mutation',
      {
        actorId: target.userId,
        actionType: 'RECOMMENDATION_FLAGGED',
        entityType: 'RECOMMENDATION_RUN',
        entityId: target.runId,
        entityLabel: 'Forged event',
        changeContext: { before: null, after: null },
      },
    ],
  ]
}

for (const role of ['anonymous', 'ordinary', 'foreign-user', 'own-client', 'admin']) {
  test(`${role} cannot call any of the 19 former public registrations`, async (context) => {
    const actor = stack.actors.find((actor) => actor.role === role)
    const client = stack.clientFor(actor)
    for (const [name, kind, args] of registrations()) {
      await context.test(name, async () => {
        await assert.rejects(client[kind](name, args), /Could not find public function/)
      })
    }
  })
}

test('denied direct calls leave the nonempty run and audit stores unchanged', async () => {
  assert.deepEqual(await storedState(), snapshot)
})

test('genuine session and admin admission remain usable after the probes', async () => {
  const response = await fetch(`${stack.origin}/api/auth/get-session`, {
    headers: { cookie: stack.owner.cookie },
  })
  assert.equal((await response.json()).user.id, stack.owner.id)
  assert.equal(
    (await stack.clientFor(stack.admin).query('ragSources:getAdminStatus', {})).currentUserIsAdmin,
    true,
  )
})
