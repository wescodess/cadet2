import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export type Blocks = Map<string, Map<string, string>>

const root = resolve(import.meta.dirname, '../../..')

export function repoPath(path: string) {
  return resolve(root, path)
}

function stripComments(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function localImports(file: string, css: string) {
  return [...css.matchAll(/@import\s+["']([^"']+)["']\s*;/g)]
    .map((match) => match[1] ?? '')
    .filter((path) => path.startsWith('.'))
    .map((path) => resolve(dirname(file), path))
}

export function importChain(entry: string): string[] {
  const file = repoPath(entry)
  const css = stripComments(readFileSync(file, 'utf8'))
  return [
    ...localImports(file, css).flatMap((path) => {
      if (!existsSync(path)) throw new Error(`Missing CSS import: ${path}`)
      return importChain(path.slice(root.length + 1))
    }),
    file,
  ]
}

function splitSelectors(selector: string) {
  if (selector.startsWith('@')) return [selector]
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of selector) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else current += char
  }
  parts.push(current.trim())
  return parts
}

function record(into: Blocks, frame: { selector: string; text: string }) {
  const found = [...frame.text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)]
  if (!found.length) return
  for (const selector of splitSelectors(frame.selector)) {
    const declarations = into.get(selector) ?? new Map<string, string>()
    for (const match of found) declarations.set(match[1] ?? '', (match[2] ?? '').trim())
    into.set(selector, declarations)
  }
}

export function parseBlocks(css: string, into: Blocks = new Map()): Blocks {
  const source = stripComments(css)
  const frames: { selector: string; text: string }[] = [{ selector: '', text: '' }]
  let boundary = 0
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const frame = frames[frames.length - 1]
    if (!frame) throw new Error('Unbalanced CSS')
    if (char === '{') {
      frames.push({ selector: source.slice(boundary, index).trim(), text: '' })
      boundary = index + 1
    } else if (char === '}') {
      frame.text += source.slice(boundary, index)
      frames.pop()
      record(into, frame)
      boundary = index + 1
    } else if (char === ';') {
      frame.text += source.slice(boundary, index + 1)
      boundary = index + 1
    }
  }
  return into
}

export function appBlocks(entry = 'app/assets/css/tailwind.css'): Blocks {
  const blocks: Blocks = new Map()
  for (const file of importChain(entry)) parseBlocks(readFileSync(file, 'utf8'), blocks)
  return blocks
}

export function recordBlocks(): Blocks {
  return parseBlocks(readFileSync(repoPath('docs/design/system/tokens.css'), 'utf8'))
}

export function recordJson() {
  return JSON.parse(readFileSync(repoPath('docs/design/system/tokens.json'), 'utf8')) as RecordJson
}

export interface RecordState {
  id: string
  group: string
  word: string
  role: string
  glyph: string
  fill: 'chip' | 'solid'
  meaning: string
}

export interface RecordJson {
  font: Record<string, string>
  radius: string
  motion: Record<string, string>
  theme: { light: Record<string, string>; dark: Record<string, string> }
  roles: string[]
  turn: Record<string, string>
  expression: { client: Record<string, string>; representative: Record<string, string> }
  states: RecordState[]
}
