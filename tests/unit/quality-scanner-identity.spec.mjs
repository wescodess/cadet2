// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import {
  scannerPid,
  scannerReadiness,
  scannerTestResources,
} from '../support/quality-scanner-worker.mjs'

afterEach(() => vi.restoreAllMocks())
const invalid = [
  '',
  ' ',
  '\n',
  '0',
  '-0',
  '-1',
  '1',
  '+2',
  '02',
  '2.1',
  '2e3',
  '2junk',
  'NaN',
  'Infinity',
  '9007199254740992',
]
it.each(invalid)('rejects PID %j before any probe or signal', (value) => {
  const calls = []
  vi.spyOn(process, 'kill').mockImplementation((...args) => {
    calls.push(args)
    return true
  })
  expect(() => scannerPid(value)).toThrow(/identity/)
  expect(calls).toEqual([])
})
it('rejects the caller identity and accepts a finite decimal as data without acquiring ownership', async () => {
  const calls = []
  vi.spyOn(process, 'kill').mockImplementation((...args) => {
    calls.push(args)
    return true
  })
  expect(() => scannerPid(String(process.pid))).toThrow(/identity/)
  expect(scannerPid('12345')).toBe(12345)
  const resources = scannerTestResources()
  expect(() => resources.descendants.push(12345)).toThrow(/ownership/)
  await expect(resources.stop({ pid: 12345 })).rejects.toThrow(/ownership/)
  await resources.cleanup()
  expect(calls).toEqual([])
})
const expected = {
  nonce: '3bcfd908-0e95-48fe-a97c-0a29e993fbfe',
  role: 'scanner',
  depth: 0,
  pid: 12345,
  parentPid: 23456,
}
const publication = {
  version: 1,
  nonce: expected.nonce,
  role: expected.role,
  depth: 0,
  pid: 12345,
  parentPid: 23456,
}
it.each([
  '',
  ' ',
  '{"version":1',
  JSON.stringify({ ...publication, nonce: 'stale' }),
  JSON.stringify({ ...publication, pid: 23457 }),
  JSON.stringify({ ...publication, parentPid: 23457 }),
  JSON.stringify({ ...publication, role: 'foreign' }),
  JSON.stringify({ ...publication, depth: 1 }),
  JSON.stringify({ ...publication, extra: true }),
  JSON.stringify(publication).replace('12345', '1.2345e4'),
  JSON.stringify(publication).replace('"pid":12345', '"pid":0,"pid":12345'),
])('rejects partial, stale, foreign or malformed readiness %j without a syscall', (text) => {
  const calls = []
  vi.spyOn(process, 'kill').mockImplementation((...args) => {
    calls.push(args)
    return true
  })
  expect(() => scannerReadiness(text, expected)).toThrow()
  expect(calls).toEqual([])
})
it('requires exact readiness identity while treating the record as observation only', () => {
  expect(scannerReadiness(JSON.stringify(publication), expected)).toEqual(publication)
})
it.each([0, 1, -1, 9007199254740992])(
  'rejects invalid parent identity %s without probing it',
  (parentPid) => {
    const calls = []
    vi.spyOn(process, 'kill').mockImplementation((...args) => {
      calls.push(args)
      return true
    })
    expect(() =>
      scannerReadiness(JSON.stringify({ ...publication, parentPid }), { ...expected, parentPid }),
    ).toThrow()
    expect(calls).toEqual([])
  },
)
