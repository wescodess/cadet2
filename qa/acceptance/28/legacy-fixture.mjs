// A real pre-containment public seam creates the historical synthetic records.
// The candidate receives only that retained legacy data through the public CLI.
import fs from 'node:fs/promises'
const accounts = JSON.parse(await fs.readFile(process.env.QA_ACCOUNTS, 'utf8'))
for (const [group, values] of Object.entries(accounts))
  for (const [persona, a] of Object.entries(values)) {
    const owner =
      group === 'probes' && ['client', 'foreign'].includes(persona)
        ? persona === 'client'
          ? 'own'
          : 'foreign'
        : `${group}-${persona}`
    a.ownRunId = `qa28-${owner}-unsigned`
    const reset = await fetch(`${process.env.QA_CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'recommendationRuns:resetRunsForUser',
        args: { userId: a.userId },
        format: 'json',
      }),
    })
    if ((await reset.json()).status !== 'success') throw Error('Public local-fixture reset failed')
    const args = {
      userId: a.userId,
      runId: a.ownRunId,
      profileSnapshotId: `qa28-${owner}-snapshot`,
      status: 'completed',
    }
    const response = await fetch(`${process.env.QA_CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: 'recommendationRuns:seedRunForUser', args, format: 'json' }),
    })
    const body = await response.json()
    if (body.status !== 'success')
      throw Error(`Legacy fixture public seam: ${JSON.stringify(body)}`)
    const writeArgs = {
      userId: a.userId,
      runId: a.ownRunId,
      profileSnapshotId: args.profileSnapshotId,
      direct: [
        {
          type: 'direct',
          pathwayId: 'qa28-pathway',
          rank: 1,
          score: 80,
          tier: 'strong-fit',
          rationale: `QA28_PRIVATE_UNSIGNED_${owner}`,
        },
      ],
      blocked: [],
      composed: [],
    }
    const write = await fetch(`${process.env.QA_CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'recommendationRuns:writeRankedRecommendationsForUser',
        args: writeArgs,
        format: 'json',
      }),
    })
    const result = await write.json()
    if (result.status !== 'success')
      throw Error(`Legacy unsigned result fixture: ${JSON.stringify(result)}`)
    console.log(`Created real ${owner} unsigned legacy run through the public base function`)
  }
await fs.writeFile(process.env.QA_ACCOUNTS, JSON.stringify(accounts, null, 2), { mode: 0o600 })
