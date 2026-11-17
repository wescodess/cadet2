import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { files, git, json, main, outputDir, run, writeJSON, writingBaseline } from './common.mjs'
import { parse } from './gitleaks.parser.mjs'
import { gitleaks } from './install-gitleaks.mjs'

const baselinePath = 'scripts/quality/baselines/secrets.json'

function scan(binary, directory, name, args) {
  const report = join(directory, `${name}.json`)
  const result = run(binary, [
    ...args,
    '--no-banner',
    '--report-format=json',
    '--exit-code=42',
    `--report-path=${report}`,
  ])
  if (![0, 42].includes(result.status))
    throw new Error(`gitleaks ${name} failed (exit ${result.status})`)
  const findings = parse({ status: result.status, stdout: readFileSync(report, 'utf8') }).stdout
  return findings.map((finding) => {
    const file = finding.File.replace(`${join(directory, 'tree')}/`, '')
    const digest = createHash('sha256').update(finding.Secret).digest('hex')
    return `${finding.RuleID}|${file}|${digest}`
  })
}

main(async () => {
  if (git('rev-parse', '--is-shallow-repository') !== 'false')
    throw new Error('Secret history scan requires a full checkout (fetch-depth: 0)')
  const binary = await gitleaks()
  const allBranches = process.argv.includes('--all-branches')
  const directory = mkdtempSync(join(tmpdir(), 'cadet2-secrets-'))
  const found = {}
  try {
    const history = allBranches ? 'all-branches' : 'history'
    found[history] = scan(binary, directory, history, [
      'git',
      `--log-opts=${allBranches ? '--all' : 'HEAD'}`,
      '.',
    ])
    if (!allBranches) {
      const base = process.env.QUALITY_BASE_REF || 'origin/dev'
      const mergeBase = git('merge-base', base, 'HEAD')
      found.diff = scan(binary, directory, 'diff', ['git', `--log-opts=${mergeBase}..HEAD`, '.'])
      for (const file of files()) {
        const destination = join(directory, 'tree', file)
        mkdirSync(dirname(destination), { recursive: true })
        copyFileSync(file, destination)
      }
      found.working = scan(binary, directory, 'working', ['dir', join(directory, 'tree')])
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
  writeJSON(`${outputDir}/secrets${allBranches ? '-all-branches' : ''}.json`, found)
  if (writingBaseline) {
    writeJSON(baselinePath, [...new Set(Object.values(found).flat())].sort())
    console.log(
      `secrets: wrote ${json(baselinePath).length} exact rule/file/secret-digest exceptions`,
    )
    return
  }
  const baseline = json(baselinePath)
  for (const [name, findings] of Object.entries(found)) {
    const fresh = findings.filter((finding) => !baseline.includes(finding))
    if (fresh.length)
      throw new Error(
        `secrets ${name}: ${fresh.length} new findings (secret values withheld)\n${fresh.join('\n')}`,
      )
    console.log(`secrets ${name}: PASS (${findings.length} existing findings; zero new)`)
  }
})
