import { writeFileSync } from 'node:fs'
import { count, main, outputDir, ratchet, run } from './common.mjs'

function check(name, args) {
  const result = run('pnpm', ['exec', ...args])
  const output = result.stdout + result.stderr
  writeFileSync(`${outputDir}/${name}.txt`, output)
  if (![0, 1, 2].includes(result.status) || result.stderr.trim())
    throw new Error(`Typecheck did not complete (exit ${result.status}): ${output}`)
  if (result.stdout && !result.stdout.endsWith('\n'))
    throw new Error('Typecheck output ended with an incomplete line')
  const diagnostics = new Set()
  const counts = {}
  for (const line of result.stdout.split(/\r?\n/)) {
    if (!line.trim()) continue
    const match = /^(\S.*?)\(\d+,\d+\): error (TS\d+): \S/.exec(line)
    if (match) {
      if (!diagnostics.has(line)) count(counts, `${match[1]}|${match[2]}`)
      diagnostics.add(line)
    } else if (!diagnostics.size || !/^ {2,}\S/.test(line)) {
      throw new Error(`Unrecognized typecheck output: ${line}`)
    }
  }
  const hasDiagnostics = diagnostics.size > 0
  if ((result.status !== 0) !== hasDiagnostics)
    throw new Error('Typecheck exit status does not match its diagnostics')
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
