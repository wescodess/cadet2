// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { collectDesignSources } from '../../scripts/quality/design-sources.mjs'
import {
  adaptDesignSource,
  analyseDesignInputs,
  styleDefinitions,
} from '../../scripts/quality/design-adapters.mjs'
import { createValuePolicy } from '../../scripts/quality/design-values.mjs'

it('checks the complete new inventory and reached local CSS once, including ignored tracked and QA paths', async () => {
  const root = mkdtempSync(join(tmpdir(), 'design-sources-'))
  const fixtures = {
    'app/ProbeView.vue': '<template><p>Control</p></template><style src="../qa/a.css"/>',
    'qa/a.css': '@import "./b.css"; p{color:rebeccapurple}',
    'qa/b.css': '@import "./a.css"; p{color:var(--foreground)}',
    'app/orphan.css': 'p{color:red}',
    'app/ignored.css': 'p{color:blue}',
  }
  try {
    for (const [file, text] of Object.entries(fixtures)) {
      mkdirSync(join(root, file, '..'), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    const result = await collectDesignSources({
      root,
      inventory: Object.keys(fixtures),
      legacy: new Set(['qa/a.css', 'qa/b.css']),
      entries: [],
      approved: readFileSync('docs/design/system/tokens.css', 'utf8'),
    })
    expect(result.map((entry) => entry.file).sort()).toEqual(Object.keys(fixtures).sort())
    for (const file of ['qa/a.css', 'app/orphan.css', 'app/ignored.css']) {
      expect(result.find((entry) => entry.file === file).findings, file).toEqual(
        expect.arrayContaining([expect.objectContaining({ messageId: 'rawColour' })]),
      )
    }
    expect(result.find((entry) => entry.file === 'qa/b.css').findings).toEqual([])
    const partial = await collectDesignSources({
      root,
      inventory: Object.keys(fixtures),
      legacy: new Set(['qa/a.css', 'qa/b.css']),
      supplied: ['qa/a.css', 'app/orphan.css'],
      entries: [],
      approved: readFileSync('docs/design/system/tokens.css', 'utf8'),
    })
    const external = partial.find((entry) => entry.file === 'qa/a.css')
    expect(external).toBeDefined()
    expect(external.findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ messageId: 'rawColour' })]),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

it('rejects recognizable CSS injection and generated class choices instead of ignoring them', () => {
  const approved = readFileSync('docs/design/system/tokens.css', 'utf8')
  for (const source of [
    'const sheet = new CSSStyleSheet()',
    'document.head.innerHTML = "<style>p{color:red}</style>"',
    'export const classes = `text-${tone}`',
    'import("./later.css")',
    'const style = css`p{color:red}`',
    'element["style"]["color"] = "red"',
  ]) {
    const inputs = adaptDesignSource(source, 'app/classes.ts')
    const policy = createValuePolicy({ approved, definitions: styleDefinitions(inputs) })
    expect(analyseDesignInputs(inputs, policy), source).not.toEqual([])
  }
})

it('rejects external or preprocessed SFC markup and script inputs', () => {
  for (const source of [
    '<template src="./external.html"/>',
    '<template lang="pug">svg: path(fill="red")</template>',
    '<script src="./external.js"/><template><p>Control</p></template>',
  ])
    expect(adaptDesignSource(source, 'app/ExternalView.vue').findings, source).not.toEqual([])
})

it('checks both logical alternatives and the static keys of class objects', () => {
  const approved = readFileSync('docs/design/system/tokens.css', 'utf8')
  const check = (source) => {
    const inputs = adaptDesignSource(source, 'app/ChoiceView.vue')
    return analyseDesignInputs(inputs, createValuePolicy({ approved }))
  }
  for (const source of [
    `<template><svg><path :fill="'red' || 'var(--card)'"/></svg></template>`,
    `<template><p :class="'text-red-500' || 'text-primary'">Control</p></template>`,
  ])
    expect(check(source), source).toEqual(
      expect.arrayContaining([expect.objectContaining({ messageId: 'rawColour' })]),
    )
  expect(
    check(
      `<template><p :class="{ 'text-primary': open, 'bg-card': !open }">Control</p></template>`,
    ),
  ).toEqual([])
})

it('rejects unresolved paint producers, spread tables and mutable aliases', () => {
  const cases = [
    ['const props = defineProps<{class:string}>()', 'props.class'],
    ['declare const runtime:string; const cn = () => runtime', "cn('var(--card)')"],
    [
      'declare const outside:Record<string,string>; declare const key:string; const tones = {...outside, safe:"var(--card)"}',
      'tones[key]',
    ],
    ['declare const runtime:string; let paint = "var(--card)"; paint = runtime', 'paint'],
    [
      'declare const runtime:string; const tones = {ink:"var(--card)"}; tones.ink = runtime',
      'tones.ink',
    ],
  ]
  for (const [script, paint] of cases) {
    const source = `<script setup lang="ts">${script}</script><template><svg><path :fill="${paint.replaceAll('"', '&quot;')}"/></svg></template>`
    const inputs = adaptDesignSource(source, 'app/UnresolvedPaintView.vue')
    expect(
      analyseDesignInputs(
        inputs,
        createValuePolicy({ approved: readFileSync('docs/design/system/tokens.css', 'utf8') }),
      ),
      paint,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ messageId: 'unsupportedSyntax' })]))
  }
})

