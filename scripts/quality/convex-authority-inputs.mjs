import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import ts from 'typescript'
import { parseDocument } from 'yaml'
import { git } from './common.mjs'
import { structuralFiles } from './structural.mjs'

export const builderNames = [
  'query',
  'internalQuery',
  'mutation',
  'internalMutation',
  'action',
  'internalAction',
  'httpAction',
]
const defaultSlots = {
  schema: 'schema',
  http: 'http',
  crons: 'crons',
  'convex.config': 'config',
  'auth.config': 'auth',
}
const resolverOptions = {
  bundle: true,
  format: 'esm',
  target: 'esnext',
  jsx: 'automatic',
  conditions: ['convex', 'module'],
  treeShaking: true,
  define: { 'process.env.NODE_ENV': '"production"' },
}
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const digestJSON = (value) => digest(JSON.stringify(value))
const sdkIntegrity = {
  'convex@1.32.0':
    'sha512-5FlajdLpW75pdLS+/CgGH5H6yeRuA+ru50AKJEYbJpmyILUS+7fdTvsdTaQ7ZFXMv0gE8mX4S+S3AtJ94k0mfw==',
  'esbuild@0.27.0':
    'sha512-jd0f4NHbD6cALCyGElNpGAOtWxSq46l9X/sWB0Nzd5er4Kz2YTm+Vl0qKFT9KUJvD8+fiO8AvoHhFvEatfVixA==',
  'typescript@5.9.3':
    'sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==',
  '@convex-dev/better-auth@0.10.11':
    'sha512-/MiwwX7GyhddjeV3GtwWU8BOVnazkPjt/CcckcLtIn/zpj7CWV66cPiYfOzlpwF8/dRa52Emf9xw1Px+q5baTA==',
  '@esbuild/darwin-arm64@0.27.0':
    'sha512-uJOQKYCcHhg07DL7i8MzjvS2LaP7W7Pn/7uA0B5S1EnqAirJtbyw4yC5jQ5qcFjHK9l6o/MX9QisBg12kNkdHg==',
  '@esbuild/linux-x64@0.27.0':
    'sha512-1hBWx4OUJE2cab++aVZ7pObD6s+DK4mPGpemtnAORBvb5l/g5xFGk0vc0PjSkrDs0XaXj9yyob3d14XqvnQ4gw==',
}

