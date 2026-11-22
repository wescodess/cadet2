import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'

const checkout = resolve('.')
export function authorityFixture(sources, parent = realpathSync(tmpdir())) {
  const directory = mkdtempSync(join(parent, 'authority-'))
  function write(file, content) {
    const path = join(directory, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  function command(command, args) {
    const result = spawnSync(command, args, { cwd: directory, encoding: 'utf8' })
    if (result.status !== 0) throw new Error(result.stderr)
    return result.stdout
  }
  const require = createRequire(join(checkout, 'package.json'))
  const convex = require.resolve('convex/package.json'),
    convexRequire = createRequire(convex)
  const esbuild = convexRequire.resolve('esbuild/package.json')
  const native = createRequire(esbuild).resolve(
    `@esbuild/${process.platform}-${process.arch}/package.json`,
  )
  const packages = [
    convex,
    esbuild,
    native,
    require.resolve('typescript/package.json'),
    realpathSync(join(checkout, 'node_modules/@convex-dev/better-auth/package.json')),
  ]
  for (const manifest of packages) {
    const root = dirname(realpathSync(manifest)),
      target = join(directory, relative(checkout, root))
    mkdirSync(dirname(target), { recursive: true })
    cpSync(root, target, { recursive: true })
    const name = JSON.parse(readFileSync(manifest, 'utf8')).name
    const link = join(directory, 'node_modules', name)
    mkdirSync(dirname(link), { recursive: true })
    symlinkSync(relative(dirname(link), target), link)
  }
  for (const [parent, dependency] of [
    [convex, 'esbuild'],
    [esbuild, `@esbuild/${process.platform}-${process.arch}`],
  ]) {
    const location = join(
      directory,
      relative(checkout, dirname(dirname(realpathSync(parent)))),
      dependency,
    )
    mkdirSync(dirname(location), { recursive: true })
    symlinkSync(
      relative(dirname(location), realpathSync(join(directory, 'node_modules', dependency))),
      location,
    )
  }
  for (const file of ['tsconfig.json', 'convex/tsconfig.json', 'pnpm-lock.yaml'])
    write(file, readFileSync(join(checkout, file)))
  write('convex/_generated/server.js', readFileSync(join(checkout, 'convex/_generated/server.js')))
  write(
    'package.json',
    JSON.stringify({
      name: 'authority-control',
      type: 'module',
      private: true,
      dependencies: { convex: '^1.32.0' },
    }),
  )
  write('.gitignore', 'node_modules/\n.quality-output/\n')
  for (const [file, source] of Object.entries(sources)) write(file, source)
  command('git', ['init', '-q'])
  command('git', ['add', '.'])
  command('git', [
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'Synthetic authority fixture',
  ])
  const objects = spawnSync('git', ['rev-parse', '--git-path', 'objects'], {
    cwd: checkout,
    encoding: 'utf8',
  })
  if (objects.status !== 0) throw new Error(objects.stderr)
  write('.git/objects/info/alternates', resolve(checkout, objects.stdout.trim()) + '\n')
  return {
    directory,
    write,
    command,
    track: () => command('git', ['add', '.']),
    remove: () => rmSync(directory, { recursive: true, force: true }),
    run: (program, environment = {}) => {
      mkdirSync(join(directory, '.quality-output'), { recursive: true })
      const evidence = mkdtempSync(join(directory, '.quality-output/run-'))
      const result = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
        cwd: directory,
        encoding: 'utf8',
        timeout: 125000,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, ...environment, QUALITY_OUTPUT_DIR: evidence },
      })
      return { ...result, evidence }
    },
  }
}
export function authorityReceiptFixture() {
  const fixture = authorityFixture({
    'index.ts': 'console.log(1)',
    'convex/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; import { work } from '../shared/helper'; export const named = ask({ args: {}, handler: () => work() })",
    'shared/helper.ts': 'export function work() { return 1 }',
  })
  const adapter = new URL('../../scripts/quality/convex-entries.mjs', import.meta.url).href
  const native = fixture.run(`import { convexEntries } from ${JSON.stringify(adapter)};
    await convexEntries(['index.ts', 'convex/functions.ts', 'shared/helper.ts']);`)
  if (native.status !== 0) {
    fixture.remove()
    throw new Error(native.stderr)
  }
  const genuine = JSON.parse(readFileSync(join(native.evidence, 'convex-authority.json'), 'utf8'))
  const request = JSON.parse(
    readFileSync(join(native.evidence, 'convex-authority-request.json'), 'utf8'),
  )
  return { fixture, genuine, binding: { nonce: request.nonce, snapshot: request.snapshot } }
}
