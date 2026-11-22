// @vitest-environment node
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { afterEach, expect, it, vi } from 'vitest'
import {
  scannerReady,
  scannerReadiness,
  scannerTestResources,
  writeScannerWorker,
} from '../support/quality-scanner-worker.mjs'

const resources = scannerTestResources()
afterEach(async () => {
  vi.restoreAllMocks()
  await resources.cleanup()
})
function fixture(exit = false) {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-owned-'))
  resources.temporary.push(directory)
  const nonce = randomUUID(),
    path = join(directory, 'ready.json')
  const code = `import { renameSync, writeFileSync } from 'node:fs';
    const record = {version:1,nonce:${JSON.stringify(nonce)},role:'scanner',depth:0,pid:process.pid,parentPid:process.ppid};
    writeFileSync(${JSON.stringify(path + '.tmp')}, JSON.stringify(record), {flag:'wx'});
    renameSync(${JSON.stringify(path + '.tmp')}, ${JSON.stringify(path)});
    ${exit ? 'process.exit(0)' : 'setInterval(() => {}, 1000)'};`
  const child = resources.spawn(process.execPath, ['--input-type=module', '-e', code], {
    stdio: 'ignore',
  })
  return { child, nonce, path }
}
async function published(active, birth) {
  const deadline = Date.now() + 2000
  while (!existsSync(active.path) && Date.now() < deadline) await delay(10)
  if (!existsSync(active.path)) throw new Error('Atomic readiness publication timed out')
  return scannerReadiness(readFileSync(active.path, 'utf8'), {
    nonce: active.nonce,
    role: 'scanner',
    depth: 0,
    pid: birth.pid,
    parentPid: birth.controllerPid,
  })
}
it('binds atomic readiness to a real child and keeps the group controller until cleanup/reaping', async () => {
  const sentinel = resources.spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
  })
  const active = fixture()
  const birth = await active.child.spawned
  await sentinel.spawned
  const record = await published(active, birth)
  const calls = [],
    original = process.kill
  vi.spyOn(process, 'kill').mockImplementation((...args) => {
    calls.push(args)
    return original(...args)
  })
  expect(() =>
    scannerReadiness(JSON.stringify({ ...record, pid: sentinel.pid }), {
      nonce: active.nonce,
      role: 'scanner',
      depth: 0,
      pid: birth.pid,
      parentPid: birth.controllerPid,
    }),
  ).toThrow(/Foreign/)
  await expect(resources.stop({ pid: sentinel.pid })).rejects.toThrow(/ownership/)
  expect(calls).toEqual([])
  const settled = await resources.stop(active.child)
  expect(settled).toMatchObject({
    nativePid: birth.pid,
    controllerPid: birth.controllerPid,
    reaped: true,
  })
  expect(resources.isLive(sentinel)).toBe(true)
  expect(await resources.stop(active.child)).toEqual(settled)
  expect(calls).toEqual([])
  console.info(
    JSON.stringify({
      readiness: record,
      settled,
      sentinelAlive: true,
      numericSignalsFromRecords: calls,
    }),
  )
}, 7000)
it('reaps exit-before-read without reviving numeric PID cleanup authority', async () => {
  const active = fixture(true)
  const birth = await active.child.spawned
  await new Promise((resolve) => active.child.once('close', resolve))
  const record = await published(active, birth)
  const calls = []
  vi.spyOn(process, 'kill').mockImplementation((...args) => {
    calls.push(args)
    return true
  })
  const settled = await resources.stop(active.child)
  expect(settled).toMatchObject({ code: 0, signal: null, reaped: true })
  expect(calls).toEqual([])
  console.info(JSON.stringify({ readiness: record, settled, numericSignalsAfterExit: calls }))
}, 7000)
it('binds the root publication parent to the independently received birth identity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-parent-'))
  resources.temporary.push(directory)
  const worker = writeScannerWorker(directory)
  const child = resources.spawn(process.execPath, [worker, '0', directory])
  await child.spawned
  const deadline = Date.now() + 2000
  let records
  while (!(records = scannerReady(directory)) && Date.now() < deadline) await delay(10)
  expect(records).toHaveLength(3)
  const path = join(directory, '0.pid'),
    original = readFileSync(path, 'utf8')
  writeFileSync(path, JSON.stringify({ ...records[0], parentPid: records[0].parentPid + 1 }))
  try {
    expect(() => scannerReady(directory)).toThrow(/Foreign scanner parent/)
  } finally {
    writeFileSync(path, original)
  }
  const settled = await resources.stop(child)
  expect(settled.reaped).toBe(true)
}, 7000)
