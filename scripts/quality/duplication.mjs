import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  count,
  git,
  localPath,
  main,
  outputDir,
  qualityBaseRef,
  ratchet,
  run,
  writingBaseline,
  writeJSON,
} from './common.mjs'
import { configuration, structuralCommit, structuralFiles } from './structural.mjs'
import { parse } from './duplication.parser.mjs'

main(() => {
  const selected = structuralFiles()
  const base = git('merge-base', qualityBaseRef(), 'HEAD')
  const changed = new Set(
    [
      ...git('diff', '--name-only', '-z', '--diff-filter=ACDMRT', base, '--').split('\0'),
      ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
    ].filter(Boolean),
  )
  const result = run(configuration('../../node_modules/.bin/jscpd'), [
    ...selected,
    '--config',
    configuration('jscpd.json'),
    '--absolute',
    '--reporters',
    'json',
    '--output',
    resolve(outputDir),
    '--silent',
    '--no-tips',
  ])
  if (result.status !== 0)
    throw new Error(`jscpd tool failure: exit ${result.status}: ${result.stderr}`)
  const report = parse({
    status: result.status,
    stdout: readFileSync(`${outputDir}/jscpd-report.json`, 'utf8'),
  })
  const counts = {}
  for (const clone of report.duplicates) {
    const pair = [localPath(clone.firstFile.name), localPath(clone.secondFile.name)].sort()
    if (!pair.every((file) => selected.includes(file)))
      throw new Error('jscpd returned a file outside the source inventory')
    const digest = createHash('sha256')
      .update(clone.format)
      .update('\0')
      .update(clone.fragment)
      .digest('hex')
    for (const file of new Set(pair)) {
      if (writingBaseline || pair.some((member) => changed.has(member)))
        count(counts, `${file}|clone|${pair.join(':')}|${digest}`)
    }
  }
  writeJSON(`${outputDir}/duplication.json`, { base, changed: [...changed].sort(), counts })
  ratchet('duplication', counts, {
    commit: structuralCommit,
    date: '2026-11-21',
    scope: (key) =>
      writingBaseline ||
      key
        .split('|')[2]
        .split(':')
        .some((file) => changed.has(file)),
  })
})
