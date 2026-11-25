import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { babelParse, parse } from 'vue/compiler-sfc'

import { repoPath } from './css-source'

const uiRoot = 'app/components/ui'
const lucideSource = /^(?:lucide-vue-next|@lucide\/vue)(?:\/|$)/
const strokeModule = /^[@~]\/lib\/relay\/icons$/
const strokeBinding = 'interfaceIconStroke'
const strokeNames = new Set(['stroke-width', 'strokeWidth'])

const approvedTwoPixelGlyphs = new Map([
  ['StateGlyph', 'DESIGN.md:241: state glyphs render at 2 px stroke'],
])

const ELEMENT = 1
const INTERPOLATION = 5
const ATTRIBUTE = 6
const DIRECTIVE = 7

interface TemplateProp {
  type: number
  name: string
  arg?: { content?: string }
  exp?: { content?: string }
}

interface TemplateNode {
  type: number
  tag?: string
  props?: TemplateProp[]
  children?: TemplateNode[]
  content?: { content?: string }
  loc: { start: { line: number } }
}

interface SourceFacts {
  file: string
  lucide: Set<string>
  scriptUses: Set<string>
  imports: Map<string, string>
  strokeImported: boolean
  template: TemplateNode[]
  problems: string[]
}

interface AstNode {
  type: string
  [key: string]: unknown
}

const renderFunctions = new Set(['h', 'createVNode', 'createElementVNode', 'createBlock'])

function* walk(node: unknown): Generator<AstNode> {
  if (Array.isArray(node)) {
    for (const child of node) yield* walk(child)
    return
  }
  if (!node || typeof node !== 'object') return
  const ast = node as AstNode
  if (typeof ast.type === 'string') yield ast
  for (const [key, value] of Object.entries(ast)) {
    if (key === 'loc' || key === 'extra' || key.endsWith('Comments')) continue
    yield* walk(value)
  }
}

function sourceFiles(directory: string, extensions: RegExp): string[] {
  return readdirSync(repoPath(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path, extensions)
    return extensions.test(entry.name) ? [path] : []
  })
}

function pascal(tag: string) {
  return tag
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function identifiers(expression: string) {
  return expression.match(/[A-Za-z_$][\w$]*/g) ?? []
}

function readScript(facts: SourceFacts, code: string) {
  const program = babelParse(code, { sourceType: 'module', plugins: ['typescript'] }).program
  const staticSources = new Set<unknown>()
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue
    staticSources.add(statement.source)
    const source = statement.source.value
    for (const specifier of statement.specifiers) {
      const local = specifier.local.name
      if (specifier.type === 'ImportSpecifier' && specifier.importKind === 'type') continue
      if (lucideSource.test(source)) {
        if (specifier.type === 'ImportSpecifier') facts.lucide.add(local)
        else facts.problems.push(`${facts.file}: ${local} imports Lucide as a whole module`)
        continue
      }
      facts.imports.set(local, source)
      if (strokeModule.test(source) && local === strokeBinding) facts.strokeImported = true
    }
  }
  for (const node of walk(program.body)) {
    if (node.type === 'StringLiteral' && lucideSource.test(String(node.value)))
      if (!staticSources.has(node))
        facts.problems.push(`${facts.file}: Lucide is loaded outside a static import`)
  }
  const body = program.body.filter((statement) => statement.type !== 'ImportDeclaration')
  for (const node of walk(body)) {
    if (node.type === 'Identifier' && facts.lucide.has(String(node.name)))
      facts.scriptUses.add(String(node.name))
    const callee = node.type === 'CallExpression' ? (node.callee as AstNode) : undefined
    if (facts.lucide.size && callee?.type === 'Identifier' && renderFunctions.has(String(callee.name)))
      facts.problems.push(
        `${facts.file}: renders through ${String(callee.name)}(), so its stroke cannot be checked`,
      )
  }
}

const factsCache = new Map<string, SourceFacts>()

