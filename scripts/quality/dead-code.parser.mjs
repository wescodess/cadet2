import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser } from './parser.mjs'

const symbol = z
  .object({
    name: nonempty,
    line: natural.optional(),
    col: natural.optional(),
    pos: natural.optional(),
  })
  .strict()
const row = z
  .object({
    file: nonempty,
    dependencies: z.array(symbol),
    devDependencies: z.array(symbol),
    optionalPeerDependencies: z.array(symbol),
    exports: z.array(symbol),
    types: z.array(symbol),
    files: z.array(z.object({ name: nonempty }).strict()),
  })
  .strict()
export const parse = parser(
  'knip report',
  z
    .object({
      status: z.union([z.literal(0), z.literal(1)]),
      stdout: jsonOutput(z.object({ issues: z.array(row) }).strict()),
    })
    .strict()
    .superRefine(({ status, stdout }, context) => {
      if (!stdout?.issues) return
      const count = stdout.issues.reduce(
        (total, item) =>
          total +
          Object.entries(item)
            .filter(([key]) => key !== 'file')
            .flatMap(([, values]) => values).length,
        0,
      )
      if (
        status !== (count ? 1 : 0) ||
        new Set(stdout.issues.map((item) => item.file)).size !== stdout.issues.length
      )
        context.addIssue({ code: 'custom', message: 'Inconsistent findings or exit status' })
    })
    .transform(({ stdout }) => stdout),
)