export function authorityError(file, code, detail, chain = []) {
  const error = new Error(`Unsupported Convex 1.32.0 authority in ${file}: ${code} ${detail}`)
  error.diagnostic = { file, code, detail, chain }
  return error
}
export function unwrap(node) {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isTypeAssertionExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node))
  )
    node = node.expression
  return node
}
export function parseSource(file, text) {
  return ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS,
  )
}
export function strictJSON(file, text, jsonc = false) {
  const code = jsonc ? 'compiler_scope' : 'package_scope'
  const ast = ts.parseJsonText(file, text)
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const keys = node.properties.map((property) => property.name?.text)
      if (keys.some((key) => typeof key !== 'string') || new Set(keys).size !== keys.length)
        throw authorityError(file, code, 'duplicate or unsupported JSON keys')
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (ast.parseDiagnostics.length) throw authorityError(file, code, 'invalid JSON syntax')
  if (!jsonc) {
    try {
      return JSON.parse(text)
    } catch {
      throw authorityError(file, code, 'invalid JSON syntax')
    }
  }
  const result = ts.parseConfigFileTextToJson(file, text)
  if (result.error) throw authorityError(file, 'compiler_scope', 'invalid compiler JSON')
  return result.config
}
function pathIdentity(path) {
  let stat
  try {
    stat = lstatSync(path, { throwIfNoEntry: false })
  } catch (error) {
    if (error.code !== 'ENOTDIR') throw error
  }
  if (!stat) return { path, present: false }
  let realpath
  try {
    realpath = realpathSync(path)
  } catch {
    throw authorityError(path, 'source_identity', 'unresolved filesystem identity')
  }
  const row = {
    path,
    present: true,
    regular: stat.isFile(),
    directory: stat.isDirectory(),
    symlink: stat.isSymbolicLink(),
    realpath,
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
  }
  if (stat.isFile()) Object.assign(row, { sha256: digest(readFileSync(path)), bytes: stat.size })
  return row
}
function ancestry(path) {
  const paths = []
  for (let directory = dirname(path); ; directory = dirname(directory)) {
    paths.push(directory)
    if (dirname(directory) === directory) return paths
  }
}
function canonicalPath(path, code = 'source_identity') {
  const directories = ancestry(path)
  for (const candidate of [path, ...directories]) {
    const row = pathIdentity(candidate)
    if (
      !row.present ||
      row.symlink ||
      row.realpath !== candidate ||
      (candidate === path ? !row.regular : !row.directory)
    )
      throw authorityError(path, code, `noncanonical regular-file ancestry: ${candidate}`)
  }
}
function bindings(statement) {
  const clause = statement.importClause
  const rows = []
  if (clause?.name)
    rows.push({
      local: clause.name.text,
      imported: 'default',
      typeOnly: Boolean(clause.isTypeOnly),
      start: clause.name.getStart(),
      end: clause.name.end,
    })
  const named = clause?.namedBindings
  if (named && ts.isNamespaceImport(named))
    rows.push({
      local: named.name.text,
      imported: '*',
      typeOnly: Boolean(clause.isTypeOnly),
      start: named.name.getStart(),
      end: named.name.end,
    })
  if (named && ts.isNamedImports(named))
    for (const item of named.elements)
      rows.push({
        local: item.name.text,
        imported: (item.propertyName ?? item.name).text,
        typeOnly: Boolean(clause.isTypeOnly || item.isTypeOnly),
        start: item.name.getStart(),
        end: item.name.end,
      })
  return rows
}
function erasedStatement(statement) {
  return Boolean(
    statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DeclareKeyword),
  )
}
function importFact(statement) {
  let values
  if (ts.isImportDeclaration(statement)) values = bindings(statement)
  else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
    const named = statement.exportClause
    values =
      named && ts.isNamedExports(named)
        ? named.elements.map((item) => ({
            local: item.name.text,
            imported: (item.propertyName ?? item.name).text,
            typeOnly: Boolean(statement.isTypeOnly || item.isTypeOnly),
            start: item.getStart(),
            end: item.end,
          }))
        : []
  } else return []
  const erased = ts.isImportDeclaration(statement)
    ? statement.importClause?.isTypeOnly
    : statement.isTypeOnly
  return [
    {
      start: statement.getStart(),
      specifier: statement.moduleSpecifier.text,
      bindings: values,
      runtime: !erased && (!values.length || values.some((item) => !item.typeOnly)),
    },
  ]
}
function variableFacts(statement) {
  if (!ts.isVariableStatement(statement)) return []
  return statement.declarationList.declarations.map((declaration) => {
    const node = unwrap(declaration.initializer)
    const callee = node && ts.isCallExpression(node) ? unwrap(node.expression) : null
    return {
      name: ts.isIdentifier(declaration.name) ? declaration.name.text : null,
      start: declaration.getStart(),
      end: declaration.end,
      nameEnd: declaration.name.end,
      constant: (statement.declarationList.flags & ts.NodeFlags.BlockScoped) === ts.NodeFlags.Const,
      erased: erasedStatement(statement),
      exported: Boolean(
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
      ),
      identifier: node && ts.isIdentifier(node) ? node.text : null,
      callee: callee && ts.isIdentifier(callee) ? callee.text : null,
    }
  })
}
function functionFacts(statement) {
  if (!ts.isFunctionDeclaration(statement) || !statement.name) return []
  return [
    {
      name: statement.name.text,
      start: statement.name.getStart(),
      end: statement.name.end,
      erased: erasedStatement(statement),
    },
  ]
}
function exportFacts(statement) {
  if (erasedStatement(statement)) return []
  const exported = statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  )
  if (ts.isVariableStatement(statement) && exported)
    return variableFacts(statement)
      .filter((row) => row.name)
      .map((row) => ({ name: row.name, local: row.name, start: row.start, end: row.nameEnd }))
  if (ts.isFunctionDeclaration(statement) && statement.name && exported)
    return [
      {
        name: statement.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
          ? 'default'
          : statement.name.text,
        local: statement.name.text,
        start: statement.name.getStart(),
        end: statement.name.end,
      },
    ]
  if (
    !ts.isExportDeclaration(statement) ||
    statement.isTypeOnly ||
    !statement.exportClause ||
    !ts.isNamedExports(statement.exportClause)
  )
    return []
  return statement.exportClause.elements
    .filter((item) => !item.isTypeOnly)
    .map((item) => ({
      name: item.name.text,
      local: statement.moduleSpecifier ? null : (item.propertyName ?? item.name).text,
      start: item.getStart(),
      end: item.end,
    }))
}
function defaultFacts(statement) {
  if (!ts.isExportAssignment(statement)) return []
  const node = unwrap(statement.expression)
  return [
    {
      start: statement.getStart(),
      end: statement.end,
      local: ts.isIdentifier(node) ? node.text : null,
      expressionStart: node.getStart(),
      expressionEnd: node.end,
    },
  ]
}
function sourceFacts(file, text) {
  const ast = parseSource(file, text),
    statements = [...ast.statements],
    directive = ast.statements[0]?.expression
  return {
    file,
    imports: statements.flatMap(importFact),
    variables: statements.flatMap(variableFacts),
    functions: statements.flatMap(functionFacts),
    exports: statements.flatMap(exportFacts),
    defaults: statements.flatMap(defaultFacts),
    statements: statements.map((statement) => ({
      start: statement.getStart(),
      end: statement.end,
      kind: ts.SyntaxKind[statement.kind],
    })),
    moduleSyntax: file.endsWith('.js') || /^\s{0,100}(import|export)/m.test(text),
    useNode:
      directive?.text === 'use node' &&
      ["'use node'", '"use node"'].includes(directive.getText(ast)),
  }
}
function topNames(statement) {
  if (erasedStatement(statement)) return []
  if (ts.isVariableStatement(statement))
    return statement.declarationList.declarations.map((node) => node.name)
  if (ts.isFunctionDeclaration(statement)) return statement.name ? [statement.name] : []
  if (
    !ts.isImportDeclaration(statement) ||
    !statement.importClause ||
    statement.importClause.isTypeOnly
  )
    return []
  const clause = statement.importClause,
    names = clause.name ? [clause.name] : [],
    named = clause.namedBindings
  if (named && ts.isNamedImports(named))
    names.push(...named.elements.filter((node) => !node.isTypeOnly).map((node) => node.name))
  return names
}
function referenceSymbol(checker, node) {
  if (ts.isExportSpecifier(node.parent))
    return checker.getExportSpecifierLocalTargetSymbol(node.parent)
  if (ts.isShorthandPropertyAssignment(node.parent))
    return checker.getShorthandAssignmentValueSymbol(node.parent)
  return checker.getSymbolAtLocation(node)
}
function erasedReference(node) {
  for (let current = node; current.parent; current = current.parent) {
    if (
      ts.isTypeNode(current) ||
      ts.isTypeAliasDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      erasedStatement(current)
    )
      return true
    if (current !== node && ts.isExpression(current)) return false
  }
  return false
}
function runtimeReference(node, declarations) {
  const parent = node.parent
  if (declarations.has(node.getStart()) || erasedReference(node)) return false
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent))
    return false
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false
  if (ts.isPropertyAssignment(parent) && parent.name === node) return false
  return !(ts.isExportSpecifier(parent) && parent.propertyName && parent.name === node)
}
function lexicalModule(ast, checker, file) {
  const bindings = new Map(),
    declarations = new Set(),
    identifiers = [],
    references = []
  for (const name of ast.statements.flatMap(topNames).filter(ts.isIdentifier)) {
    const symbol = checker.getSymbolAtLocation(name)
    if (symbol) {
      bindings.set(symbol, name.text)
      declarations.add(name.getStart())
    }
  }
  function visit(node) {
    if (ts.isIdentifier(node)) {
      const binding = bindings.get(referenceSymbol(checker, node))
      if (binding) {
        const row = { binding, start: node.getStart(), end: node.end }
        identifiers.push(row)
        if (runtimeReference(node, declarations)) references.push(row)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return { file, identifiers, references }
}
function lexicalFacts(root, facts) {
  const program = ts.createProgram(
    facts.map((fact) => resolve(root, fact.file)),
    {
      allowJs: true,
      noLib: true,
      noResolve: true,
      types: [],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  )
  const checker = program.getTypeChecker()
  return facts.map(({ file }) =>
    lexicalModule(program.getSourceFile(resolve(root, file)), checker, file),
  )
}
function trackedFiles() {
  const rows = git('ls-files', '--stage', '-z')
    .split('\0')
    .filter(Boolean)
    .map((line) => {
      const [meta, file] = line.split('\t'),
        [mode, blob, stage] = meta.split(' ')
      if (stage !== '0') throw authorityError(file, 'source_identity', 'unmerged Git identity')
      return [file, { mode, blob }]
    })
  return new Map(rows)
}
function convexDirectories(root) {
  const rows = []
  function walk(directory) {
    const stat = lstatSync(directory, { throwIfNoEntry: false })
    if (!stat) return
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw authorityError(directory, 'source_identity', 'nonregular Convex directory')
    const names = readdirSync(directory).sort()
    rows.push({ path: directory, names })
    for (const name of names.filter((name) => name !== 'node_modules')) {
      const path = resolve(directory, name),
        child = lstatSync(path)
      if (child.isSymbolicLink())
        throw authorityError(path, 'source_identity', 'Convex source alias')
      if (child.isDirectory()) walk(path)
    }
  }
  walk(resolve(root, 'convex'))
  return rows
}
function installedPackages(root, lock) {
  const require = createRequire(resolve(root, 'package.json'))
  const convex = realpathSync(resolve(root, 'node_modules/convex/package.json')),
    own = createRequire(convex)
  const esbuild = own.resolve('esbuild/package.json')
  const convexReference = lock.importers?.['.']?.dependencies?.convex?.version
  const esbuildReference = lock.snapshots?.[`convex@${convexReference}`]?.dependencies?.esbuild
  const nativeName = `@esbuild/${process.platform}-${process.arch}`
  const requests = [
    ['convex', convex, '1.32.0', convexReference],
    ['esbuild', esbuild, '0.27.0', esbuildReference],
    [
      nativeName,
      createRequire(esbuild).resolve(`${nativeName}/package.json`),
      '0.27.0',
      lock.snapshots?.[`esbuild@${esbuildReference}`]?.optionalDependencies?.[nativeName],
    ],
    [
      'typescript',
      require.resolve('typescript/package.json'),
      '5.9.3',
      lock.importers?.['.']?.devDependencies?.typescript?.version,
    ],
    [
      '@convex-dev/better-auth',
      resolve(root, 'node_modules/@convex-dev/better-auth/package.json'),
      '0.10.11',
      lock.importers?.['.']?.dependencies?.['@convex-dev/better-auth']?.version,
    ],
  ]
  return requests.map(([name, path, version, reference]) => {
    const real = realpathSync(path),
      store = resolve(root, 'node_modules/.pnpm') + '/'
    const manifest = strictJSON(real, readFileSync(real, 'utf8'))
    if (
      typeof reference !== 'string' ||
      reference.includes('patch_hash=') ||
      (reference !== version && !reference.startsWith(version + '('))
    )
      throw authorityError(path, 'resolved_target', 'unsupported frozen SDK dependency reference')
    const key = `${name}@${reference}`
    const folder = key
      .replace(/[\\/:*?"<>|]/g, '+')
      .replace(/\)$/, '')
      .replace(/(\)\()|\(|\)/g, '_')
    const integrity = sdkIntegrity[`${name}@${version}`]
    if (
      folder.length > 120 ||
      folder !== folder.toLowerCase() ||
      !lock.snapshots?.[key] ||
      real !== resolve(store, folder, 'node_modules', name, 'package.json') ||
      lock.packages?.[`${name}@${version}`]?.resolution?.integrity !== integrity ||
      !integrity
    )
      throw authorityError(
        path,
        'resolved_target',
        'SDK root/context/artifact is not the approved frozen selection',
      )
    if (
      !real.startsWith(store) ||
      manifest.name !== name ||
      manifest.version !== version ||
      !lock.packages?.[`${name}@${version}`]?.resolution?.integrity
    )
      throw authorityError(
        path,
        'resolved_target',
        'package is not selected by this checkout frozen lock',
      )
    canonicalPath(real, 'package_scope')
    const packageRoot = dirname(real),
      files = []
    function visit(path) {
      const stat = lstatSync(path)
      if (stat.isDirectory()) {
        for (const name of readdirSync(path).sort()) visit(resolve(path, name))
      } else if (stat.isFile() && (path.endsWith('.js') || basename(path) === 'esbuild')) {
        canonicalPath(path, 'resolved_target')
        files.push(pathIdentity(path))
      } else if (stat.isSymbolicLink())
        throw authorityError(path, 'resolved_target', 'unexpected SDK/tool source alias')
    }
    const directory =
      name === 'convex'
        ? 'dist/esm'
        : name === '@convex-dev/better-auth'
          ? 'dist/auth-config.js'
          : name === 'typescript'
            ? 'lib/typescript.js'
            : name === 'esbuild'
              ? 'lib/main.js'
              : 'bin/esbuild'
    visit(resolve(packageRoot, directory))
    return {
      name,
      version,
      reference,
      integrity,
      root: packageRoot,
      manifest: pathIdentity(real),
      files,
    }
  })
}
function directSdkExport(ast, file, name) {
  for (const statement of ast.statements) {
    if (!statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
      continue
    const declarations = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations
      : [statement]
    const declaration = declarations.find((declaration) => declaration.name?.text === name)
    if (declaration)
      return {
        identity: pathIdentity(file),
        name,
        start: declaration.getStart(),
        end: declaration.end,
      }
  }
  return null
}
function forwardedSdkExport(root, ast, file, name, seen) {
  for (const statement of ast.statements.filter(ts.isExportDeclaration)) {
    if (!statement.moduleSpecifier) continue
    const named = statement.exportClause
    if (named && !ts.isNamedExports(named)) continue
    const binding = named?.elements.find((item) => item.name.text === name)
    if (named && !binding) continue
    const imported = binding ? (binding.propertyName ?? binding.name).text : name
    const found = sdkExport(
      root,
      resolve(dirname(file), statement.moduleSpecifier.text),
      imported,
      new Set(seen),
    )
    if (found) return found
  }
  return null
}
function sdkExport(root, path, name, seen = new Set()) {
  const file = resolve(path)
  if (!file.startsWith(root + '/') || seen.has(file)) return null
  seen.add(file)
  canonicalPath(file, 'resolved_target')
  const ast = parseSource(file, readFileSync(file, 'utf8'))
  if (ast.parseDiagnostics.length)
    throw authorityError(file, 'resolved_target', 'invalid SDK export table')
  return directSdkExport(ast, file, name) ?? forwardedSdkExport(root, ast, file, name, seen)
}
function sdkBindings(packages) {
  const convex = packages.find((item) => item.name === 'convex')
  const auth = packages.find((item) => item.name === '@convex-dev/better-auth')
  const requests = [
    [
      'convex/server',
      convex,
      './server',
      [
        ...builderNames.map((name) => `${name}Generic`),
        'defineSchema',
        'defineTable',
        'httpRouter',
        'cronJobs',
        'defineApp',
        'paginationOptsValidator',
      ],
    ],
    ['convex/values', convex, './values', ['v', 'ConvexError', 'convexToJson']],
    ['@convex-dev/better-auth/auth-config', auth, './auth-config', ['getAuthConfigProvider']],
  ]
  const rows = []
  for (const [specifier, selected, subpath, names] of requests) {
    const manifest = strictJSON(
      selected.manifest.path,
      readFileSync(selected.manifest.path, 'utf8'),
    )
    const entry = manifest.exports[subpath]
    const target = entry.import?.import ?? entry.import ?? entry.default
    if (typeof target !== 'string' || !target.endsWith('.js'))
      throw authorityError(
        selected.manifest.path,
        'resolved_target',
        'unsupported SDK ESM export target',
      )
    const path = resolve(selected.root, target)
    for (const name of names) {
      const leaf = sdkExport(selected.root, path, name)
      if (!leaf) throw authorityError(path, 'resolved_target', `missing SDK export ${name}`)
      rows.push({ specifier, name, root: pathIdentity(path), leaf })
    }
  }
  return rows
}
function nativeModule(fact, components) {
  const name = basename(fact.file),
    path = fact.file.slice('convex/'.length)
  return (
    /\.(?:ts|js)$/.test(name) &&
    !/^[.#]/.test(name) &&
    name.split('.').length === 2 &&
    !path.includes(' ') &&
    !path.startsWith('_generated/') &&
    !path.startsWith('_deps/') &&
    fact.moduleSyntax &&
    name !== 'schema.ts' &&
    name !== 'schema.js' &&
    !components.some((directory) => fact.file.startsWith(`${directory}/`))
  )
}
function registrarImports(fact) {
  const names = new Map()
  for (const edge of fact.imports.filter((edge) => edge.runtime)) {
    for (const binding of edge.bindings) {
      if (binding.typeOnly) continue
      const direct =
        edge.specifier === 'convex/server' &&
        builderNames.find((name) => `${name}Generic` === binding.imported)
      const generated =
        edge.specifier.startsWith('.') &&
        resolve(dirname(fact.file), edge.specifier).replace(/\.(ts|js)$/, '') ===
          resolve('convex/_generated/server') &&
        builderNames.includes(binding.imported)
      if (direct || generated) names.set(binding.local, direct || binding.imported)
    }
  }
  return names
}
function namedClaims(fact, names) {
  return fact.exports.flatMap((edge) => {
    const declaration = fact.variables.find((row) => row.name === edge.local)
    return names.has(declaration?.callee)
      ? [{ file: fact.file, name: edge.name, kind: names.get(declaration.callee) }]
      : []
  })
}
function rootPlatform(fact, slot) {
  if (slot && fact.useNode)
    throw authorityError(fact.file, 'value_role', 'root defaults require the isolate platform')
  if (fact.file.startsWith('convex/actions/') && !fact.useNode)
    throw authorityError(
      fact.file,
      'value_role',
      'native actions/ entries require a leading use node directive',
    )
  return fact.useNode ? 'node' : 'browser'
}
function potentialRoots(facts, defaults, components) {
  const roots = [],
    claims = []
  for (const fact of facts.filter((fact) => fact.file.startsWith('convex/'))) {
    const slot = defaults.find((row) => row.file === fact.file)?.slot
    const discoverable = nativeModule(fact, components)
    if (!slot && !discoverable) continue
    const names = registrarImports(fact)
    if (!slot && !names.size) continue
    roots.push({
      file: fact.file,
      slot: slot ?? null,
      named: discoverable,
      platform: rootPlatform(fact, slot),
    })
    if (slot) claims.push({ file: fact.file, name: 'default', kind: defaultSlots[slot] })
    if (discoverable) claims.push(...namedClaims(fact, names))
  }
  return { roots, claims }
}
function defaultSelection(root, directory, slot, witnesses, observe) {
  const choices = ['ts', 'js'].map((extension) => resolve(directory.path, `${slot}.${extension}`))
  choices.forEach(observe)
  const present = choices.filter((path) => witnesses.get(path).present)
  const rootSlot = directory.path === resolve(root, 'convex')
  if (present.length > 1 && (rootSlot || slot === 'convex.config'))
    throw authorityError(directory.path, 'source_identity', 'ambiguous default siblings')
  if (!present.length || (!rootSlot && slot !== 'convex.config')) return null
  return { file: relative(root, present[0]), rootSlot }
}
function observeDefaults(root, directories, tracked, paths, witnesses, observe) {
  const defaults = [],
    components = []
  for (const directory of directories) {
    for (const slot of Object.keys(defaultSlots)) {
      const selected = defaultSelection(root, directory, slot, witnesses, observe)
      if (!selected) continue
      const { file, rootSlot } = selected
      if (!tracked.has(file) || !paths.has(file))
        throw authorityError(
          file,
          'source_identity',
          'default/component outside tracked source population',
        )
      if (rootSlot) defaults.push({ file, slot })
      else components.push(relative(root, directory.path))
    }
  }
  return { defaults, components }
}
function observeGenerated(root, tracked, paths, witnesses, observe) {
  const generated = ['js', 'ts'].map((extension) => `convex/_generated/server.${extension}`)
  for (const file of generated) observe(resolve(root, file))
  const builders = generated.filter((file) => witnesses.get(resolve(root, file)).present)
  if (builders.length > 1)
    throw authorityError(
      'convex/_generated/server',
      'generated_mapping',
      'ambiguous generated siblings',
    )
  for (const name of ['api.js', 'api.d.ts', 'dataModel.d.ts', 'server.d.ts']) {
    const file = `convex/_generated/${name}`,
      path = resolve(root, file)
    observe(path)
    if (!witnesses.get(path).present) continue
    if (!tracked.has(file))
      throw authorityError(file, 'source_identity', 'untracked generated companion')
    canonicalPath(path)
    paths.add(file)
  }
  for (const file of builders) paths.add(file)
  return builders[0] ?? null
}
function observeAncestry(path, observe) {
  for (const directory of ancestry(path)) {
    observe(directory)
    for (const name of ['tsconfig.json', 'jsconfig.json', 'package.json', 'convex.json'])
      observe(resolve(directory, name))
    for (const name of ['convex', 'esbuild', 'typescript', '@convex-dev/better-auth'])
      observe(resolve(directory, 'node_modules', name, 'package.json'))
  }
}
function observeSourceInputs(root, paths, tracked, observe) {
  const sources = [],
    facts = []
  for (const file of [...paths].sort()) {
    if (isAbsolute(file) || relative(root, resolve(root, file)) !== file)
      throw authorityError(
        file,
        'source_identity',
        'source path must be normalized and repository relative',
      )
    const path = resolve(root, file),
      identity = pathIdentity(path)
    if (!identity.regular || identity.symlink || identity.realpath !== path)
      throw authorityError(
        file,
        'source_identity',
        'selected source must be a canonical regular file',
      )
    sources.push({ file, git: tracked.get(file) ?? null, identity })
    if (/\.(?:ts|js)$/.test(file) && !file.endsWith('.d.ts'))
      facts.push(sourceFacts(file, readFileSync(path, 'utf8')))
    observeAncestry(path, observe)
    if (/\.(?:ts|js)$/.test(file)) {
      for (const suffix of [
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.css',
        '.json',
        '.mjs',
        '.cjs',
        '.mts',
        '.cts',
      ])
        observe(path.replace(/\.(?:ts|js)$/, suffix))
    }
  }
  return { sources, facts }
}
function observeImportAlternatives(root, facts, observe) {
  const edges = facts.flatMap((fact) =>
    fact.imports
      .filter((edge) => edge.runtime && edge.specifier.startsWith('.'))
      .map((edge) => ({ file: fact.file, specifier: edge.specifier })),
  )
  for (const edge of edges) {
    const path = resolve(root, dirname(edge.file), edge.specifier)
    if (!path.startsWith(root + '/')) continue
    observe(path)
    const stem = path.replace(/\.(?:ts|js)$/, '')
    for (const suffix of ['.tsx', '.ts', '.jsx', '.js', '.css', '.json']) {
      observe(stem + suffix)
      observe(resolve(path, 'index' + suffix))
    }
    observe(resolve(path, 'package.json'))
  }
}
function frozenSelection(root, roots) {
  if (!roots.length) return { sdk: [], lockImporter: null }
  const manifest = strictJSON('package.json', readFileSync(resolve(root, 'package.json'), 'utf8'))
  if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object')
    throw authorityError('package.json', 'package_scope', 'root package must be an object')
  const document = parseDocument(readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8'), {
    uniqueKeys: true,
  })
  if (document.errors.length)
    throw authorityError('pnpm-lock.yaml', 'package_scope', 'invalid frozen lock')
  const lock = document.toJS()
  if (lock.lockfileVersion !== '9.0')
    throw authorityError('pnpm-lock.yaml', 'package_scope', 'unsupported frozen lock version')
  return { sdk: installedPackages(root, lock), lockImporter: lock.importers?.['.'] ?? null }
}
export function authoritySnapshot(selected) {
  const root = process.cwd(),
    tracked = trackedFiles(),
    population = [...selected].sort()
  if (new Set(population).size !== population.length)
    throw authorityError(root, 'source_identity', 'duplicate source population')
  const directories = convexDirectories(root),
    paths = new Set(population),
    witnesses = new Map()
  const observe = (path) => witnesses.set(path, pathIdentity(path))
  const { defaults, components } = observeDefaults(
    root,
    directories,
    tracked,
    paths,
    witnesses,
    observe,
  )
  const generated = observeGenerated(root, tracked, paths, witnesses, observe)
  const { sources, facts } = observeSourceInputs(root, paths, tracked, observe)
  observeImportAlternatives(root, facts, observe)
  observe(resolve(root, 'pnpm-lock.yaml'))
  const expected = potentialRoots(facts, defaults, components)
  const { sdk, lockImporter } = frozenSelection(root, expected.roots)
  const tooling = {
    node: process.version,
    executable: pathIdentity(realpathSync(process.execPath)),
    parser: pathIdentity(realpathSync(createRequire(import.meta.url).resolve('typescript'))),
  }
  const result = {
    root,
    head: git('rev-parse', 'HEAD'),
    indexTree: git('write-tree'),
    population,
    sources,
    facts,
    lexical: lexicalFacts(root, facts),
    directories,
    defaults,
    components,
    tooling,
    generated,
    witnesses: [...witnesses.values()].sort((a, b) => a.path.localeCompare(b.path)),
    sdk,
    sdkBindings: sdk.length ? sdkBindings(sdk) : [],
    lockImporter,
    configurationGit: [...tracked]
      .filter(([file]) =>
        /(?:^|\/)(?:package\.json|tsconfig\.json|jsconfig\.json|convex\.json|pnpm-lock\.yaml)$/.test(
          file,
        ),
      )
      .map(([file, row]) => ({ file, ...row })),
    options: resolverOptions,
    ...expected,
  }
  return { ...result, digest: digestJSON(result), populationDigest: digestJSON(population) }
}
export function revalidateSnapshot(snapshot) {
  let fresh
  try {
    fresh = authoritySnapshot(structuralFiles().filter((file) => !file.startsWith('docs/')))
  } catch (error) {
    throw authorityError(
      error.diagnostic?.file ?? 'convex',
      'source_changed',
      error.message,
      error.diagnostic?.chain ?? [],
    )
  }
  if (fresh.digest !== snapshot.digest)
    throw authorityError(
      'convex',
      'source_changed',
      'source/configuration/absence/SDK snapshot changed',
    )
}
export function requireAuthoritySource(snapshot, file) {
  const row = snapshot.sources.find((row) => row.file === file)
  if (
    !row?.git ||
    !['100644', '100755'].includes(row.git.mode) ||
    !row.identity.regular ||
    row.identity.symlink ||
    !/\.(?:ts|js)$/.test(file) ||
    file.endsWith('.d.ts')
  )
    throw authorityError(
      file,
      'source_identity',
      'authority requires a tracked regular runtime source',
    )
  canonicalPath(resolve(snapshot.root, file))
  return row
}