it('keeps ordinary script text separate from paint values', () => {
  const inputs = adaptDesignSource(
    'export const message = "rgb(255 0 0)"; export const anchor = "#abc"',
    'app/copy.ts',
  )
  expect(analyseDesignInputs(inputs, createValuePolicy())).toEqual([])
})

it('reports the original bound-SVG operand after JavaScript escapes', () => {
  for (const source of [
    String.raw`<template><svg><path :fill="'var(\u002d\u002dforeground, red)'"/></svg></template>`,
    '<template><svg><path :fill="`var(${\'--foreground\'}, red)`"/></svg></template>',
  ]) {
    const inputs = adaptDesignSource(source, 'app/PaintView.vue')
    const policy = createValuePolicy({
      approved: readFileSync('docs/design/system/tokens.css', 'utf8'),
    })
    expect(analyseDesignInputs(inputs, policy), source).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ messageId: 'rawColour', index: source.indexOf('red)') }),
      ]),
    )
  }
})

it('follows static script references and rejects SVG images reached from CSS', async () => {
  const root = mkdtempSync(join(tmpdir(), 'design-references-'))
  const fixtures = {
    'app/references.ts':
      'import "../styles/a.css"; export const href = new URL("../styles/b.pcss", import.meta.url)',
    'styles/a.css': '@reference "./c.css"; p{background:url("../assets/icon.svg")}',
    'styles/b.pcss': 'p{color:blue}',
    'styles/c.css': 'p{color:red}',
    'assets/icon.svg': '<svg><path fill="red"/></svg>',
  }
  try {
    for (const [file, text] of Object.entries(fixtures)) {
      mkdirSync(join(root, file, '..'), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    const result = await collectDesignSources({
      root,
      inventory: Object.keys(fixtures),
      legacy: new Set(),
      entries: [],
      approved: readFileSync('docs/design/system/tokens.css', 'utf8'),
    })
    expect(result.map((entry) => entry.file).sort()).toEqual(Object.keys(fixtures).sort())
    expect(result.find((entry) => entry.file === 'assets/icon.svg').findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ messageId: 'unsupportedSource' })]),
    )
    for (const file of ['styles/b.pcss', 'styles/c.css'])
      expect(result.find((entry) => entry.file === file).findings).toEqual(
        expect.arrayContaining([expect.objectContaining({ messageId: 'rawColour' })]),
      )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

it('reaches CSS through local script reexports without widening the legacy class ratchet', async () => {
  const root = mkdtempSync(join(tmpdir(), 'design-module-closure-'))
  const fixtures = {
    'app/entry.ts': 'import "../modules"; export const classes = "text-primary"',
    'modules/index.ts': 'export * from "./feature"',
    'modules/feature.ts':
      'import "../styles/outside.css"; export const legacyClass = "text-red-500"',
    'styles/outside.css': 'p{color:red}',
  }
  try {
    for (const [file, text] of Object.entries(fixtures)) {
      mkdirSync(join(root, file, '..'), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    const result = await collectDesignSources({
      root,
      inventory: Object.keys(fixtures),
      legacy: new Set(['modules/index.ts', 'modules/feature.ts', 'styles/outside.css']),
      entries: [],
      approved: readFileSync('docs/design/system/tokens.css', 'utf8'),
    })
    expect(result.map((entry) => entry.file).sort()).toEqual(Object.keys(fixtures).sort())
    expect(result.find((entry) => entry.file === 'styles/outside.css').findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ messageId: 'rawColour' })]),
    )
    expect(result.find((entry) => entry.file === 'modules/feature.ts').findings).toEqual([])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

it('reports unsupported linked roots instead of silently omitting them', async () => {
  const root = mkdtempSync(join(tmpdir(), 'design-linked-root-'))
  const target = mkdtempSync(join(tmpdir(), 'design-linked-target-'))
  try {
    mkdirSync(join(root, 'app'))
    writeFileSync(join(target, 'raw.css'), 'p{color:red}')
    symlinkSync(join(target, 'raw.css'), join(root, 'app/linked.css'))
    const result = await collectDesignSources({
      root,
      inventory: ['app/linked.css'],
      legacy: new Set(),
      entries: [],
      supplied: ['app/linked.css'],
      approved: readFileSync('docs/design/system/tokens.css', 'utf8'),
    })
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: 'app/linked.css',
          findings: expect.arrayContaining([
            expect.objectContaining({ messageId: 'unsupportedSource' }),
          ]),
        }),
      ]),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
    rmSync(target, { recursive: true, force: true })
  }
})
