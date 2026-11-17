import { main, outputDir, run, writeJSON } from './common.mjs'

main(() => {
  console.log(`Quality evidence: ${outputDir}`)
  const policy = run('node', ['scripts/quality/baseline-policy.mjs'])
  process.stdout.write(policy.stdout)
  process.stderr.write(policy.stderr)
  if (policy.status !== 0) throw new Error('Baseline policy failed')
  const rows = [
    'typecheck',
    'lint',
    'format:check',
    'secrets:check',
    'dependencies:check',
    'test:policy',
    'test:components',
    'build',
  ]
  const results = []
  for (const row of rows) {
    const start = Date.now()
    console.log(`\n>>> ${row}`)
    let status = 'FAIL'
    try {
      const result = run('pnpm', ['run', row])
      process.stdout.write(result.stdout)
      process.stderr.write(result.stderr)
      if (result.status === 0) status = 'PASS'
    } catch (error) {
      console.error(error.message)
    }
    results.push({
      row,
      status,
      seconds: ((Date.now() - start) / 1000).toFixed(1),
    })
    writeJSON(`${outputDir}/verification.json`, results)
  }
  console.log('\nVerification summary')
  for (const result of results) console.log(`${result.status} ${result.row} (${result.seconds}s)`)
  if (results.some((result) => result.status === 'FAIL')) process.exitCode = 1
})
