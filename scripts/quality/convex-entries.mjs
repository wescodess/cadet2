import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { outputDir, writeJSON } from './common.mjs'
import { authoritySnapshot, revalidateSnapshot } from './convex-authority-inputs.mjs'
import { parse } from './convex-authority.parser.mjs'
import { runScanner, scannerBudgets } from './scanner.mjs'
import { configuration } from './structural.mjs'

function withinDeadline(execution) {
  if (Number(process.hrtime.bigint()) / 1e6 >= execution.deadlineMs)
    throw new Error(`Convex authority exceeded its ${execution.budgetMs}ms row deadline`)
}
export async function convexEntries(files, execution = {}) {
  const budgetMs = scannerBudgets['dead-code']
  const options = {
    budgetMs,
    deadlineMs: Number(process.hrtime.bigint()) / 1e6 + budgetMs,
    captureBudget: { bytes: 0 },
    ...execution,
  }
  const nonce = randomUUID(),
    snapshot = authoritySnapshot(files)
  const request = resolve(outputDir, 'convex-authority-request.json')
  writeJSON(request, { schemaVersion: 1, nonce, snapshot })
  const result = await runScanner(
    'convex-authority',
    process.execPath,
    [configuration('convex-authority.scanner.mjs'), request],
    options,
  )
  writeJSON(resolve(outputDir, 'convex-authority-native.json'), result)
  const receipt = parse(result, { nonce, snapshot })
  revalidateSnapshot(snapshot)
  withinDeadline(options)
  writeJSON(resolve(outputDir, 'convex-authority.json'), receipt)
  return { entries: receipt.claims, snapshot, execution: options }
}

export function verifyConvexEntries(authority) {
  revalidateSnapshot(authority.snapshot)
  withinDeadline(authority.execution)
}
