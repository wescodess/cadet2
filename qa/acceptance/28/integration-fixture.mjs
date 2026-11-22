// Fresh local import of the historical synthetic payload, never publication or
// authorization evidence. Expected closures remain in the independent oracles.
import fs from 'node:fs/promises'
import path from 'node:path'
import { runtimeDirectory } from './runtime-directory.mjs'
import { runConvex } from './operator-cli.mjs'

const root = path.resolve('.')
const runtime = runtimeDirectory(root)
const historical = process.env.QA_HISTORICAL_EVIDENCE
if (!historical || !process.env.QA_ACCOUNTS)
  throw new Error('Set QA_HISTORICAL_EVIDENCE and QA_ACCOUNTS')
const observations = JSON.parse(
  await fs.readFile(path.join(historical, 'base/probes/convex.json'), 'utf8'),
)
const observation = observations.find(
  (row) =>
    row.name === 'recommendationRuns:readRankedRecommendationsForUser' &&
    row.persona === 'client' &&
    row.target === 'own',
)
if (!observation) throw new Error('Missing retained historical payload')
const historicalResult = JSON.parse(observation.body)
if (
  historicalResult.status !== 'success' ||
  !JSON.stringify(historicalResult.value).includes('QA28_PRIVATE_UNSIGNED_')
)
  throw new Error('Retained observation is not the original nonempty synthetic payload')

const accounts = JSON.parse(await fs.readFile(process.env.QA_ACCOUNTS, 'utf8'))
const rows = []
for (const [group, personas] of Object.entries(accounts)) {
  for (const [persona, account] of Object.entries(personas)) {
    const owner =
      group === 'probes' && ['client', 'foreign'].includes(persona)
        ? persona === 'client'
          ? 'own'
          : 'foreign'
        : `${group}-${persona}`
    if (!account.userId) throw new Error(`Missing real signup identity: ${group}/${persona}`)
    account.ownRunId = `qa28-${owner}-unsigned`
    const results = JSON.parse(JSON.stringify(historicalResult.value.results))
    for (const result of results.direct) result.rationale = `QA28_PRIVATE_UNSIGNED_${owner}`
    const now = Date.now()
    rows.push({
      runId: account.ownRunId,
      userId: account.userId,
      profileSnapshotId: `qa28-${owner}-snapshot`,
      status: 'completed',
      recommendationResults: {
        ...results,
        rankedAt: now,
        rankerVersion: 'qa28-synthetic-legacy-import-v1',
        noComposedReason: historicalResult.value.noComposedReason,
      },
      createdAt: now,
      updatedAt: now,
    })
  }
}
if (!rows.length) throw new Error('Refuse empty legacy fixture')
const file = path.join(runtime, 'integration-legacy.json')
await fs.writeFile(file, JSON.stringify(rows, null, 2), { mode: 0o600 })
runConvex(
  root,
  [
    'import',
    '--table',
    'recommendation_runs',
    '--replace',
    '--yes',
    file,
    '--env-file',
    path.join(runtime, 'self-hosted.env'),
  ],
  { stdio: 'inherit' },
)
await fs.writeFile(process.env.QA_ACCOUNTS, JSON.stringify(accounts, null, 2), { mode: 0o600 })
console.log(`Imported ${rows.length} fresh synthetic legacy rows from the retained payload vector`)
