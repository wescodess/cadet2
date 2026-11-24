import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { git, sourceFiles } from './common.mjs'

export const structuralCommit = '1b335bface0686641850ea8cd23aa5c5dea4e45c'
export const configuration = (name) => fileURLToPath(new URL(name, import.meta.url))
const excluded = [
  '_bmad',
  '_bmad-output',
  'node_modules',
  '.git',
  '.nuxt',
  '.output',
  '.data',
  '.cache',
  '.quality-output',
  '.tmp-skills',
  '.agent',
  '.agents',
  '.claude',
  '.codex',
  'docs/design',
  'convex/_generated',
]
function sourcePath(file) {
  return (
    existsSync(file) &&
    /\.(?:[cm]?[jt]sx?|vue)$/.test(file) &&
    !excluded.some((directory) => file.startsWith(`${directory}/`)) &&
    !file.split('/').includes('node_modules')
  )
}
export function structuralFiles() {
  return sourceFiles().filter(sourcePath)
}
export function ignoredStructuralFiles() {
  return git(
    'ls-files',
    '--others',
    '--ignored',
    '--exclude-standard',
    '-z',
    '--',
    '.',
    ...excluded.map((directory) => `:(exclude)${directory}/**`),
    ':(exclude)**/node_modules/**',
  )
    .split('\0')
    .filter(sourcePath)
}
