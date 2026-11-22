import path from 'node:path'

export function runtimeDirectory(root) {
  if (!process.env.QA_RUNTIME_DIR) throw new Error('Set an external QA_RUNTIME_DIR')
  const directory = path.resolve(process.env.QA_RUNTIME_DIR)
  const relative = path.relative(root, directory)
  if (!relative || (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)))
    throw new Error('QA_RUNTIME_DIR must be outside the worktree')
  return directory
}
