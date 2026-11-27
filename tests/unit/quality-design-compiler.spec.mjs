// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { compileDesignCandidates } from '../../scripts/quality/design-compiler.mjs'
import { compiledDesignFindings } from '../../scripts/quality/design-compiler-contract.mjs'

const approved = readFileSync('docs/design/system/tokens.css', 'utf8')

it('rejects painting raw defaults while preserving approved shadow shorthand and numeric disc expansion', async () => {
  const positive = await compileDesignCandidates({
    approved,
    sources: ['@utility disc-*{--disc:calc(--value(integer)*1px);width:var(--disc)}'],
    candidates: ['text-primary/50', 'bg-card', 'shadow-(--shadow-overlay)', 'disc-24'],
  })
  expect(positive.findings).toEqual([])
  expect(positive.css).toContain('var(--shadow-overlay)')
  expect(positive.css).toMatch(/--disc:\s*calc\(24\s*\*\s*1px\)/)
  for (const candidates of [['ring-2', 'ring-offset-2'], ['shadow-sm'], ['text-red-500']]) {
    const result = await compileDesignCandidates({ approved, candidates })
    expect(result.findings, candidates.join(' ')).not.toEqual([])
  }
})

it('fails unknown candidate expansions and altered compiler-owned registration shapes', async () => {
  expect(
    (await compileDesignCandidates({ approved, candidates: ['text-missing-origin'] })).findings,
  ).not.toEqual([])
  expect(
    (
      await compileDesignCandidates({
        approved,
        sources: ['@utility disc-*{width:calc(--value(integer)*1px)}'],
        candidates: ['disc-not-an-integer'],
      })
    ).findings,
  ).not.toEqual([])
  const positive = await compileDesignCandidates({
    approved,
    candidates: ['shadow-(--shadow-overlay)'],
  })
  expect(
    compiledDesignFindings(
      positive.css.replace('initial-value: #fff;', 'initial-value: red;'),
      approved,
    ),
  ).not.toEqual([])
  expect(
    compiledDesignFindings(
      positive.css.replaceAll('--tw-shadow-alpha', '--tw-future-alpha'),
      approved,
    ),
  ).not.toEqual([])
})

it('checks token-only container, fallback and custom-utility transformations', async () => {
  const sources = [
    '.probe{color:light-dark(var(--foreground),var(--card));filter:drop-shadow(0 0 2px var(--foreground));stroke:var(--glyph-cut,var(--card))}',
    '.probe{background:color-mix(in srgb,var(--card),transparent)}',
    '@utility panel-ink{color:var(--foreground)}',
    '.text{content:"red #abc rgb(0 0 0)";font-family:red;animation:red 1s;background:url("#abc")} @keyframes red{to{opacity:0}}',
    ...['linear', 'radial', 'conic'].flatMap((kind) =>
      ['', 'repeating-'].map(
        (prefix) => `.probe{background:${prefix}${kind}-gradient(var(--card),transparent)}`,
      ),
    ),
  ]
  const result = await compileDesignCandidates({
    approved,
    sources,
    candidates: ['panel-ink', 'text-primary/50'],
  })
  expect(result.findings).toEqual([])
  expect(result.css).toContain('color: var(--foreground)')
  expect(result.css).toContain('var(--glyph-cut,var(--card))')
  expect(result.css).toContain('color-mix(in srgb,var(--card),transparent)')
  expect(
    compiledDesignFindings(result.css.replace('in lab, red, red', 'in lab, blue, red'), approved),
  ).not.toEqual([])
})
