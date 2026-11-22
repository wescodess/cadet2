import { execFileSync } from 'node:child_process'
import path from 'node:path'

export function runConvex(root, args, options = {}) {
  return execFileSync(
    process.execPath,
    [path.join(root, 'node_modules/convex/bin/main.js'), ...args],
    { cwd: root, ...options },
  )
}
