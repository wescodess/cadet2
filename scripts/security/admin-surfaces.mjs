import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { z } from 'zod'

const owner = z.enum(['28', '74', '75'])
const manifestSchema = z
  .object({
    scope: z.string().min(1),
    convex: z.record(
      z
        .object({
          kind: z.enum([
            'query',
            'mutation',
            'action',
            'internalQuery',
            'internalMutation',
            'internalAction',
          ]),
          owner,
        })
        .strict(),
    ),
    http: z.record(z.object({ owner }).strict()),
    builtHttp: z.array(z.string().min(1)).nonempty(),
    removed: z.array(z.string().min(1)).nonempty(),
  })
  .strict()

function readManifest(root) {
  return manifestSchema.parse(
    JSON.parse(readFileSync(join(root, 'scripts/security/admin-surfaces.json'), 'utf8')),
  )
}

export function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

function exported(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
}

function importedNames(parsed) {
  const imports = new Map()
  for (const node of parsed.statements) {
    if (!ts.isImportDeclaration(node)) continue
    for (const item of node.importClause?.namedBindings?.elements ?? []) {
      imports.set(item.name.text, item.propertyName?.text ?? item.name.text)
    }
  }
  return imports
}

function registration(declaration, parsed, imports, path) {
  const call = declaration.initializer
  if (!call || !ts.isCallExpression(call))
    throw new Error(`Unclassified Convex export alias: ${path}`)
  const kind = imports.get(call.expression.getText(parsed))
  if (!/^(internal)?(query|mutation|action|Query|Mutation|Action)$/.test(kind ?? '')) {
    throw new Error(`Unclassified Convex factory: ${path}`)
  }
  const options = call.arguments[0]
  const handler = options?.properties?.find(
    (property) => property.name?.getText(parsed) === 'handler',
  )?.initializer
  const first = handler?.body?.statements?.[0]?.getText(parsed) ?? ''
  return {
    name: declaration.name.getText(parsed),
    kind,
    guarded: /^(?:const [\s\S]*?= )?await requireRagAdmin\(ctx\)/.test(first),
  }
}

function registrations(path, source) {
  const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
  const imports = importedNames(parsed)
  const rows = []
  for (const node of parsed.statements) {
    if (ts.isExportDeclaration(node)) throw new Error(`Unclassified Convex re-export: ${path}`)
    if (ts.isExportAssignment(node) && !/\/(schema|auth\.config|convex\.config)\.ts$/.test(path)) {
      throw new Error(`Unclassified Convex default export: ${path}`)
    }
    if (!exported(node) || !ts.isVariableStatement(node)) continue
    rows.push(
      ...node.declarationList.declarations.map((declaration) =>
        registration(declaration, parsed, imports, path),
      ),
    )
  }
  return rows
}

function checkRegistration(name, row, expected) {
  if (!expected) throw new Error(`Unclassified Convex registration: ${name}`)
  if (name.startsWith('rag') && expected.owner !== '74')
    throw new Error(`Changed RAG authority classification: ${name}`)
  const legacyClosure = expected.owner !== '74' && row.kind.startsWith('internal')
  if (row.kind !== expected.kind && !legacyClosure)
    throw new Error(`Changed Convex visibility: ${name}`)
  if (expected.owner === '74' && !row.kind.startsWith('internal') && !row.guarded) {
    throw new Error(`Missing admin admission before reads: ${name}`)
  }
}

function inspectConvex(root, manifest) {
  const actual = new Map()
  const files = sourceFiles(join(root, 'convex')).filter(
    (path) => path.endsWith('.ts') && !path.includes('/_generated/'),
  )
  for (const path of files) {
    const module = relative(join(root, 'convex'), path).replaceAll('\\', '/').replace(/\.ts$/, '')
    for (const row of registrations(path, readFileSync(path, 'utf8'))) {
      const name = `${module}:${row.name}`
      checkRegistration(name, row, manifest.convex[name])
      actual.set(name, row)
    }
  }
  for (const [name, expected] of Object.entries(manifest.convex)) {
    if (expected.owner === '74' && !actual.has(name))
      throw new Error(`Missing classified registration: ${name}`)
  }
  return actual
}

