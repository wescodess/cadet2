import { files, git, json, main, run } from './common.mjs'

function previous(path, base) {
  const result = run('git', ['show', `${base}:${path}`])
  return result.status === 0 ? JSON.parse(result.stdout) : null
}

function assertSubset(current, prior, path) {
  if (Array.isArray(current)) {
    if (current.some((value) => !prior.includes(value)))
      throw new Error(`Baseline increased: ${path}`)
    return
  }
  for (const [key, value] of Object.entries(current)) {
    if (!(key in prior)) throw new Error(`Baseline entry added: ${path} ${key}`)
    if (typeof value === 'number' && value > prior[key])
      throw new Error(`Baseline count increased: ${path} ${key}`)
    if (typeof value === 'string' && value !== prior[key])
      throw new Error(`Baseline value changed: ${path} ${key}`)
    if (typeof value === 'object' && value !== null)
      assertSubset(value, prior[key], `${path} ${key}`)
  }
}

main(() => {
  const base = git('merge-base', process.env.QUALITY_BASE_REF || 'origin/dev', 'HEAD')
  const paths = files().filter((path) => path.startsWith('scripts/quality/baselines/'))
  for (const path of paths) {
    const current = json(path)
    const prior = previous(path, base)
    if (prior) {
      const left = current.counts ?? current
      const right = prior.counts ?? prior
      assertSubset(left, right, path)
    }
  }
  console.log('baselines: PASS (no increases against integration merge-base)')
})
