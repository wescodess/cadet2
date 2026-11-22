import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { sourceFiles } from './common.mjs'

export const structuralCommit = '1b335bface0686641850ea8cd23aa5c5dea4e45c'
export const configuration = (name) => fileURLToPath(new URL(name, import.meta.url))
export function structuralFiles() {
  return sourceFiles().filter(
    (file) =>
      existsSync(file) &&
      !/^(?:_bmad|_bmad-output|\.[^/]+|docs\/design)\//.test(file) &&
      !file.startsWith('convex/_generated/'),
  )
}
