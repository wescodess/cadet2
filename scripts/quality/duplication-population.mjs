import { lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { TextDecoder } from 'node:util'
import { json, localPath, outputDir, writeJSON } from './common.mjs'
import { configuration } from './structural.mjs'
import { parse, parseCensus } from './duplication.parser.mjs'
import { runScanner, scannerBudgets } from './scanner.mjs'
import { vueTokenBlocks } from './vue-token-blocks.mjs'

const policy = {
  minTokens: 100,
  minLines: 10,
  maxLines: 1000000,
  maxSize: '100mb',
  mode: 'strict',
  noGitignore: true,
}
const maxBytes = 100 * 1024 * 1024
const formats = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'jsx',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'tsx',
  '.vue': 'vue',
}
const metrics = ['sources', 'tokens']

function completeSummary(summary, expected) {
  if (
    !summary ||
    summary.totalFiles !== summary.files.length ||
    summary.totalFolders !== summary.folders.length ||
    new Set(summary.files.map((f) => f.path)).size !== summary.files.length
  )
    throw new Error('jscpd population: incomplete physical source inventory')
  const actual = new Map(summary.files.map((file) => [localPath(file.path), file]))
  if (actual.size !== expected.size || [...expected.keys()].some((file) => !actual.has(file)))
    throw new Error(
      'jscpd population: physical source inventory differs from the independent census',
    )
  for (const [file, input] of expected) {
    const row = actual.get(file)
    if (
      row.bytes !== input.bytes ||
      row.format !== input.format ||
      (input.tokens !== undefined && (row.tokens !== input.tokens || row.lines !== input.lines))
    )
      throw new Error(`jscpd population: source metrics differ from census: ${file}`)
  }
  return actual
}

function exclusion(format, bytes, lines) {
  if (!format) return 'unsupported format'
  if (!bytes) return 'empty file'
  if (bytes > maxBytes) return 'maxSize'
  if (lines > policy.maxLines) return 'maxLines'
  return null
}
function sourceInput(file) {
  if (!lstatSync(file).isFile())
    throw new Error(`jscpd population requires a regular source file: ${file}`)
  const bytes = readFileSync(file)
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  const physicalLines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
  const format = formats[extname(file)]
  return {
    text,
    input: {
      file,
      format,
      bytes: bytes.length,
      physicalLines,
      reason: exclusion(format, bytes.length, physicalLines),
    },
  }
}
function blockInputs(sources, directory) {
  const blocks = []
  for (const { text, input } of sources.filter(
    ({ input }) => input.format === 'vue' && !input.reason,
  )) {
    for (const block of vueTokenBlocks(text, input.file).filter((block) => block.text.length > 0)) {
      const path = resolve(directory, `${blocks.length}.census-${block.format}`)
      writeFileSync(path, block.text)
      blocks.push({
        file: localPath(path),
        path,
        parent: input.file,
        format: block.format,
        bytes: Buffer.byteLength(block.text),
        lineOffset: block.lineOffset,
      })
    }
  }
  return blocks
}
function collectVueGroups(blocks, rows) {
  const byFile = new Map()
  for (const block of blocks) {
    const row = rows.get(block.file)
    if (!row) throw new Error(`jscpd population: missing Vue block token census: ${block.parent}`)
    if (!row.tokens) continue
    byFile.set(block.parent, byFile.get(block.parent) ?? new Map())
    const groups = byFile.get(block.parent)
    const group = groups.get(block.format) ?? { sources: 1, tokens: 0 }
    group.tokens += row.tokens
    groups.set(block.format, group)
  }
  return byFile
}
function includeVueSources(inputs, vueGroups, tokens, expected, add) {
  for (const input of inputs.filter(
    (file) => file.format === 'vue' && file.physicalLines >= policy.minLines,
  )) {
    const groups = [...(vueGroups.get(input.file)?.entries() ?? [])].filter(
      ([, group]) => group.tokens >= policy.minTokens,
    )
    if (!groups.length) continue
    const row = tokens.get(input.file)
    if (!row) throw new Error(`jscpd population: missing eligible Vue source: ${input.file}`)
    expected.set(input.file, row)
    add('vue', { sources: 1, tokens: row.tokens })
    for (const [format, group] of groups) add(format, group)
  }
}

