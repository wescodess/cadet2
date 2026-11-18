import { resolve } from 'node:path'
import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser, positive } from './parser.mjs'

const metadata = z.record(z.string(), z.unknown())
const location = z.object({ file: nonempty, line: natural, column: natural }).strict()
const project = z
  .object({
    outputDir: nonempty,
    repeatEach: z.literal(1),
    retries: natural,
    metadata,
    id: nonempty,
    name: nonempty,
    testDir: nonempty,
    testIgnore: z.array(z.never()),
    testMatch: z.array(nonempty).nonempty(),
    timeout: positive,
  })
  .strict()
const config = z
  .object({
    configFile: nonempty,
    rootDir: nonempty,
    forbidOnly: z.literal(true),
    fullyParallel: z.boolean(),
    globalSetup: z.null(),
    globalTeardown: z.null(),
    globalTimeout: natural,
    grep: z.object({}).strict(),
    grepInvert: z.null(),
    maxFailures: natural,
    metadata,
    preserveOutput: z.enum(['always', 'never', 'failures-only']),
    projects: z.array(project).nonempty(),
    quiet: z.boolean(),
    reporter: z.tuple([z.tuple([z.literal('json')])]),
    reportSlowTests: z.object({ max: natural, threshold: natural }).strict(),
    runAgents: z.literal('none'),
    shard: z.null(),
    tags: z.array(z.string()),
    updateSnapshots: z.enum(['all', 'changed', 'missing', 'none']),
    updateSourceMethod: z.enum(['patch', 'overwrite']),
    version: z.literal('1.58.2'),
    workers: positive,
    webServer: z
      .object({
        command: nonempty,
        url: nonempty,
        reuseExistingServer: z.boolean(),
        timeout: positive,
      })
      .strict()
      .optional(),
  })
  .strict()
const test = z
  .object({
    timeout: positive,
    annotations: z.array(
      z
        .object({
          type: nonempty,
          description: z.string().optional(),
          location: location.optional(),
        })
        .strict(),
    ),
    expectedStatus: z.enum(['passed', 'failed', 'skipped']),
    projectId: nonempty,
    projectName: nonempty,
    results: z.array(z.never()),
    status: z.literal('skipped'),
  })
  .strict()
const spec = location.extend({
  title: z.string(),
  ok: z.literal(true),
  tags: z.array(z.string()),
  tests: z.array(test).nonempty(),
  id: nonempty,
})
const suite = z.lazy(() =>
  location.extend({ title: z.string(), specs: z.array(spec), suites: z.array(suite).optional() }),
)

export function specifications(suites) {
  return suites.flatMap((suite) => [...suite.specs, ...specifications(suite.suites ?? [])])
}

function sameFile(suite, file) {
  return (
    suite.file === file &&
    suite.specs.every((spec) => spec.file === file) &&
    (suite.suites ?? []).every((child) => sameFile(child, file))
  )
}

export const schema = z
  .object({
    files: z.array(nonempty).nonempty(),
    stdout: jsonOutput(
      z
        .object({
          config,
          suites: z.array(suite).nonempty(),
          errors: z.array(z.never()),
          stats: z
            .object({
              startTime: z.string().datetime(),
              duration: z.number().nonnegative(),
              expected: z.literal(0),
              skipped: natural,
              unexpected: z.literal(0),
              flaky: z.literal(0),
            })
            .strict(),
        })
        .strict(),
    ),
  })
  .strict()
  .pipe(
    z
      .any()
      .refine(({ files, stdout }) => {
        const expected = new Set(files.map((file) => resolve(file)))
        const actual = stdout.suites.map((suite) => resolve(stdout.config.rootDir, suite.file))
        return (
          expected.size === files.length &&
          actual.length === expected.size &&
          new Set(actual).size === expected.size &&
          actual.every((file) => expected.has(file))
        )
      }, 'Playwright list does not cover selected files exactly')
      .refine(({ stdout }) => {
        const specs = specifications(stdout.suites)
        return (
          stdout.suites.every((suite) => sameFile(suite, suite.file)) &&
          new Set(specs.map((spec) => spec.id)).size === specs.length &&
          specs.reduce((sum, spec) => sum + spec.tests.length, 0) === stdout.stats.skipped &&
          specs.every((spec) =>
            spec.tests.every((test) =>
              stdout.config.projects.some(
                (project) => project.id === test.projectId && project.name === test.projectName,
              ),
            ),
          )
        )
      }, 'Inconsistent Playwright list inventory'),
  )
export const parse = parser('Playwright list', schema)
