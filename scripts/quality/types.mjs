import { writeFileSync } from 'node:fs'
import { parse } from './types.parser.mjs'
import { count, main, outputDir, ratchet, run } from './common.mjs'

function check(name, args) {
  const result = run('pnpm', ['exec', ...args])
  const output = result.stdout + result.stderr
  writeFileSync(`${outputDir}/${name}.txt`, output)
  const parsed = parse({ status: result.status, stdout: result.stdout, stderr: result.stderr })
  const diagnostics = new Set()
  const counts = {}
  for (const diagnostic of parsed.stdout) {
    if (!diagnostics.has(diagnostic.line)) count(counts, `${diagnostic.file}|${diagnostic.code}`)
    diagnostics.add(diagnostic.line)
  }
  ratchet(name, counts)
}

main(() => {
  const prepare = run('pnpm', ['exec', 'nuxt', 'prepare'])
  if (prepare.status !== 0) throw new Error(prepare.stdout + prepare.stderr)
  check('types', ['vue-tsc', '--build', '--noEmit', '--pretty', 'false'])
  check('types-convex', [
    'tsc',
    '--noEmit',
    '--project',
    'convex/tsconfig.json',
    '--pretty',
    'false',
  ])
})