export async function scanDuplication(selected) {
  const config = json(configuration('jscpd.json'))
  if (Object.entries(policy).some(([key, value]) => config[key] !== value))
    throw new Error('jscpd population policy differs from the pinned detection thresholds')
  const deadlineMs = Number(process.hrtime.bigint()) / 1e6 + scannerBudgets.duplication
  const blockDirectory = resolve(outputDir, 'vue-token-blocks')
  mkdirSync(blockDirectory, { recursive: true })
  const sources = selected.map(sourceInput)
  const inputs = sources.map(({ input }) => input)
  const blocks = blockInputs(sources, blockDirectory)
  const rawInputs = inputs.filter((file) => !file.reason)
  const allowed = new Map([...rawInputs, ...blocks].map((file) => [file.file, file]))
  const rawExpected = new Map(
    [...rawInputs.filter((file) => file.format !== 'vue'), ...blocks].map((file) => [
      file.file,
      file,
    ]),
  )
  const tokenOutput = resolve(outputDir, 'token-population')
  const empty = resolve(outputDir, 'empty-population')
  mkdirSync(empty, { recursive: true })
  async function execute(name, files, directory, extra) {
    mkdirSync(directory, { recursive: true })
    for (const report of ['jscpd-report.json', 'jscpd-complexity.json'])
      rmSync(resolve(directory, report), { force: true })
    const result = await runScanner(
      name,
      configuration('../../node_modules/.bin/jscpd'),
      [
        ...(files.length ? files : [empty]),
        '--config',
        configuration('jscpd.json'),
        '--absolute',
        '--no-gitignore',
        '--workers',
        '2',
        '--reporters',
        'json',
        '--output',
        directory,
        '--silent',
        '--no-tips',
        ...extra,
      ],
      { budgetMs: scannerBudgets.duplication, deadlineMs },
    )
    if (result.status !== 0)
      throw new Error(`jscpd tool failure: exit ${result.status}: ${result.stderr}`)
    return result
  }
  writeJSON(`${outputDir}/duplication-population.json`, { policy, inputs, blocks })
  const mappings = [...new Set(blocks.map((block) => block.format))]
    .map((format) => `${format}:census-${format}`)
    .join(';')
  await execute(
    'duplication-token-census',
    [...selected, ...blocks.map((block) => block.path)],
    tokenOutput,
    [
      '--complexity',
      '--min-tokens',
      '0',
      '--min-lines',
      '0',
      '--summary-top',
      String(selected.length + blocks.length + 1),
      ...(mappings ? ['--formats-exts', mappings] : []),
    ],
  )
  const raw = parseCensus(json(resolve(tokenOutput, 'jscpd-complexity.json')))
  const rawRows = new Map(raw.summary.files.map((row) => [localPath(row.path), row]))
  const vueGroups = collectVueGroups(blocks, rawRows)
  for (const input of rawInputs.filter((file) => file.format === 'vue')) {
    if (vueGroups.has(input.file) || rawRows.has(input.file)) rawExpected.set(input.file, input)
  }
  if ([...rawRows.keys()].some((file) => !allowed.has(file)))
    throw new Error('jscpd population: token census returned an unexpected source')
  const tokens = completeSummary(raw.summary, rawExpected)
  const expected = new Map(
    [...tokens].filter(
      ([file, row]) =>
        row.format !== 'vue' &&
        rawExpected.get(file).physicalLines >= policy.minLines &&
        row.tokens >= policy.minTokens,
    ),
  )
  const expectedFormats = {}
  function add(format, values) {
    expectedFormats[format] ??= { sources: 0, tokens: 0 }
    for (const metric of metrics) expectedFormats[format][metric] += values[metric]
  }
  for (const row of expected.values()) add(row.format, { sources: 1, tokens: row.tokens })
  includeVueSources(rawInputs, vueGroups, tokens, expected, add)
  const evidence = {
    policy,
    inputs,
    blocks,
    tokenCensus: raw.summary,
    expectedFiles: [...expected.keys()].sort(),
    expectedFormats,
  }
  writeJSON(`${outputDir}/duplication-population.json`, evidence)
  const result = await execute('duplication', selected, resolve(outputDir), [
    '--summary',
    '--summary-top',
    String(selected.length + 1),
    ...(expected.size ? ['--fail-on-empty'] : []),
  ])
  const report = parse({
    status: result.status,
    stdout: readFileSync(`${outputDir}/jscpd-report.json`, 'utf8'),
  })
  writeJSON(`${outputDir}/duplication-population.json`, {
    ...evidence,
    actualSummary: report.summary,
    actualFormats: report.statistics.formats,
  })
  completeSummary(report.summary, expected)
  if (
    Object.keys(expectedFormats).length !== Object.keys(report.statistics.formats).length ||
    Object.entries(expectedFormats).some(([format, values]) =>
      metrics.some((metric) => report.statistics.formats[format]?.[metric] !== values[metric]),
    )
  )
    throw new Error('jscpd population: incomplete eligible format/token inventory')
  return report
}
