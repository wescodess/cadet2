import { writeFileSync } from 'node:fs'
import { count, main, outputDir, ratchet, run } from './common.mjs'

main(() => {
  const prepare = run('pnpm', ['exec', 'nuxt', 'prepare'])
  if (prepare.status !== 0) throw new Error(prepare.stdout + prepare.stderr)
  const result = run('pnpm', ['exec', 'vue-tsc', '--build', '--noEmit', '--pretty', 'false'])
  const output = result.stdout + result.stderr
  writeFileSync(`${outputDir}/types.txt`, output)
  const diagnostics = [...new Set(output.split('\n').filter((line) => /error TS\d+:/.test(line)))]
  const counts = {}
  for (const line of diagnostics) {
    const match = /^(.*?)\(\d+,\d+\): error (TS\d+):/.exec(line)
    if (!match) throw new Error(`Unrecognized typecheck diagnostic: ${line}`)
    count(counts, `${match[1]}|${match[2]}`)
  }
  if (result.status !== 0 && diagnostics.length === 0)
    throw new Error(output || 'Typecheck failed without diagnostics')
  ratchet('types', counts)
})
