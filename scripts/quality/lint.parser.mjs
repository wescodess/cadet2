import { z } from 'zod'
import { resolve } from 'node:path'
import { natural, nonempty, parser, positive } from './parser.mjs'

const fix = z
  .object({ range: z.tuple([natural, natural]), text: z.string() })
  .strict()
  .refine(({ range }) => range[0] <= range[1], 'Invalid fix range')
const message = z
  .object({
    ruleId: nonempty.nullable(),
    severity: z.union([z.literal(1), z.literal(2)]),
    message: nonempty,
    line: positive,
    column: positive,
    endLine: positive.optional(),
    endColumn: positive.optional(),
    nodeType: nonempty.nullable().optional(),
    messageId: nonempty.optional(),
    fatal: z.boolean().optional(),
    fix: fix.optional(),
    suggestions: z
      .array(
        z
          .object({
            desc: nonempty,
            messageId: nonempty.optional(),
            fix,
            data: z
              .record(
                nonempty,
                z.union([
                  z.string(),
                  z.number().finite(),
                  z.boolean(),
                  z.bigint(),
                  z.null(),
                  z.undefined(),
                ]),
              )
              .optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
const result = z
  .object({
    filePath: nonempty,
    messages: z.array(message),
    suppressedMessages: z.array(z.never()),
    usedDeprecatedRules: z.array(z.never()),
    errorCount: natural,
    warningCount: natural,
    fatalErrorCount: natural,
    fixableErrorCount: natural,
    fixableWarningCount: natural,
    source: z.string().optional(),
    output: z.string().optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    const counts = {
      errorCount: entry.messages.filter((message) => message.severity === 2).length,
      warningCount: entry.messages.filter((message) => message.severity === 1).length,
      fatalErrorCount: entry.messages.filter((message) => message.fatal).length,
      fixableErrorCount: entry.messages.filter((message) => message.fix && message.severity === 2)
        .length,
      fixableWarningCount: entry.messages.filter((message) => message.fix && message.severity === 1)
        .length,
    }
    for (const [key, value] of Object.entries(counts)) {
      if (entry[key] !== value)
        context.addIssue({ code: 'custom', message: `${key} does not match messages` })
    }
  })
export const schema = z
  .object({ files: z.array(nonempty).nonempty(), results: z.array(result).nonempty() })
  .strict()
  .refine(({ files, results }) => {
    const expected = new Set(files.map((file) => resolve(file)))
    return (
      expected.size === files.length &&
      results.length === expected.size &&
      new Set(results.map((result) => result.filePath)).size === expected.size &&
      results.every((result) => expected.has(result.filePath))
    )
  }, 'ESLint results do not cover the selected files exactly')
export const parse = parser('ESLint results', schema)
