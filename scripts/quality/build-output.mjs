import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const forbidden = [
  ['development specimen route', /["'`]\/dev\/relay\b/],
  ['development specimen markup', /data-specimen\b/],
  ['Google Fonts request', /fonts\.(?:googleapis|gstatic)\.com/],
]

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

export function buildOutputProblems(root) {
  const files = walk(root)
  const problems = []
  for (const file of files) {
    const name = relative(root, file)
    if (/relay-?specimen|specimen\/|RelaySpecimen/i.test(name))
      problems.push(`${name}: development specimen file`)
    if (!/\.(?:m?js|cjs|json|html|css|map|txt)$/.test(file)) continue
    const text = readFileSync(file, 'utf8')
    for (const [label, pattern] of forbidden)
      if (pattern.test(text)) problems.push(`${name}: ${label}`)
  }
  for (const family of ['sans', 'mono']) {
    if (
      !files.some((file) =>
        new RegExp(`public/fonts/ibm-plex/ibm-plex-${family}-[\\w-]+\\.woff2$`).test(file),
      )
    )
      problems.push(`public/fonts/ibm-plex: IBM Plex ${family} is not self-hosted`)
  }
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = buildOutputProblems(process.argv[2] ?? '.output')
  if (problems.length) {
    console.error(`Build output check failed:\n${problems.join('\n')}`)
    process.exitCode = 1
  } else
    console.log('Build output: PASS (no development specimen, fonts self-hosted, no Google Fonts)')
}