function sourceFacts(file: string): SourceFacts {
  const cached = factsCache.get(file)
  if (cached) return cached
  const text = readFileSync(repoPath(file), 'utf8')
  const facts: SourceFacts = {
    file,
    lucide: new Set(),
    scriptUses: new Set(),
    imports: new Map(),
    strokeImported: false,
    template: [],
    problems: [],
  }
  if (file.endsWith('.vue')) {
    const { descriptor } = parse(text, { filename: file })
    for (const block of [descriptor.script, descriptor.scriptSetup])
      if (block) readScript(facts, block.content)
    facts.template = (descriptor.template?.ast?.children ?? []) as unknown as TemplateNode[]
  } else {
    readScript(facts, text)
    for (const name of facts.lucide)
      facts.problems.push(`${file}: ${name} is imported outside a template`)
  }
  factsCache.set(file, facts)
  return facts
}

function strokeProblem(node: TemplateNode, facts: SourceFacts) {
  const props = node.props ?? []
  const where = `${facts.file}:${node.loc.start.line} <${node.tag ?? ''}>`
  if (props.some((prop) => prop.type === ATTRIBUTE && strokeNames.has(prop.name)))
    return `${where} sets a literal stroke-width`
  if (props.some((prop) => prop.type === DIRECTIVE && prop.name === 'bind' && !prop.arg))
    return `${where} spreads v-bind, so its stroke cannot be checked`
  const bound = props.filter(
    (prop) =>
      prop.type === DIRECTIVE && prop.name === 'bind' && strokeNames.has(prop.arg?.content ?? ''),
  )
  if (bound.length !== 1 || bound[0]?.exp?.content?.trim() !== strokeBinding)
    return `${where} has no :stroke-width="${strokeBinding}"`
  if (!facts.strokeImported)
    return `${where} binds ${strokeBinding} without importing it from lib/relay/icons`
  return null
}

function dynamicIcon(node: TemplateNode, facts: SourceFacts) {
  if (node.tag !== 'component') return { is: '', icon: false }
  const is = (node.props ?? []).find(
    (prop) => prop.type === DIRECTIVE && prop.name === 'bind' && prop.arg?.content === 'is',
  )
  const expression = is?.exp?.content ?? ''
  const direct = identifiers(expression).some((name) => facts.lucide.has(name))
  return { is: expression, icon: direct || facts.scriptUses.size > 0 }
}

function iconProblems(nodes: TemplateNode[], facts: SourceFacts, rendered = new Set<string>()) {
  const problems: string[] = []
  for (const node of nodes) {
    const where = `${facts.file}:${node.loc.start.line}`
    if (node.type === INTERPOLATION)
      for (const name of identifiers(node.content?.content ?? ''))
        if (facts.lucide.has(name))
          problems.push(`${where} uses ${name} as a value, so its stroke cannot be checked`)
    if (node.type === ELEMENT && node.tag) {
      const dynamic = dynamicIcon(node, facts)
      for (const prop of node.props ?? []) {
        if (prop.type !== DIRECTIVE || !prop.exp?.content) continue
        for (const name of identifiers(prop.exp.content).filter((id) => facts.lucide.has(id))) {
          if (dynamic.icon && prop.exp.content === dynamic.is) rendered.add(name)
          else problems.push(`${where} uses ${name} as a value, so its stroke cannot be checked`)
        }
      }
      if (facts.lucide.has(pascal(node.tag))) rendered.add(pascal(node.tag))
      if (facts.lucide.has(pascal(node.tag)) || dynamic.icon) {
        const problem = strokeProblem(node, facts)
        if (problem) problems.push(problem)
      }
    }
    if (node.children) problems.push(...iconProblems(node.children, facts, rendered))
  }
  return problems
}

function primitiveProblems(file: string) {
  const facts = sourceFacts(file)
  const rendered = new Set<string>()
  const problems = [...facts.problems, ...iconProblems(facts.template, facts, rendered)]
  for (const name of facts.scriptUses)
    problems.push(`${file}: ${name} is used in script, so its stroke cannot be checked`)
  if (file.endsWith('.vue'))
    for (const name of facts.lucide)
      if (!rendered.has(name) && !facts.scriptUses.has(name))
        problems.push(`${file}: ${name} is imported but never rendered as a checked element`)
  return problems
}

const components = new Map<string, string>()
for (const file of sourceFiles('app/components', /\.vue$/)) {
  const parts = relative('app/components', dirname(file)).split('/').filter(Boolean)
  const name = basename(file, '.vue')
  const prefix = parts.map(pascal).join('')
  components.set(name.startsWith(prefix) ? name : prefix + name, file)
  if (file.startsWith(`${uiRoot}/`)) components.set(name, file)
}

