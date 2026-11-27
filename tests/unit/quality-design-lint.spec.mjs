// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'

let source
let output

beforeEach(() => {
  source = mkdtempSync('app/design-lint-probe-')
  output = mkdtempSync('.quality-output/design-lint-')
})

afterEach(() => {
  rmSync(source, { recursive: true, force: true })
  rmSync(output, { recursive: true, force: true })
})

function lint(fixtures) {
  const files = Object.entries(fixtures).map(([name, text]) => {
    const file = join(source, name)
    writeFileSync(file, text)
    return resolve(file)
  })
  const result = spawnSync('pnpm', ['lint', ...files], {
    encoding: 'utf8',
    env: { ...process.env, QUALITY_OUTPUT_DIR: resolve(output) },
  })
  if (result.error) throw result.error
  return {
    ...result,
    findings: JSON.parse(readFileSync(join(output, 'lint.json'), 'utf8')),
  }
}

it('the public lint command rejects raw colours in SVG, scoped styles and plain stylesheets', () => {
  const result = lint({
    'ColourAttributeProbe.vue': [
      '<template><svg>',
      '  <path fill="red" />',
      '  <path :stroke="\'rebeccapurple\'" />',
      "  <path :fill=\"true ? 'red' : 'blue'\" />",
      '  <path :stroke="`rebeccapurple`" />',
      '  <path :fill="`rgb(${255} 0 0)`" />',
      '</svg></template>',
      '<style scoped>p { color: red; }</style>',
      '',
    ].join('\n'),
    'ImportedProbe.vue': '<template><p>Example</p></template>\n<style src="./imported.css" />\n',
    'imported.css': 'p { color: red; }\n',
    'hex.css': 'p { border-color: #ff0000; }\n',
    'function.css': 'p { box-shadow: 0 0 2px rgb(255 0 0); }\n',
    'fallback.css': 'p { background: linear-gradient(var(--card), blue); }\n',
    'mask.css': 'p { mask-image: linear-gradient(red, var(--card)); }\n',
    'emphasis.css': 'p { text-emphasis: filled red; }\n',
    'custom.css': ':root { --new-shade: red; }\n',
    'escaped.css': 'p { c\\6flor: r\\65 d; }\n',
    'escaped-function.css': 'p { color: r\\67 b(255 0 0); }\n',
    'palette.css': 'p { @apply text-slate-700; }\n',
  })
  expect(result.status, result.stdout + result.stderr).toBe(1)
  const attributes = result.findings.find((entry) =>
    entry.filePath.endsWith('/ColourAttributeProbe.vue'),
  )
  for (const line of [2, 3, 4, 5, 6, 8])
    expect(attributes.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'relay/design', messageId: 'rawColour', line }),
      ]),
    )
  for (const name of [
    'ColourAttributeProbe.vue',
    'imported.css',
    'hex.css',
    'function.css',
    'fallback.css',
    'mask.css',
    'emphasis.css',
    'custom.css',
    'escaped.css',
    'escaped-function.css',
    'palette.css',
  ]) {
    const file = result.findings.find((entry) => entry.filePath === join(source, name))
    expect(file, name).toBeDefined()
    expect(file.messages, name).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'relay/design', messageId: 'rawColour' }),
      ]),
    )
  }
}, 60000)

it('the public lint command accepts tokens, colour-independent text and anchors', () => {
  const result = lint({
    'TokensProbe.vue':
      '<template><a href="#add" class="text-primary">red</a><a :href="\'#add\'">Anchor</a><p>red #abc rgb(0 0 0)</p><svg><path fill="var(--foreground)" stroke="currentColor" /><path fill="url(#abc)" /></svg></template>\n<style scoped>p { color: var(--foreground); background: color-mix(in srgb, var(--card), transparent); content: "red #abc rgb(0 0 0)"; }</style>\n',
    'tokens.css':
      '#add { color: var(--foreground); border: 1px solid var(--input); background: url("#abc"); content: "red #abc rgb(0 0 0)"; font-family: red; animation: red 1s; }\n@keyframes red { to { opacity: 0; } }\n',
  })
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect(result.findings.every((entry) => entry.messages.length === 0)).toBe(true)
}, 60000)
