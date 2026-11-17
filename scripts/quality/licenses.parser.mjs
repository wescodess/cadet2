import { z } from 'zod'
import { jsonOutput, nonempty, parser } from './parser.mjs'

const pkg = z
  .object({
    name: nonempty,
    versions: z.array(nonempty).nonempty(),
    paths: z.array(nonempty).nonempty().optional(),
    license: nonempty.optional(),
    author: z.string().optional(),
    homepage: z.string().optional(),
    description: z.string().optional(),
  })
  .strict()

export const schema = jsonOutput(
  z
    .record(nonempty, z.array(pkg).nonempty())
    .refine((report) => Object.keys(report).length > 0, 'Empty license report')
    .refine(
      (report) =>
        Object.entries(report).every(([license, packages]) =>
          packages.every((entry) => entry.license === undefined || entry.license === license),
        ),
      'Package license does not match its category',
    ),
)
export const parse = parser('pnpm licenses report', schema)
