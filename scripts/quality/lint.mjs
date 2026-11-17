import { parse } from './lint.parser.mjs'
import { ESLint } from 'eslint'
import { readFileSync, writeFileSync } from 'node:fs'
import { count, localPath, main, outputDir, ratchet, sourceFiles } from './common.mjs'

main(async () => {
  const supplied = process.argv
    .slice(2)
    .filter((arg) => arg !== '--write-baseline')
    .map((file) => localPath(file))
  const selected = supplied.length
    ? sourceFiles().filter((file) => supplied.includes(file))
    : sourceFiles()
  if (!selected.length) return
  const eslint = new ESLint()
  const results = parse({ files: selected, results: await eslint.lintFiles(selected) }).results
  writeFileSync(
    `${outputDir}/lint.json`,
    JSON.stringify(
      results.map(({ filePath, messages }) => ({ filePath: localPath(filePath), messages })),
      null,
      2,
    ),
  )
  const counts = {}
  for (const result of results) {
    for (const message of result.messages) {
      if (message.fatal || !message.ruleId)
        throw new Error(`${localPath(result.filePath)}:${message.line}: ${message.message}`)
      count(counts, `${localPath(result.filePath)}|${message.ruleId}`)
    }
  }
  for (const file of selected) {
    const text = readFileSync(file, 'utf8')
    for (const match of text.matchAll(/(?:\/\/|\/\*|<!--|\n\s*\*)\s*eslint-disable[^\n]*/g)) {
      if (!/--\s+.*(?:#\d+|https:\/\/github\.com\/[^\s]+\/issues\/\d+)/.test(match[0])) {
        throw new Error(`${file}: eslint-disable requires a description with a ticket (#23)`)
      }
    }
  }
  ratchet('lint', counts)
})
