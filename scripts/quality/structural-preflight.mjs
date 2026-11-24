import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { parse as parseVue } from 'vue/compiler-sfc'

function sourceScripts(file) {
  const text = readFileSync(file, 'utf8')
  if (!file.endsWith('.vue')) return [text]
  const { descriptor } = parseVue(text, { filename: file })
  return [descriptor.script, descriptor.scriptSetup].filter(Boolean).map((s) => s.content)
}
function commentsIn(script, file) {
  const source = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true)
  const comments = new Map()
  const visit = (node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(script, node.pos) ?? []),
      ...(ts.getTrailingCommentRanges(script, node.end) ?? []),
    ])
      comments.set(range.pos, script.slice(range.pos, range.end))
    ts.forEachChild(node, visit)
  }
  visit(source)
  return [...comments.values()]
}
function suppressingTag(script, file) {
  for (const comment of commentsIn(script, file)) {
    const tag = [...comment.matchAll(/@([a-zA-Z0-9_]+)/g)]
      .map((match) => match[1])
      .find((tag) => ['public', 'beta', 'alias'].includes(tag))
    if (tag) return tag
  }
}
export function rejectKnipSuppressions(files) {
  for (const file of files) {
    const tag = sourceScripts(file)
      .map((script) => suppressingTag(script, file))
      .find(Boolean)
    if (tag) throw new Error(`Knip suppression @${tag} is forbidden in source comments: ${file}`)
  }
}

export function rejectDuplicationSuppressions(files) {
  const directive = /jscpd:ignore-(?:start|end)/
  for (const file of files) {
    if (directive.test(readFileSync(file, 'utf8')))
      throw new Error(`jscpd suppression is forbidden, including in source strings: ${file}`)
  }
}
