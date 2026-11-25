import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, normalize } from 'node:path'
import { babelParse, parse } from 'vue/compiler-sfc'

import { repoPath } from './css-source'

export type Overlay = Record<string, string>

export const approvedTwoPixelGlyphs = new Map([
  ['StateGlyph', 'DESIGN.md:241: state glyphs render at 2 px stroke'],
])

const uiRoot = 'app/components/ui'
const adoptedConsumerRoots = ['app/specimen']
const lucideSource = /^(?:@lucide\/|lucide(?:$|[-/]))/
const strokeModule = /^[@~]\/lib\/relay\/icons$/
const strokeDefinition = 'app/lib/relay/icons.ts'
const strokeBinding = 'interfaceIconStroke'
const strokeBindNames = new Set(['stroke-width', 'strokeWidth'])
const strokeOverride = /(?:^|[\s'"`:!])stroke-(?:\d|\[|\()|stroke-width\s*:/
const scriptFile = /\.(?:vue|ts|js|mjs|tsx|jsx)$/
const scriptExtensions = ['.ts', '.js', '.mjs', '.tsx', '.jsx', '.vue']
const nameResolvers = new Set(['resolveComponent', 'resolveDynamicComponent'])
const builtInComponents = new Set([
  'Component',
  'Transition',
  'TransitionGroup',
  'KeepAlive',
  'Teleport',
  'Suspense',
  'ClientOnly',
  'NuxtLink',
])

const ELEMENT = 1
const INTERPOLATION = 5
const ATTRIBUTE = 6
const DIRECTIVE = 7
const COMPONENT_TAG = 1

interface TemplateProp {
  type: number
  name: string
  rawName?: string
  arg?: { content: string; isStatic: boolean }
  exp?: { content: string }
  value?: { content: string }
  modifiers?: unknown[]
}

interface TemplateNode {
  type: number
  tag?: string
  tagType?: number
  props?: TemplateProp[]
  children?: TemplateNode[]
  content?: { content?: string }
  loc: { start: { line: number } }
}

interface AstNode {
  type: string
  loc?: { start: { line: number } }
  [key: string]: unknown
}

interface Facts {
  file: string
  vue: boolean
  lucide: Set<string>
  imports: Map<string, string>
  localSources: string[]
  scriptValues: Map<string, number>
  reusable: Set<string>
  strokeImported: boolean
  template: TemplateNode[]
  problems: string[]
}

interface Run {
  overlay: Overlay
  components: Map<string, string>
  scope: Map<string, Facts>
  queue: string[]
  exemptionsUsed: Set<string>
  problems: Map<string, string[]>
}

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

function pascal(tag: string) {
  return tag
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function identifiers(expression: string) {
  return expression.match(/[A-Za-z_$][\w$]*/g) ?? []
}

function isLocal(source: string) {
  return /^(?:[@~]{1,2}\/|#shared\/|\.\.?\/)/.test(source)
}

function isPrimitive(file: string | undefined) {
  return Boolean(file?.startsWith(`${uiRoot}/`))
}

function localName(specifier: AstNode) {
  return String((specifier.local as AstNode).name)
}

function readLucideImport(facts: Facts, specifiers: AstNode[], where: string) {
  if (!facts.vue)
    facts.problems.push(
      `${where} uses Lucide outside a .vue template, so its stroke cannot be checked`,
    )
  for (const specifier of specifiers) {
    if (specifier.type !== 'ImportSpecifier')
      facts.problems.push(`${where} imports Lucide as a whole module (${localName(specifier)})`)
    else if (specifier.importKind !== 'type' && facts.vue) facts.lucide.add(localName(specifier))
  }
}

function readValueImport(facts: Facts, source: string, specifiers: AstNode[], where: string) {
  if (isLocal(source) || source === '#components') facts.localSources.push(source)
  for (const specifier of specifiers) {
    if (specifier.importKind === 'type') continue
    const local = localName(specifier)
    facts.imports.set(local, source)
    if (local !== strokeBinding) continue
    const imported = specifier.imported as AstNode | undefined
    if (strokeModule.test(source) && imported?.name === strokeBinding) facts.strokeImported = true
    else facts.problems.push(`${where} imports another ${strokeBinding} from ${source}`)
  }
}

function readImport(facts: Facts, statement: AstNode, where: string) {
  if (statement.importKind === 'type') return
  const source = String((statement.source as AstNode).value)
  const specifiers = statement.specifiers as AstNode[]
  if (lucideSource.test(source)) readLucideImport(facts, specifiers, where)
  else readValueImport(facts, source, specifiers, where)
}

function literalText(node: AstNode) {
  if (node.type === 'StringLiteral') return String(node.value)
  if (node.type === 'TemplateElement') return (node.value as { raw: string }).raw
  return ''
}

function readLiteral(facts: Facts, node: AstNode, where: string) {
  const text = literalText(node)
  if (strokeOverride.test(text))
    facts.problems.push(
      `${where} sets a stroke width in a string, which can override the icon stroke`,
    )
  if (!lucideSource.test(text)) return
  facts.problems.push(
    facts.vue
      ? `${where} loads Lucide outside a static named import, so its stroke cannot be checked`
      : `${where} uses Lucide outside a .vue template, so its stroke cannot be checked`,
  )
}

function readDynamicImport(facts: Facts, node: AstNode, where: string) {
  const call = node.type === 'CallExpression' && (node.callee as AstNode).type === 'Import'
  if (node.type !== 'ImportExpression' && !call) return
  const target = (node.source ?? (node.arguments as AstNode[])[0]) as AstNode | undefined
  const source = target?.type === 'StringLiteral' ? String(target.value) : ''
  if (isLocal(source)) facts.localSources.push(source)
  else if (!lucideSource.test(source))
    facts.problems.push(`${where} loads a module dynamically, so its icons cannot be checked`)
}

function readReusable(facts: Facts, node: AstNode) {
  if (node.type !== 'VariableDeclarator') return
  const init = node.init as AstNode | null
  const callee = init?.type === 'CallExpression' ? (init.callee as AstNode) : undefined
  const id = node.id as AstNode
  if (callee?.type !== 'Identifier' || callee.name !== 'createReusableTemplate') return
  if (facts.imports.get('createReusableTemplate') !== '@vueuse/core') return
  if (id.type !== 'ArrayPattern') return
  for (const element of id.elements as (AstNode | null)[])
    if (element?.type === 'Identifier') facts.reusable.add(String(element.name))
}

function readCall(facts: Facts, node: AstNode, where: string) {
  if (node.type !== 'CallExpression') return
  const callee = node.callee as AstNode
  if (callee.type !== 'Identifier' || !nameResolvers.has(String(callee.name))) return
  facts.problems.push(
    `${where} calls ${String(callee.name)}(), so the component it renders cannot be resolved`,
  )
}

function readIdentifier(facts: Facts, node: AstNode, line: number) {
  if (node.type !== 'Identifier' && node.type !== 'JSXIdentifier') return
  const name = String(node.name)
  const where = `${facts.file}:${String(line)}`
  if (name === strokeBinding && facts.file !== strokeDefinition)
    facts.problems.push(
      `${where} uses ${strokeBinding} in script; only a template :stroke-width binding may use it`,
    )
  if (facts.lucide.has(name))
    facts.problems.push(
      `${where} references Lucide icon ${name} in script, so its stroke cannot be checked`,
    )
  if (facts.imports.has(name) && !facts.scriptValues.has(name)) facts.scriptValues.set(name, line)
}

function readScriptNode(facts: Facts, node: AstNode, line: number) {
  const where = `${facts.file}:${String(line)}`
  readLiteral(facts, node, where)
  readDynamicImport(facts, node, where)
  readReusable(facts, node)
  readCall(facts, node, where)
  readIdentifier(facts, node, line)
}

function parseProgram(facts: Facts, code: string, lang: string) {
  const plugins: ('typescript' | 'jsx')[] = /^(?:ts|tsx|mts|cts)$/.test(lang) ? ['typescript'] : []
  if (lang.endsWith('x')) plugins.push('jsx')
  try {
    return babelParse(code, { sourceType: 'module', plugins }).program as unknown as {
      body: AstNode[]
    }
  } catch (error) {
    facts.problems.push(
      `${facts.file}: cannot be parsed, so its icons cannot be checked (${String(error)})`,
    )
    return { body: [] }
  }
}

function readScript(facts: Facts, code: string, lang: string, offset: number) {
  const program = parseProgram(facts, code, lang)
  const lineOf = (node: AstNode) => offset + (node.loc?.start.line ?? 1)
  for (const statement of program.body)
    if (statement.type === 'ImportDeclaration')
      readImport(facts, statement, `${facts.file}:${String(lineOf(statement))}`)
  for (const statement of program.body) {
    if (statement.type === 'ImportDeclaration') continue
    const source = statement.source as AstNode | null | undefined
    if (typeof source?.value === 'string' && isLocal(source.value))
      facts.localSources.push(source.value)
    for (const node of walk(statement)) readScriptNode(facts, node, lineOf(node))
  }
}

function readSfc(facts: Facts, text: string) {
  const { descriptor, errors } = parse(text, { filename: facts.file })
  if (errors.length)
    facts.problems.push(`${facts.file}: cannot be parsed, so its icons cannot be checked`)
  for (const block of [descriptor.script, descriptor.scriptSetup])
    if (block) readScript(facts, block.content, block.lang ?? 'js', block.loc.start.line - 1)
  facts.template = (descriptor.template?.ast?.children ?? []) as unknown as TemplateNode[]
  for (const style of descriptor.styles)
    if (/stroke-width|(?:^|[\s:])stroke-(?:\d|\[|\()/.test(style.content))
      facts.problems.push(
        `${facts.file}:${String(style.loc.start.line)} a <style> block sets a stroke width`,
      )
}

const factsCache = new Map<string, Facts>()

function sourceFacts(file: string, text: string): Facts {
  const key = `${file}\0${text}`
  const cached = factsCache.get(key)
  if (cached) return cached
  const facts: Facts = {
    file,
    vue: file.endsWith('.vue'),
    lucide: new Set(),
    imports: new Map(),
    localSources: [],
    scriptValues: new Map(),
    reusable: new Set(),
    strokeImported: false,
    template: [],
    problems: [],
  }
  if (facts.vue) readSfc(facts, text)
  else readScript(facts, text, file.split('.').pop() ?? 'js', 0)
  factsCache.set(key, facts)
  return facts
}

function isStrokeBinding(prop: TemplateProp) {
  return (
    prop.type === DIRECTIVE &&
    prop.name === 'bind' &&
    Boolean(prop.arg?.isStatic) &&
    strokeBindNames.has(prop.arg?.content ?? '') &&
    !prop.modifiers?.length &&
    prop.exp?.content.trim() === strokeBinding
  )
}

function propText(prop: TemplateProp) {
  return prop.type === ATTRIBUTE ? (prop.value?.content ?? '') : (prop.exp?.content ?? '')
}

function competingStroke(prop: TemplateProp) {
  if (prop.type === DIRECTIVE && prop.name !== 'bind') return false
  const name = prop.type === ATTRIBUTE ? prop.name : (prop.arg?.content ?? '')
  if (prop.type === DIRECTIVE && strokeBindNames.has(name)) return false
  if (/stroke/i.test(name)) return true
  return name === 'style' && (prop.type === DIRECTIVE || /stroke/i.test(propText(prop)))
}

function propProblem(prop: TemplateProp, where: string) {
  const raw = prop.rawName ?? prop.name
  if (prop.type === DIRECTIVE && prop.arg && !prop.arg.isStatic)
    return `${where} has a dynamic bind argument ${raw}, so its stroke cannot be checked`
  if (prop.type === DIRECTIVE && (prop.name === 'bind' || prop.name === 'on') && !prop.arg)
    return `${where} spreads ${raw}, so its stroke cannot be checked`
  return competingStroke(prop) ? `${where} has competing stroke attribute ${raw}` : null
}

function iconProblems(node: TemplateNode, facts: Facts) {
  const props = node.props ?? []
  const where = `${facts.file}:${String(node.loc.start.line)} <${node.tag ?? ''}>`
  const problems = props.flatMap((prop) => propProblem(prop, where) ?? [])
  const bound = props.filter(
    (prop) =>
      prop.type === DIRECTIVE &&
      prop.name === 'bind' &&
      prop.arg?.isStatic &&
      strokeBindNames.has(prop.arg.content),
  )
  if (bound.length !== 1 || !bound.every(isStrokeBinding))
    problems.push(`${where} has no :stroke-width="${strokeBinding}"`)
  else if (!facts.strokeImported)
    problems.push(`${where} binds ${strokeBinding} without importing it from lib/relay/icons`)
  return problems
}

function report(run: Run, file: string, problem: string) {
  run.problems.set(file, [...(run.problems.get(file) ?? []), problem])
}

function readSource(run: Run, file: string) {
  return run.overlay[file] ?? readFileSync(repoPath(file), 'utf8')
}

function isFile(run: Run, file: string) {
  if (file in run.overlay) return true
  try {
    return statSync(repoPath(file)).isFile()
  } catch {
    return false
  }
}

function diskFiles(directory: string): string[] {
  return readdirSync(repoPath(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? diskFiles(path) : [path]
  })
}

function sourceFiles(overlay: Overlay, directory: string) {
  const added = Object.keys(overlay).filter((path) => path.startsWith(`${directory}/`))
  return [...new Set([...diskFiles(directory), ...added])].filter((path) => scriptFile.test(path))
}

function componentMap(overlay: Overlay) {
  const components = new Map<string, string>()
  for (const file of sourceFiles(overlay, 'app/components')) {
    if (!file.endsWith('.vue')) continue
    const parts = dirname(file).slice('app/components'.length).split('/').filter(Boolean)
    const name = basename(file, '.vue')
    const prefix = parts.map(pascal).join('')
    components.set(name.startsWith(prefix) ? name : prefix + name, file)
    if (isPrimitive(file)) components.set(name, file)
  }
  return components
}

function sourceBase(source: string, from: string) {
  if (/^[@~]\//.test(source)) return join('app', source.slice(2))
  if (/^[@~]{2}\//.test(source)) return source.slice(3)
  if (source.startsWith('#shared/')) return join('shared', source.slice('#shared/'.length))
  return normalize(join(dirname(from), source))
}

function resolveSource(run: Run, source: string, from: string) {
  const base = sourceBase(source, from)
  const candidates = [
    base,
    ...scriptExtensions.map((extension) => base + extension),
    ...scriptExtensions.map((extension) => join(base, `index${extension}`)),
  ]
  return candidates.find((candidate) => isFile(run, candidate))
}

function reach(run: Run, file: string) {
  if (!run.scope.has(file) && scriptFile.test(file)) run.queue.push(file)
}

function resolveAutoImport(run: Run, facts: Facts, name: string, where: string) {
  if (facts.reusable.has(name)) return
  const file = run.components.get(pascal(name).replace(/^Lazy(?=[A-Z])/, ''))
  if (file) reach(run, file)
  else if (!builtInComponents.has(pascal(name)))
    report(
      run,
      facts.file,
      `${where} cannot be resolved to a checked source, so its icons cannot be checked`,
    )
}

function resolveTag(run: Run, facts: Facts, name: string, line: number) {
  const where = `${facts.file}:${String(line)} <${name}>`
  const source = facts.imports.get(pascal(name)) ?? facts.imports.get(name)
  if (source === undefined) {
    resolveAutoImport(run, facts, name, where)
    return
  }
  if (!isLocal(source)) return
  const file = resolveSource(run, source, facts.file)
  if (file && (file.endsWith('.vue') || isPrimitive(file))) reach(run, file)
  else
    report(
      run,
      facts.file,
      `${where} comes from ${source}, which cannot be resolved to a .vue file, so its icons cannot be checked`,
    )
}

function primitiveImport(run: Run, facts: Facts, name: string) {
  const source = facts.imports.get(name)
  if (!source || !/^[A-Z]/.test(name) || !isLocal(source)) return false
  return isPrimitive(resolveSource(run, source, facts.file))
}

function interpolationProblems(run: Run, facts: Facts, node: TemplateNode, where: string) {
  for (const name of identifiers(node.content?.content ?? '')) {
    if (facts.lucide.has(name))
      report(
        run,
        facts.file,
        `${where} uses Lucide icon ${name} as a value in {{ }}, so its stroke cannot be checked`,
      )
    if (name === strokeBinding)
      report(
        run,
        facts.file,
        `${where} {{ }} uses ${strokeBinding} outside a :stroke-width binding`,
      )
  }
}

function dynamicTarget(node: TemplateNode) {
  const is = (node.props ?? []).find(
    (prop) =>
      (prop.type === ATTRIBUTE && prop.name === 'is') ||
      (prop.type === DIRECTIVE && prop.arg?.isStatic && prop.arg.content === 'is'),
  )
  const target = is
    ? propText(is)
        .trim()
        .replace(/^(['"`])(.*)\1$/, '$2')
    : ''
  return { is, target }
}

function directiveNameProblems(
  run: Run,
  facts: Facts,
  prop: TemplateProp,
  name: string,
  context: { where: string; consumer: boolean; host: string },
) {
  const raw = prop.rawName ?? prop.name
  const { where } = context
  if (facts.lucide.has(name))
    report(
      run,
      facts.file,
      `${where} uses Lucide icon ${name} as a value in ${raw}, so its stroke cannot be checked`,
    )
  if (name === strokeBinding && !isStrokeBinding(prop))
    report(
      run,
      facts.file,
      `${where} ${raw}="${prop.exp?.content ?? ''}" uses ${strokeBinding} outside a :stroke-width binding`,
    )
  if (context.consumer && name !== context.host && primitiveImport(run, facts, name))
    report(
      run,
      facts.file,
      `${where} uses primitive ${name} as a value in ${raw}, so the icons it hosts cannot be checked`,
    )
}

function propProblems(
  run: Run,
  facts: Facts,
  node: TemplateNode,
  where: string,
  consumer: boolean,
) {
  const { is } = dynamicTarget(node)
  const hostExpression = is?.type === DIRECTIVE ? (is.exp?.content.trim() ?? '') : ''
  for (const prop of node.props ?? []) {
    if (strokeOverride.test(propText(prop)))
      report(
        run,
        facts.file,
        `${where} ${prop.rawName ?? prop.name} sets a stroke width, which can override the icon stroke`,
      )
    if (prop.type !== DIRECTIVE) continue
    const host = prop === is ? hostExpression : ''
    const dynamicArg = prop.arg && !prop.arg.isStatic ? prop.arg.content : ''
    for (const name of [propText(prop), dynamicArg].flatMap(identifiers))
      directiveNameProblems(run, facts, prop, name, { where, consumer, host })
  }
}

function elementProblems(run: Run, facts: Facts, node: TemplateNode, consumer: boolean) {
  const tag = node.tag ?? ''
  const line = node.loc.start.line
  const where = `${facts.file}:${String(line)}`
  propProblems(run, facts, node, where, consumer)
  if (node.tagType === COMPONENT_TAG && facts.lucide.has(pascal(tag))) {
    for (const problem of iconProblems(node, facts)) report(run, facts.file, problem)
    return
  }
  if (tag.includes('.')) {
    report(
      run,
      facts.file,
      `${where} <${tag}> cannot be resolved to a checked source, so its icons cannot be checked`,
    )
    return
  }
  if (node.tagType === COMPONENT_TAG && tag !== 'component') {
    resolveTag(run, facts, tag, line)
    return
  }
  const { target } = dynamicTarget(node)
  if (tag !== 'component' || !/^[A-Za-z_$][\w$-]*$/.test(target)) return
  if (facts.imports.has(target) || run.components.has(pascal(target)))
    resolveTag(run, facts, target, line)
}

function visitTemplate(run: Run, facts: Facts, nodes: TemplateNode[], consumer: boolean) {
  for (const node of nodes) {
    const where = `${facts.file}:${String(node.loc.start.line)}`
    if (node.type === INTERPOLATION) interpolationProblems(run, facts, node, where)
    if (node.type === ELEMENT && node.tag) elementProblems(run, facts, node, consumer)
    visitTemplate(run, facts, node.children ?? [], consumer)
  }
}

function followImports(run: Run, facts: Facts) {
  for (const source of facts.localSources) {
    if (source === '#components') {
      for (const [name, from] of facts.imports) if (from === source) resolveTag(run, facts, name, 1)
      continue
    }
    const target = resolveSource(run, source, facts.file)
    if (target) reach(run, target)
    else
      report(
        run,
        facts.file,
        `${facts.file}: imports ${source}, which cannot be resolved, so its icons cannot be checked`,
      )
  }
}

function renderedTags(nodes: TemplateNode[], tags = new Set<string>()) {
  for (const node of nodes) {
    if (node.type === ELEMENT && node.tagType === COMPONENT_TAG && node.tag)
      tags.add(pascal(node.tag))
    renderedTags(node.children ?? [], tags)
  }
  return tags
}

function check(run: Run, file: string) {
  const facts = sourceFacts(file, readSource(run, file))
  run.scope.set(file, facts)
  followImports(run, facts)
  const name = basename(file, '.vue')
  if (facts.vue && !isPrimitive(file) && approvedTwoPixelGlyphs.has(name)) {
    run.exemptionsUsed.add(name)
    return
  }
  for (const problem of facts.problems) report(run, file, problem)
  const consumer = !isPrimitive(file)
  for (const [value, line] of facts.scriptValues)
    if (consumer && primitiveImport(run, facts, value))
      report(
        run,
        file,
        `${file}:${String(line)} uses primitive ${value} as a value in script, so the icons it hosts cannot be checked`,
      )
  if (!facts.vue) return
  visitTemplate(run, facts, facts.template, consumer)
  const rendered = renderedTags(facts.template)
  for (const icon of facts.lucide)
    if (!rendered.has(icon))
      report(
        run,
        file,
        `${file}: imports Lucide icon ${icon} but never renders it as a checked element`,
      )
}

export function strokeGuard(overlay: Overlay = {}) {
  const run: Run = {
    overlay,
    components: componentMap(overlay),
    scope: new Map(),
    queue: [],
    exemptionsUsed: new Set(),
    problems: new Map(),
  }
  const primitives = sourceFiles(overlay, uiRoot)
  for (const file of [
    ...primitives,
    ...adoptedConsumerRoots.flatMap((root) => sourceFiles(overlay, root)),
  ])
    reach(run, file)
  for (let file = run.queue.shift(); file; file = run.queue.shift())
    if (!run.scope.has(file)) check(run, file)

  const files = [...run.scope.keys()]
  const consumers = files.filter((file) => !isPrimitive(file))
  const problemsIn = (selected: string[]) =>
    selected.flatMap((file) => run.problems.get(file) ?? [])
  return {
    primitives,
    consumers,
    components: run.components,
    iconCount: primitives.reduce(
      (count, file) => count + (run.scope.get(file)?.lucide.size ?? 0),
      0,
    ),
    primitiveProblems: problemsIn(files.filter(isPrimitive)),
    consumerProblems: problemsIn(consumers),
    exemptionsUsed: [...run.exemptionsUsed].sort(),
  }
}
