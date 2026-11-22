import { createHash } from 'node:crypto'
import {
  count,
  git,
  localPath,
  main,
  outputDir,
  qualityBaseRef,
  ratchet,
  writingBaseline,
  writeJSON,
} from './common.mjs'
import { structuralCommit, structuralFiles } from './structural.mjs'
import { rejectDuplicationSuppressions } from './structural-preflight.mjs'
import { scanDuplication } from './duplication-population.mjs'

main(async () => {
  const selected = structuralFiles()
  rejectDuplicationSuppressions(selected)
  const base = git('merge-base', qualityBaseRef(), 'HEAD')
  const changed = new Set(
    [
      ...git('diff', '--no-renames', '--name-only', '-z', '--diff-filter=ACDMRT', base, '--').split(
        '\0',
      ),
      ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0'),
    ].filter(Boolean),
  )
  const report = await scanDuplication(selected)
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
