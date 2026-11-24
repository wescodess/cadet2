// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'

const temporary = []
afterEach(() => {
  for (const path of temporary.splice(0)) rmSync(path, { recursive: true, force: true })
})

it('rejects an ancestor-only ambient type and admits the same declared project dependency', () => {
  const directory = mkdtempSync(join(tmpdir(), 'quality-type-population-'))
  temporary.push(directory)
  const project = join(directory, 'parent/project')
  const convex = join(project, 'convex')
  const host = join(directory, 'parent/node_modules/@types/host-only')
  mkdirSync(convex, { recursive: true })
  mkdirSync(host, { recursive: true })
  const declaration = 'declare const hostAmbientMarker: string\n'
  writeFileSync(join(host, 'index.d.ts'), declaration)
  writeFileSync(join(convex, 'probe.ts'), 'hostAmbientMarker.toUpperCase()\n')
  writeFileSync(join(convex, 'tsconfig.json'), readFileSync('convex/tsconfig.json'))
  const compile = () =>
    spawnSync(
      process.execPath,
      [
        resolve('node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--project',
        join(convex, 'tsconfig.json'),
      ],
      { cwd: project, encoding: 'utf8', timeout: 15000 },
    )
  const denied = compile()
  expect(denied.stdout + denied.stderr).toContain("Cannot find name 'hostAmbientMarker'")
  expect(denied.status).toBe(2)
  const dependency = join(project, 'node_modules/@types/approved-local')
  mkdirSync(dependency, { recursive: true })
  writeFileSync(join(dependency, 'index.d.ts'), declaration)
  const admitted = compile()
  expect(admitted.status, admitted.stdout + admitted.stderr).toBe(0)
}, 30000)
