import { describe, it } from 'vitest'
import { RuleTester } from 'eslint'
import vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'

import { designRule } from '../../scripts/quality/design-rule.mjs'

RuleTester.describe = (_name, run) => run()
RuleTester.it = (_name, run) => run()

const vue = new RuleTester({
  languageOptions: {
    parser: vueParser,
    parserOptions: { parser: tseslint.parser, sourceType: 'module' },
  },
})
const ts = new RuleTester({ languageOptions: { parser: tseslint.parser } })

const sfc = (template, script = '') =>
  `<script setup lang="ts">\n${script}\n</script>\n\n<template>\n${template}\n</template>\n`

describe('design ratchet rule', () => {
  it('accepts token utilities, the var shorthand and plain hrefs', () => {
    vue.run('relay-design', designRule, {
      valid: [
        sfc(
          '<span class="bg-role-soft text-role-ink rounded-chip text-chip min-h-chip"><a href="#add">Add</a></span>',
        ),
        sfc("<p :class=\"cn('shadow-(--shadow-overlay)', open && 'edge-selected')\">Text</p>"),
        sfc(
          '<svg viewBox="0 0 24 24" stroke="currentColor"><path d="M12 12V6.4A5.6 5.6 0 0 1 17.6 12z" /></svg>',
        ),
      ],
      invalid: [],
    })
  })

  it.each([
    ['an inline style', sfc('<p style="color: red">x</p>'), 'inlineStyle'],
    ['a bound inline style', sfc('<p :style="{ width: size }">x</p>'), 'inlineStyle'],
    ['an arbitrary value', sfc('<p class="min-h-[44px]">x</p>'), 'arbitraryValue'],
    ['an arbitrary colour value', sfc('<p class="bg-[var(--trust)]">x</p>'), 'arbitraryValue'],
    ['an arbitrary property', sfc('<p class="[mask-type:luminance]">x</p>'), 'arbitraryValue'],
    ['a hex colour', sfc('<svg><path fill="#1F2329" /></svg>'), 'rawColour'],
    ['a colour function', sfc('<p>x</p>', "const shade = 'rgba(0, 0, 0, 0.4)'"), 'rawColour'],
    ['a Tailwind palette colour', sfc('<p class="text-slate-700">x</p>'), 'rawColour'],
    ['plain white', sfc('<p class="bg-white">x</p>'), 'rawColour'],
  ])('rejects %s in a Vue file', (_name, code, messageId) => {
    vue.run('relay-design', designRule, { valid: [], invalid: [{ code, errors: [{ messageId }] }] })
  })

  it('rejects raw colours and arbitrary values in TypeScript class maps', () => {
    ts.run('relay-design', designRule, {
      valid: ["export const tone = { role: 'bg-card text-role-ink' }"],
      invalid: [
        { code: "export const tone = 'text-amber-900'", errors: [{ messageId: 'rawColour' }] },
        { code: "export const tone = 'gap-[5px]'", errors: [{ messageId: 'arbitraryValue' }] },
      ],
    })
  })
})
