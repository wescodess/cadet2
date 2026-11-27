import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import * as css from 'css-tree'
import { compile } from 'tailwindcss'
import { staticCandidates } from './design-adapters.mjs'
import { parseStylesheet } from './design-css.mjs'
import { compiledDesignFindings } from './design-compiler-contract.mjs'
import { keyword } from './design-values.mjs'

const require = createRequire(import.meta.url)
const packageRoot = dirname(require.resolve('tailwindcss/package.json'))

function compilerSource(source, utilities) {
  const { ast } = parseStylesheet(source)
  if (!ast) throw new Error('Compiler contract requires parsed authoring input')
  css.walk(ast, {
    visit: 'Atrule',
    enter(node, item, list) {
      if (keyword(node.name) === 'utility' && node.prelude) utilities.add(node.prelude.value.trim())
      if (['import', 'reference'].includes(keyword(node.name))) list.remove(item)
    },
  })
  return css.generate(ast)
}

function declaredUtility(candidate, utilities) {
  const base = candidate.split(':').at(-1).replace(/^!|!$/g, '')
  return [...utilities].some((name) =>
    name.endsWith('*') ? base.startsWith(name.slice(0, -1)) : base === name,
  )
}

function candidateFindings(output, candidates, utilities) {
  const rendered = new Set()
  css.walk(css.parse(output), (node) => {
    if (node.type === 'ClassSelector') rendered.add(css.ident.decode(node.name))
  })
  return candidates
    .filter(
      (candidate) =>
        (declaredUtility(candidate, utilities) ||
          /^(?:(?:[^:]+):)*!?(?:bg|text|border|ring|fill|stroke|outline|from|via|to|shadow|decoration|divide|placeholder|caret|accent|animate)-/.test(
            candidate,
          )) &&
        !rendered.has(candidate),
    )
    .map((candidate) => ({
      messageId: 'compilerContract',
      index: 0,
      length: 1,
      construct: `unresolved utility candidate ${candidate}`,
    }))
}

export async function compileDesignCandidates({ approved, sources = [], candidates = [] }) {
  const version = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')).version
  if (version !== '4.2.0')
    throw new Error(`Tailwind compiler contract requires 4.2.0; found ${version}`)
  const utilities = new Set()
  const source = `@import "tailwindcss/theme.css"; @tailwind utilities; ${approved}\n${sources.map((source) => compilerSource(source, utilities)).join('\n')}`
  const compiler = await compile(source, {
    base: packageRoot,
    async loadStylesheet(id) {
      if (id !== 'tailwindcss/theme.css') throw new Error(`Unexpected compiler import ${id}`)
      const path = resolve(packageRoot, 'theme.css')
      return { path, base: packageRoot, content: readFileSync(path, 'utf8') }
    },
  })
  const output = compiler.build([...new Set(candidates)])
  return {
    css: output,
    findings: [
      ...candidateFindings(output, candidates, utilities),
      ...compiledDesignFindings(output, approved),
    ],
  }
}

function candidateInputs(record) {
  const candidates = [...record.inputs.candidates]
  for (const source of record.inputs.styles) {
    const { ast } = parseStylesheet(source.text)
    if (!ast) continue
    css.walk(ast, {
      visit: 'Atrule',
      enter(node) {
        if (keyword(node.name) !== 'apply' || !node.prelude) return
        candidates.push(
          ...staticCandidates(node.prelude.value, source.offset + node.prelude.loc.start.offset),
        )
      },
    })
  }
  return candidates
}

function dependencyRecords(record, records, selected = new Set()) {
  if (selected.has(record)) return selected
  selected.add(record)
  for (const file of record.dependencies) {
    const dependency = records.find((item) => item.file === file)
    if (dependency) dependencyRecords(dependency, records, selected)
  }
  return selected
}

async function checkRecords(records, approved) {
  const sources = records.flatMap((record) => record.inputs.styles.map((style) => style.text))
  const candidates = records.flatMap(candidateInputs).map((item) => item.value)
  try {
    return await compileDesignCandidates({ approved, sources, candidates })
  } catch (error) {
    return {
      css: null,
      findings: [{ messageId: 'compilerContract', construct: error.message, index: 0, length: 1 }],
    }
  }
}

export async function checkDesignCompilation(records, approved) {
  const active = records.filter((record) => !record.authority && !record.findings.length)
  const union = await checkRecords(active, approved)
  if (!union.findings.length) return union
  let attributed = false
  for (const record of active.filter((item) => !item.context)) {
    const scope = [
      ...new Set([...active.filter((item) => item.context), ...dependencyRecords(record, active)]),
    ]
    const result = await checkRecords(scope, approved)
    if (!result.findings.length) continue
    attributed = true
    const index = candidateInputs(record)[0]?.index ?? record.inputs.styles[0]?.offset ?? 0
    record.findings.push(...result.findings.map((item) => ({ ...item, index })))
  }
  if (!attributed && active.length) active[0].findings.push(...union.findings)
  return union
}
