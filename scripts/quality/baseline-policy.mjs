import { z } from 'zod'
import { baselineCommit, files, git, json, main, qualityBaseRef, run } from './common.mjs'

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = Date.parse(`${value}T00:00:00Z`)
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value
  })
const text = z.string().refine((value) => value.trim().length > 0)
const file = text.refine((value) => value.includes('.') && !value.includes('|'))
const counted = (key) =>
  z
    .object({
      date,
      commit: z.literal(baselineCommit),
      counts: z.record(key, z.number().int().nonnegative()),
    })
    .strict()
const allowance = z
  .object({
    paths: z.array(text).nonempty(),
    expires: date,
    reason: text,
  })
  .strict()
const schemas = {
  'types.json': counted(z.string().regex(/^.+\|TS\d+$/)),
  'types-convex.json': counted(z.string().regex(/^convex\/.+\|TS\d+$/)),
  'lint.json': counted(z.string().regex(/^.+\|[^|]+$/)),
  'test-policy.json': counted(file),
  'format.json': z.record(file, z.string().regex(/^sha256:[a-f0-9]{64}$/)),
  'secrets.json': z.array(z.string().regex(/^[^|]+\|[^|]+\|[a-f0-9]{64}$/)),
  'dependencies.json': z
    .object({
      advisories: z.record(text, allowance),
      licenses: z.record(text, allowance),
    })
    .strict(),
}

function validate(schema, value, path) {
  const parsed = schema.safeParse(value)
  if (!parsed.success) throw new Error(`Invalid baseline schema: ${path}\n${parsed.error.message}`)
  return parsed.data
}

function descendsFromAdoption(base) {
  const result = run('git', ['merge-base', '--is-ancestor', baselineCommit, base])
  if (![0, 1].includes(result.status)) throw new Error(result.stderr)
  return result.status === 0
}

function previous(path, base) {
  const exists = git('ls-tree', '--name-only', base, '--', path)
  if (!exists) return null
  const result = run('git', ['show', `${base}:${path}`])
  if (result.status !== 0) throw new Error(result.stderr)
  return JSON.parse(result.stdout)
}

function assertSubset(current, prior, path) {
  if (Array.isArray(current)) {
    if (current.some((value) => !prior.includes(value)))
      throw new Error(`Baseline increased: ${path}`)
    return
  }
  for (const [key, value] of Object.entries(current)) {
    if (!Object.hasOwn(prior, key)) throw new Error(`Baseline entry added: ${path} ${key}`)
    if (typeof value === 'number' && value > prior[key])
      throw new Error(`Baseline count increased: ${path} ${key}`)
    if (typeof value === 'string' && value !== prior[key])
      throw new Error(`Baseline value changed: ${path} ${key}`)
    if (typeof value === 'object' && value !== null)
      assertSubset(value, prior[key], `${path} ${key}`)
  }
}

main(() => {
  const refs = new Set([qualityBaseRef(), 'origin/dev'])
  const bases = [...new Set([...refs].map((ref) => git('merge-base', ref, 'HEAD')))]
  const directory = 'scripts/quality/baselines/'
  for (const path of files().filter((path) => path.startsWith(directory))) {
    if (!Object.hasOwn(schemas, path.slice(directory.length)))
      throw new Error(`Unknown baseline manifest: ${path}`)
  }
  for (const [name, schema] of Object.entries(schemas)) {
    const path = `${directory}${name}`
    const current = validate(schema, json(path), path)
    const priors = bases
      .map((base) => [base, previous(path, base)])
      .filter(([, prior]) => prior !== null)
    if (!priors.length && !bases.some(descendsFromAdoption))
      throw new Error(
        `No prior baseline manifest at a base descending from ${baselineCommit}: ${path}`,
      )
    for (const [base, prior] of priors)
      assertSubset(current, validate(schema, prior, `${base}:${path}`), path)
  }
  console.log('baselines: PASS (valid schemas; no increases against integration merge-bases)')
})
