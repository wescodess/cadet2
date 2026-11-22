import { parse } from './lint.parser.mjs'
import { ESLint } from 'eslint'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  baselineCommit,
  count,
  files,
  git,
  localPath,
  main,
  outputDir,
  ratchet,
  sourceFiles,
} from './common.mjs'
import { stylesheetFindings } from './design-css.mjs'
import { designMessages, utilityFindings } from './design-rule.mjs'

function designStylesheets() {
  const candidates = files().filter((file) => file.startsWith('app/') && file.endsWith('.css'))
  if (!candidates.length) return []
  const legacy = new Set(
    git('ls-tree', '-r', '--name-only', baselineCommit, '--', 'app').split('\n'),
  )
  return candidates.filter((file) => !legacy.has(file))
}

function stylesheetResult(file) {
  const text = readFileSync(file, 'utf8')
  const messages = stylesheetFindings(text, 0, utilityFindings).map(({ index, messageId }) => {
    const before = text.slice(0, index).split('\n')
    return {
      ruleId: 'relay/design',
      severity: 2,
      messageId,
      message: designMessages[messageId],
      line: before.length,
      column: before.at(-1).length + 1,
    }
  })
  return { filePath: resolve(file), messages }
}

async function hasInlineConfig(file, text) {
  if (!/(?:\/\*|<!--|\n\s*\*)\s*eslint\s/.test(text)) return false
  const { default: tseslint } = await import('typescript-eslint')
  const options = { comment: true, ecmaVersion: 'latest', sourceType: 'module', filePath: file }
  const ast = file.endsWith('.vue')
    ? (await import('vue-eslint-parser')).parse(text, { ...options, parser: tseslint.parser })
    : tseslint.parser.parseForESLint(text, options).ast
  return [...(ast.comments ?? []), ...(ast.templateBody?.comments ?? [])].some((comment) =>
    /^\s*(?:\*\s*)?eslint\s/.test(comment.value),
  )
}

async function checkDirectives(file) {
  const text = readFileSync(file, 'utf8')
  if (await hasInlineConfig(file, text))
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
  const stylesheets = designStylesheets().filter(
    (file) => !supplied.length || supplied.includes(file),
  )
  if (!selected.length && !stylesheets.length && supplied.length) return
  const results = selected.length
    ? parse({ files: selected, results: await eslint.lintFiles(selected) }).results
    : []
  results.push(...stylesheets.map(stylesheetResult))
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
  for (const file of selected) await checkDirectives(file)
  ratchet('lint', counts, { full: supplied.length === 0 })
})
