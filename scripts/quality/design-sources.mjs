import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import * as css from 'css-tree'
import { adaptDesignSource, analyseDesignInputs, styleDefinitions } from './design-adapters.mjs'
import { designAuthority } from './design-authority.mjs'
import { parseStylesheet } from './design-css.mjs'
import { children, createValuePolicy, keyword } from './design-values.mjs'

const uiExtension =
  /\.(?:vue|[cm]?[jt]sx?|css|pcss|postcss|scss|sass|less|styl|svg|html|htm|svelte|astro|mdx)$/
const styleExtension = /\.(?:css|pcss|postcss|scss|sass|less|styl)(?:[?#].*)?$/
const unimplemented = /\.(?:scss|sass|less|styl|svg|html|htm|svelte|astro|mdx)(?:[?#].*)?$/
const packages = new Set(['tailwindcss', 'tw-animate-css'])

function cssImports(inputs) {
  const imports = [...inputs.imports]
  for (const style of inputs.styles) {
    const { ast } = parseStylesheet(style.text)
    if (!ast) continue
    css.walk(ast, (node) => {
      if (node.type === 'Url' && /(?:\.svg(?:[?#].*)?$|^data:image\/svg)/i.test(node.value))
        imports.push({
          value: node.value,
          index: style.offset + node.loc.start.offset,
          asset: true,
        })
      if (node.type !== 'Atrule') return
      if (!['import', 'reference'].includes(keyword(node.name)) || !node.prelude) return
      try {
        const value = css.parse(node.prelude.value, { context: 'value' })
        const first = children(value)[0]
        if (!['String', 'Url'].includes(first?.type))
          throw new Error('static stylesheet path required')
        imports.push({
          value: first.value,
          index: style.offset + node.prelude.loc.start.offset,
          css: true,
        })
      } catch {
        imports.push({ value: '', index: style.offset + node.loc.start.offset, css: true })
      }
    })
  }
  return imports
}

function relevantImport(item) {
  if (item.css || (!item.script && !item.asset)) return true
  if (styleExtension.test(item.value) || /\.svg(?:[?#].*)?$/.test(item.value)) return true
  if (!item.script || !/^(?:\.{1,2}\/|~{1,2}\/|@{1,2}\/|\/(?!\/))/.test(item.value)) return false
  return !/\.(?:json|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|pdf|txt)(?:[?#].*)?$/i.test(
    item.value,
  )
}

function modulePath(path) {
  if (existsSync(path) && statSync(path).isFile()) return path
  const extensions = ['.ts', '.js', '.vue', '.mts', '.cts', '.mjs', '.cjs', '.jsx', '.tsx']
  const matches = extensions
    .flatMap((extension) => [path + extension, resolve(path, 'index' + extension)])
    .filter((candidate) => existsSync(candidate) && statSync(candidate).isFile())
  return matches.length === 1 ? matches[0] : null
}

function localImport(root, from, value) {
  if (/[?#]/.test(value) || /^(?:https?:|data:|\/\/)/.test(value) || !value) return null
  if (value.startsWith('~~/') || value.startsWith('@@/'))
    return modulePath(resolve(root, value.slice(3)))
  if (value.startsWith('~/') || value.startsWith('@/'))
    return modulePath(resolve(root, 'app', value.slice(2)))
  if (value.startsWith('/')) return modulePath(resolve(root, 'public', value.slice(1)))
  return value.startsWith('.') ? modulePath(resolve(root, dirname(from), value)) : null
}

function sourceProblem(record, item, construct) {
  record.inputs.findings.push({
    messageId: 'unsupportedSource',
    index: item.index,
    length: 1,
    construct,
  })
}

function followImports(record, root, visit) {
  for (const item of cssImports(record.inputs).filter(relevantImport)) {
    if (packages.has(item.value) && item.css) continue
    const target = localImport(root, record.file, item.value)
    const dependency = target
      ? visit(relative(root, target), !item.script || styleExtension.test(item.value))
      : null
    if (!dependency)
      sourceProblem(record, item, `unresolved local stylesheet/source ${item.value || '(dynamic)'}`)
    else record.dependencies.push(dependency.file)
  }
}

function unsupportedSource(file, construct) {
  const inputs = {
    text: '',
    unread: true,
    styles: [],
    candidates: [],
    paints: [],
    imports: [],
    findings: [{ messageId: 'unsupportedSource', index: 0, length: 1, construct }],
  }
  return { file, inputs, authority: false, dependencies: [], findings: [] }
}

export async function collectDesignSources({
  root = process.cwd(),
  inventory,
  legacy,
  entries = ['app/assets/css/tailwind.css'],
  supplied = [],
  approved = designAuthority(root),
}) {
  const records = new Map()
  const selected = inventory.filter(
    (file) => file.startsWith('app/') && uiExtension.test(file) && !legacy.has(file),
  )
  if (supplied.length && !selected.length) return []
  const requested = selected.filter((file) => supplied.includes(file))
  const roots = supplied.length && requested.length === supplied.length ? requested : selected
  const canonicalRoot = realpathSync(root)
  function unavailable(file, construct) {
    const record = unsupportedSource(file, construct)
    records.set(file, record)
    return record
  }
  function visit(file, forceCss = false) {
    const absolute = resolve(root, file)
    if (!existsSync(absolute)) return unavailable(file, 'missing selected source')
    const canonical = realpathSync(absolute)
    if (canonical !== resolve(canonicalRoot, relative(root, absolute)))
      return unavailable(file, 'linked source is unsupported; use a regular local source')
    if (!canonical.startsWith(canonicalRoot + '/'))
      return unavailable(file, 'source leaves the selected worktree')
    const key = relative(canonicalRoot, canonical).replaceAll('\\', '/')
    if (records.has(key)) return records.get(key)
    const text = readFileSync(canonical, 'utf8')
    const authority = key === 'docs/design/system/tokens.css' && text === approved
    const inputs = authority
      ? { text, styles: [], imports: [], findings: [], paints: [], candidates: [] }
      : adaptDesignSource(text, forceCss && !unimplemented.test(key) ? `${key}.css` : key, {
          importsOnly: legacy.has(key) && /\.(?:vue|[cm]?[jt]sx?)$/.test(key),
        })
    const record = { file: key, inputs, authority, dependencies: [], findings: [] }
    records.set(key, record)
    followImports(record, root, visit)
    return record
  }
  const context = new Set()
  function markContext(record) {
    if (!record || context.has(record.file)) return
    context.add(record.file)
    record.context = true
    record.dependencies.forEach((file) => markContext(records.get(file)))
  }
  for (const file of entries.filter((file) => existsSync(resolve(root, file))))
    markContext(visit(file))
  for (const file of roots) visit(file)
  if (supplied.length && ![...records.keys()].some((file) => supplied.includes(file))) return []
  const definitions = [...records.values()].flatMap((record) => styleDefinitions(record.inputs))
  const policy = createValuePolicy({ approved, definitions })
  for (const record of records.values())
    record.findings = analyseDesignInputs(record.inputs, policy)
  return [...records.values()]
}
