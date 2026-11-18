import { resolve } from 'node:path'
import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser, positive } from './parser.mjs'

const assertion = z
  .object({
    ancestorTitles: z.array(z.string()),
    fullName: z.string(),
    status: z.enum(['passed', 'failed', 'skipped', 'pending', 'todo']),
    title: z.string(),
    duration: z.number().nonnegative().nullable().optional(),
    failureMessages: z.array(z.string()),
    meta: z.record(z.string(), z.unknown()),
    location: z.object({ line: positive, column: natural }).strict().nullable().optional(),
  })
  .strict()
const result = z
  .object({
    assertionResults: z.array(assertion),
    startTime: z.number().nonnegative(),
    endTime: z.number().nonnegative(),
    status: z.enum(['passed', 'failed']),
    message: z.string(),
    name: nonempty,
  })
  .strict()
  .refine((entry) => entry.endTime >= entry.startTime, 'Invalid test timing')
const snapshot = z
  .object({
    added: natural,
    failure: z.boolean(),
    filesAdded: natural,
    filesRemoved: natural,
    filesRemovedList: z.array(nonempty),
    filesUnmatched: natural,
    filesUpdated: natural,
    matched: natural,
    total: natural,
    unchecked: natural,
    uncheckedKeysByFile: z.array(
      z.object({ filePath: nonempty, keys: z.array(z.string()) }).strict(),
    ),
    unmatched: natural,
    updated: natural,
    didUpdate: z.boolean(),
  })
  .strict()
const report = z
  .object({
    numTotalTestSuites: positive,
    numPassedTestSuites: natural,
    numFailedTestSuites: natural,
    numPendingTestSuites: natural,
    numTotalTests: natural,
    numPassedTests: natural,
    numFailedTests: natural,
    numPendingTests: natural,
    numTodoTests: natural,
    snapshot,
    startTime: z.number().nonnegative(),
    success: z.boolean(),
    testResults: z.array(result).nonempty(),
  })
  .strict()
  .superRefine((report, context) => {
    const tests = report.testResults.flatMap((file) => file.assertionResults)
    const counts = {
      numTotalTests: tests.length,
      numPassedTests: tests.filter((test) => test.status === 'passed').length,
      numFailedTests: tests.filter((test) => test.status === 'failed').length,
      numPendingTests: tests.filter((test) => ['skipped', 'pending'].includes(test.status)).length,
      numTodoTests: tests.filter((test) => test.status === 'todo').length,
    }
    for (const [key, value] of Object.entries(counts)) {
      if (report[key] !== value)
        context.addIssue({ code: 'custom', message: `${key} does not match assertions` })
    }
    if (
      report.numTotalTestSuites !==
        report.numPassedTestSuites + report.numFailedTestSuites + report.numPendingTestSuites ||
      report.numTotalTestSuites < report.testResults.length ||
      report.success !== (report.numFailedTestSuites === 0 && report.numFailedTests === 0) ||
      (report.success && report.testResults.some((file) => file.status === 'failed'))
    )
      context.addIssue({ code: 'custom', message: 'Inconsistent Vitest completion totals' })
  })

export const schema = z
  .object({
    status: z.union([z.literal(0), z.literal(1)]),
    files: jsonOutput(z.array(z.object({ file: nonempty }).strict()).nonempty()),
    stdout: jsonOutput(report),
  })
  .strict()
  .pipe(
    z
      .any()
      .refine(({ files, stdout }) => {
        const expected = new Set(files.map(({ file }) => resolve(file)))
        const actual = stdout.testResults.map((file) => file.name)
        return (
          expected.size === files.length &&
          actual.length === expected.size &&
          new Set(actual).size === expected.size &&
          actual.every((file) => expected.has(file))
        )
      }, 'Vitest results do not cover discovered files exactly')
      .refine(
        ({ status, stdout }) => (status === 0) === stdout.success,
        'Inconsistent Vitest exit',
      ),
  )
export const parse = parser('Vitest results', schema)
