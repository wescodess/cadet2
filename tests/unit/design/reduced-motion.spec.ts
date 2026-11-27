// @vitest-environment node
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { chromium } from '@playwright/test'
import type { Browser } from '@playwright/test'
import { compile } from 'tailwindcss'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { repoPath } from './css-source'

const entry = repoPath('app/assets/css/tailwind.css')

const sheet =
  'data-[state=open]:animate-in data-[state=closed]:animate-out transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
const menu =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2'
const dialog =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200'
const overlay =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'

function packageStylesheet(id: string) {
  const root = repoPath(`node_modules/${id}`)
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    style?: string
    exports?: { '.'?: { style?: string } }
  }
  return resolve(root, manifest.exports?.['.']?.style ?? manifest.style ?? 'index.css')
}

async function compiledCss() {
  const compiler = await compile(readFileSync(entry, 'utf8'), {
    base: dirname(entry),
    loadStylesheet: (id: string, base: string) => {
      const path = id.startsWith('.') ? resolve(base, id) : packageStylesheet(id)
      return Promise.resolve({ path, base: dirname(path), content: readFileSync(path, 'utf8') })
    },
  })
  return compiler.build([sheet, menu, dialog, overlay, 'animate-spin'].join(' ').split(' '))
}

function seconds(duration: string) {
  return duration.endsWith('ms') ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration)
}

type Motion = Record<string, Record<string, string>>

let browser: Browser
let motion: Motion = {}
let fullMotion: Motion = {}

async function measure(css: string, reducedMotion: 'reduce' | 'no-preference') {
  const page = await browser.newPage({ reducedMotion })
  await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>
<div id="sheet-open" data-state="open" class="${sheet}"></div>
<div id="sheet-closed" data-state="closed" class="${sheet}"></div>
<div id="menu" data-state="open" data-side="bottom" class="${menu}"></div>
<div id="dialog" data-state="open" class="${dialog}"></div>
<div id="overlay" data-state="open" class="${overlay}"></div>
<div id="spinner" class="animate-spin"></div>
</body></html>`)
  const measured: Motion = {}
  for (const id of ['sheet-open', 'sheet-closed', 'menu', 'dialog', 'overlay', 'spinner'])
    measured[id] = await page.$eval(`#${id}`, (element) => {
      const style = getComputedStyle(element)
      const read = (name: string) => style.getPropertyValue(name).trim()
      return {
        name: style.animationName,
        duration: style.animationDuration,
        enterOpacity: read('--tw-enter-opacity'),
        enterX: read('--tw-enter-translate-x'),
        enterY: read('--tw-enter-translate-y'),
        enterScale: read('--tw-enter-scale'),
        exitOpacity: read('--tw-exit-opacity'),
        exitX: read('--tw-exit-translate-x'),
      }
    })
  await page.close()
  return measured
}

beforeAll(async () => {
  const css = await compiledCss()
  browser = await chromium.launch()
  motion = await measure(css, 'reduce')
  fullMotion = await measure(css, 'no-preference')
}, 60_000)

afterAll(async () => {
  await browser.close()
})

describe('motion under prefers-reduced-motion: reduce', () => {
  it('turns a sliding panel into a short opacity fade in and out', () => {
    const open = motion['sheet-open']
    expect(open).toMatchObject({ name: 'enter', enterOpacity: '0', enterX: '0' })
    expect(seconds(open?.duration ?? '')).toBeGreaterThan(0)
    expect(seconds(open?.duration ?? '')).toBeLessThanOrEqual(0.2)
    const closed = motion['sheet-closed']
    expect(closed).toMatchObject({ name: 'exit', exitOpacity: '0', exitX: '0' })
    expect(seconds(closed?.duration ?? '')).toBeGreaterThan(0)
  })

  it('drops the travel and zoom from a sliding menu, leaving only the fade', () => {
    const menuMotion = motion.menu
    expect(menuMotion).toMatchObject({
      name: 'enter',
      enterOpacity: '0',
      enterY: '0',
      enterScale: '1',
    })
    expect(seconds(menuMotion?.duration ?? '')).toBeGreaterThan(0)
  })

  it('makes fades instant', () => {
    expect(seconds(motion.dialog?.duration ?? '')).toBe(0)
    expect(seconds(motion.overlay?.duration ?? '')).toBe(0)
  })

  it('stops spinners', () => {
    expect(seconds(motion.spinner?.duration ?? '')).toBe(0)
  })
})

describe('motion without a reduced-motion preference', () => {
  it('keeps the slide travel and its own duration', () => {
    expect(fullMotion['sheet-open']).toMatchObject({
      name: 'enter',
      enterOpacity: '1',
      enterX: '100%',
    })
    expect(seconds(fullMotion['sheet-open']?.duration ?? '')).toBe(0.5)
  })
})
