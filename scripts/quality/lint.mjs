import { parse } from './lint.parser.mjs'
import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'
import { parse as parseVue } from 'vue-eslint-parser'
import { readFileSync, writeFileSync } from 'node:fs'
import { count, localPath, main, outputDir, ratchet, sourceFiles } from './common.mjs'

function hasInlineConfig(file, text) {
  if (!/(?:\/\*|<!--|\n\s*\*)\s*eslint\s/.test(text)) return false
  const options = { comment: true, ecmaVersion: 'latest', sourceType: 'module', filePath: file }
  const ast = file.endsWith('.vue')
    ? parseVue(text, { ...options, parser: tseslint.parser })
    : tseslint.parser.parseForESLint(text, options).ast
  return [...(ast.comments ?? []), ...(ast.templateBody?.comments ?? [])].some((comment) =>
    /^\s*(?:\*\s*)?eslint\s/.test(comment.value),
  )
}

function checkDirectives(file) {
  const text = readFileSync(file, 'utf8')
  if (hasInlineConfig(file, text))
    throw new Error(`${file}: inline ESLint rule configuration is forbidden`)
  for (const match of text.matchAll(/(?:\/\/|\/\*|<!--|\n\s*\*)\s*eslint-disable[^\n]*/g)) {
    if (!/--\s+.*(?:#\d+|https:\/\/github\.com\/[^\s]+\/issues\/\d+)/.test(match[0])) {
      throw new Error(`${file}: eslint-disable requires a description with a ticket (#23)`)
    }
  }
}

main(async () => {
  const supplied = process.argv
    .slice(2)
    .filter((arg) => arg !== '--write-baseline')
    .map((file) => localPath(file))
  const candidates = supplied.length
    ? sourceFiles().filter((file) => supplied.includes(file))
    : sourceFiles()
  const eslint = new ESLint()
  const ignored = await Promise.all(candidates.map((file) => eslint.isPathIgnored(file)))
  const selected = candidates.filter((_file, index) => !ignored[index])
  if (!selected.length && supplied.length) return
  if (!selected.length) return ratchet('lint', {})
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
  for (const file of selected) checkDirectives(file)
  ratchet('lint', counts, { full: supplied.length === 0 })
})