function checkHttpAdmission(path, name, source) {
  if (name.includes('/admin/') || name.includes('/ai-search/')) {
    const parsed = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    const entry = parsed.statements.find(ts.isExportAssignment)?.expression?.arguments?.[0]
    const first = entry?.body?.statements?.[0]?.getText(parsed) ?? ''
    if (!/^(?:const [\s\S]*?= )?await requireAdminSession\(event\)/.test(first)) {
      throw new Error(`Missing HTTP admission: ${name}`)
    }
  }
  if (/createConvexAdminClient|ActingAs|ragSourcesInternal/.test(source))
    throw new Error(`Privileged admin transport: ${name}`)
}

function inspectHttp(root, manifest) {
  const handlers = sourceFiles(join(root, 'server/api')).filter((path) => path.endsWith('.ts'))
  for (const path of handlers) {
    const name = relative(root, path).replaceAll('\\', '/')
    if (!manifest.http[name]) throw new Error(`Unclassified HTTP registration: ${name}`)
    if (
      /\/admin\/|\/ai-search\/|\/internal\/scheduler\//.test(name) &&
      manifest.http[name].owner !== '74'
    )
      throw new Error(`Changed admin authority classification: ${name}`)
    if (manifest.http[name].owner === '74')
      checkHttpAdmission(path, name, readFileSync(path, 'utf8'))
  }
  return handlers
}

function rejectSourceReference(root, path) {
  const source = readFileSync(path, 'utf8')
  if (
    !path.endsWith('/server/utils/cloudflare-ai-search.ts') &&
    /cloudflare-ai-search|queryCloudflareAiSearch/.test(source)
  )
    throw new Error(`Disabled AI Search provider reference: ${relative(root, path)}`)
  if (
    /rag-ingestion-phase3|cloudflare-ai-search-sync|bootstrapCurrentUserAsAdmin|syncAdminFromNuxtAllowlist|sync-current-user|createConvexAdminClientActingAs/.test(
      source,
    )
  )
    throw new Error(`Removed execution or bootstrap reference: ${relative(root, path)}`)
}

function rejectExecutionImports(root) {
  for (const directory of ['server', 'app', 'convex']) {
    const files = sourceFiles(join(root, directory)).filter(
      (path) => /\.(ts|vue)$/.test(path) && !path.includes('/_generated/'),
    )
    for (const path of files) {
      rejectSourceReference(root, path)
    }
  }
}

function rejectRequestInitialization(root) {
  for (const name of ['pathwayDefinitionService', 'pathwayRuleService']) {
    const source = readFileSync(join(root, `server/utils/pathways/${name}.ts`), 'utf8')
    if (/CREATE\s+(TABLE|INDEX)|ensureSeeded|MVP_PATHWAY_INVENTORY_SEEDS/.test(source))
      throw new Error(`Request-time initialization: ${name}`)
  }
}

export function inspectAdminSources(root) {
  const manifest = readManifest(root)
  const actual = inspectConvex(root, manifest)
  const handlers = inspectHttp(root, manifest)
  const names = new Set([...actual.keys(), ...handlers.map((path) => relative(root, path))])
  for (const name of manifest.removed) {
    if (names.has(name)) throw new Error(`Removed admin entry returned: ${name}`)
  }
  rejectExecutionImports(root)
  rejectRequestInitialization(root)
  return { convex: actual.size, http: handlers.length }
}

export function inspectBuiltAdminRoutes(root) {
  const source = readFileSync(join(root, '.output/server/chunks/nitro/nitro.mjs'), 'utf8')
  const manifest = readManifest(root)
  const routes = [
    ...source.matchAll(/\{ route: '([^']+)', handler:.*?method: ("([^"]+)"|undefined)/g),
  ]
    .map((match) => `${match[3]?.toUpperCase() ?? '*'} ${match[1]}`)
    .sort()
  if (routes.length === 0) throw new Error('Built HTTP registration manifest is empty')
  for (const route of routes) {
    if (!manifest.builtHttp.includes(route))
      throw new Error(`Unclassified built HTTP registration: ${route}`)
  }
  return routes
}
