import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import * as prettier from 'prettier'
import {
  baselineCommit,
  files,
  git,
  json,
  localPath,
  main,
  writeJSON,
  writingBaseline,
} from './common.mjs'

async function legacyHash(file, baseline, original) {
  const text = readFileSync(file, 'utf8')
  const hash = `sha256:${createHash('sha256').update(text).digest('hex')}`
  if (!writingBaseline && baseline[file] === hash) return hash
  const info = await prettier.getFileInfo(file, { ignorePath: '.prettierignore' })
  if (info.ignored || !info.inferredParser) return null
  const options = { ...(await prettier.resolveConfig(file)), filepath: file }
  if (await prettier.check(text, options)) return null
  if (writingBaseline && !original.has(file))
    throw new Error(`New files must be formatted: ${file}`)
  return hash
}

main(async () => {
  const path = 'scripts/quality/baselines/format.json'
  const baseline = writingBaseline ? {} : json(path)
  const supplied = process.argv
    .slice(2)
    .filter((arg) => arg !== '--write-baseline')
    .map((file) => localPath(file))
  const selected = supplied.length ? files().filter((file) => supplied.includes(file)) : files()
  const legacy = {}
  const original = new Set(git('ls-tree', '-r', '--name-only', baselineCommit).split('\n'))
  const failures = []
  for (const file of selected) {
    const hash = await legacyHash(file, baseline, original)
    if (!hash) continue
    legacy[file] = hash
    if (!writingBaseline && baseline[file] !== hash) failures.push(file)
  }
  if (writingBaseline) writeJSON(path, legacy)
  else if (failures.length)
    throw new Error(
      `Format regression; run pnpm exec prettier --write <file>:\n${failures.join('\n')}`,
    )
  console.log(
    `format: ${writingBaseline ? 'wrote' : 'PASS'} (${Object.keys(legacy).length} unchanged legacy files)`,
  )
})
