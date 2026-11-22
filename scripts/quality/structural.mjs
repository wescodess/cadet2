import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { sourceFiles } from './common.mjs'

export const structuralCommit = 'd7fb8a4ac9c25dfe65e8ba84680ff2f40cb3a501'
export const configuration = (name) => fileURLToPath(new URL(name, import.meta.url))
export function structuralFiles() {
  return sourceFiles().filter(
    (file) =>
      existsSync(file) &&
      !/^(?:_bmad|_bmad-output|\.[^/]+|docs\/design)\//.test(file) &&
      !file.startsWith('convex/_generated/'),
  )
}