function resolveComponent(node: TemplateNode, facts: SourceFacts) {
  if (node.type !== ELEMENT || !node.tag) return undefined
  const name = pascal(node.tag).replace(/^Lazy(?=[A-Z])/, '')
  const source = facts.imports.get(name)
  if (!source) return components.get(name)
  if (!/^(?:[@~]\/|\.\.?\/)/.test(source)) return undefined
  const base = /^[@~]\//.test(source)
    ? join('app', source.slice(2))
    : relative(repoPath('.'), resolve(dirname(repoPath(facts.file)), source))
  for (const candidate of [base, `${base}.vue`])
    if (candidate.endsWith('.vue') && existsSync(repoPath(candidate))) return candidate
  return isPrimitive(base) ? uiRoot : undefined
}

function isPrimitive(file: string | undefined) {
  return file === uiRoot || Boolean(file?.startsWith(`${uiRoot}/`))
}

const exemptionsUsed = new Set<string>()

function exempt(target: string) {
  const name = basename(target, '.vue')
  if (!approvedTwoPixelGlyphs.has(name)) return false
  exemptionsUsed.add(name)
  return true
}

function componentProblems(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file)) return []
  seen.add(file)
  const facts = sourceFacts(file)
  const problems = [...facts.problems, ...iconProblems(facts.template, facts)]
  const visit = (nodes: TemplateNode[]) => {
    for (const node of nodes) {
      const target = resolveComponent(node, facts)
      if (target && !isPrimitive(target) && !exempt(target))
        problems.push(...componentProblems(target, seen))
      if (node.children) visit(node.children)
    }
  }
  visit(facts.template)
  return problems
}

function slotProblems(nodes: TemplateNode[], facts: SourceFacts, host: string): string[] {
  return nodes.flatMap((node) => {
    const problems = iconProblems([{ ...node, children: [] }], facts)
    const target = resolveComponent(node, facts)
    if (target && !isPrimitive(target) && !exempt(target)) {
      const inner = componentProblems(target)
      if (inner.length)
        problems.push(
          `${facts.file}:${node.loc.start.line} passes <${node.tag ?? ''}> into <${host}>: ${inner.join('; ')}`,
        )
    }
    return [...problems, ...slotProblems(node.children ?? [], facts, host)]
  })
}

function consumerProblems(file: string) {
  const facts = sourceFacts(file)
  const problems: string[] = []
  const visit = (nodes: TemplateNode[]) => {
    for (const node of nodes) {
      if (isPrimitive(resolveComponent(node, facts)))
        problems.push(
          ...iconProblems([{ ...node, children: [] }], facts),
          ...slotProblems(node.children ?? [], facts, node.tag ?? ''),
        )
      else if (node.children) visit(node.children)
    }
  }
  visit(facts.template)
  return problems
}

const primitives = sourceFiles(uiRoot, /\.(vue|ts)$/)
const consumers = sourceFiles('app', /\.vue$/).filter((file) => !isPrimitive(file))

describe('every Lucide icon a shared primitive renders takes the shared interface stroke', () => {
  it('finds the Lucide icons in the primitives it guards', () => {
    const icons = primitives.reduce((count, file) => count + sourceFacts(file).lucide.size, 0)
    expect(icons).toBeGreaterThan(0)
  })

  it('binds interfaceIconStroke on every Lucide icon in app/components/ui', () => {
    expect(primitives.flatMap(primitiveProblems)).toEqual([])
  })

  it('binds interfaceIconStroke on every icon a consumer passes into a primitive slot', () => {
    expect(consumers.flatMap(consumerProblems)).toEqual([])
  })

  it('exempts only the named 2 px state glyphs, and only where a primitive renders them', () => {
    consumers.forEach(consumerProblems)
    expect([...exemptionsUsed].sort()).toEqual([...approvedTwoPixelGlyphs.keys()].sort())
    for (const name of approvedTwoPixelGlyphs.keys()) {
      const file = [...components.values()].find((path) => basename(path, '.vue') === name)
      expect(file, name).toBeDefined()
      expect(readFileSync(repoPath(file ?? ''), 'utf8')).toMatch(/:stroke-width="2"/)
    }
  })
})
