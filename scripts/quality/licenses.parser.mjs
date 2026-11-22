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

const report = jsonOutput(
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
export const schema = z
  .object({ stdout: report, packages: z.array(nonempty).nonempty() })
  .strict()
  .pipe(
    z.any().superRefine(({ stdout, packages }, context) => {
      const expected = new Set(packages)
      const seen = new Set()
      for (const entries of Object.values(stdout)) {
        for (const entry of entries) {
          for (const version of entry.versions) {
            const id = `${entry.name}@${version}`
            if (!expected.has(id) || seen.has(id))
              context.addIssue({
                code: 'custom',
                message: `Unknown or duplicate license package: ${id}`,
              })
            seen.add(id)
          }
        }
      }
      if (seen.size !== expected.size || expected.size !== packages.length)
        context.addIssue({
          code: 'custom',
          message: 'License report does not cover installed packages exactly',
        })
    }),
  )
  .transform(({ stdout }) => stdout)
export const parse = parser('pnpm licenses report', schema)
