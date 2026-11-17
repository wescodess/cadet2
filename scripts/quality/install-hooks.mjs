import { resolve } from 'node:path'
import { main, run } from './common.mjs'

function git(...args) {
  const result = run('git', args)
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}

main(() => {
  if (process.env.CI) return
  const directory = run('git', ['rev-parse', '--git-dir'])
  if (directory.status !== 0) return
  const common = git('rev-parse', '--git-common-dir')
  const worktree = resolve(common) !== resolve(directory.stdout.trim())
  if (worktree) git('config', '--local', 'extensions.worktreeConfig', 'true')
  git('config', worktree ? '--worktree' : '--local', 'core.hooksPath', '.husky')
})
