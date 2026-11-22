import { z } from 'zod'
import { parser } from './parser.mjs'

const diagnostics = z.string().transform((stdout, context) => {
  const entries = []
  if (stdout && !stdout.endsWith('\n')) {
    context.addIssue({ code: 'custom', message: 'Incomplete diagnostic line' })
    return z.NEVER
  }
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue
    const match = /^(\S.*?)\([1-9]\d*,[1-9]\d*\): error (TS[1-9]\d*): \S.*$/.exec(line)
    if (match) entries.push({ line, file: match[1], code: match[2] })
    else if (!entries.length || !/^ {2,}\S.*$/.test(line)) {
      context.addIssue({ code: 'custom', message: 'Unrecognized diagnostic line' })
      return z.NEVER
    }
  }
  return entries
})
export const schema = z
  .object({
    status: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    stdout: diagnostics,
    stderr: z.literal(''),
  })
  .strict()
  .refine(
    ({ status, stdout }) => (status !== 0) === stdout.length > 0,
    'Exit status does not match diagnostics',
  )
export const parse = parser('TypeScript diagnostics', schema)
