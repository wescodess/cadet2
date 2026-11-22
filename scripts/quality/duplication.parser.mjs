import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser, positive } from './parser.mjs'

const location = z.object({ column: natural, line: positive, position: natural }).strict()
const file = z
  .object({ name: nonempty, start: positive, end: positive, startLoc: location, endLoc: location })
  .strict()
const statistics = z
  .object({
    clones: natural,
    duplicatedLines: natural,
    duplicatedTokens: natural,
    lines: natural,
    newClones: z.literal(0),
    newDuplicatedLines: z.literal(0),
    percentage: z.number().min(0).max(100),
    percentageTokens: z.number().min(0).max(100),
    sources: natural,
    tokens: natural,
  })
  .strict()
const report = z
  .object({
    duplicates: z.array(
      z
        .object({
          firstFile: file,
          secondFile: file,
          format: nonempty,
          fragment: nonempty,
          isNew: z.literal(false),
          kind: z.literal('exact'),
          lines: positive,
          tokens: positive,
        })
        .strict(),
    ),
    statistics: z
      .object({
        detectionDate: z.string().datetime(),
        formats: z.record(nonempty, statistics),
        total: statistics,
      })
      .strict(),
  })
  .strict()
export const parse = parser(
  'jscpd report',
  z
    .object({ status: z.literal(0), stdout: jsonOutput(report) })
    .strict()
    .superRefine(({ stdout: value }, context) => {
      if (!value?.statistics) return
      const total = value.statistics.total
      const sums = Object.values(value.statistics.formats)
      const valid =
        total.clones === value.duplicates.length &&
        ['clones', 'duplicatedLines', 'duplicatedTokens', 'lines', 'sources', 'tokens'].every(
          (key) => total[key] === sums.reduce((sum, item) => sum + item[key], 0),
        ) &&
        value.duplicates.every(
          (clone) =>
            clone.firstFile.end >= clone.firstFile.start &&
            clone.secondFile.end >= clone.secondFile.start &&
            clone.tokens >= 100 &&
            clone.lines >= 10,
        )
      if (!valid)
        context.addIssue({ code: 'custom', message: 'Inconsistent clone inventory or totals' })
    })
    .transform(({ stdout }) => stdout),
)
