import { z } from 'zod'
import { jsonOutput, natural, nonempty, parser } from './parser.mjs'

const finding = z
  .object({
    Description: nonempty,
    StartLine: natural,
    EndLine: natural,
    StartColumn: natural,
    EndColumn: natural,
    Match: nonempty,
    Secret: nonempty,
    File: nonempty,
    SymlinkFile: z.string(),
    Link: z.string().optional(),
    Commit: z.string(),
    Entropy: z.number().finite().nonnegative(),
    Author: z.string(),
    Email: z.string(),
    Date: z.string(),
    Message: z.string(),
    Tags: z.array(nonempty),
    RuleID: nonempty,
    Fingerprint: nonempty,
  })
  .strict()
  .refine((entry) => entry.EndLine >= entry.StartLine, 'Invalid finding line range')
export const schema = z
  .object({
    status: z.union([z.literal(0), z.literal(42)]),
    stdout: jsonOutput(z.array(finding)),
  })
  .strict()
  .refine(
    ({ status, stdout }) => (status === 42) === stdout.length > 0,
    'Exit status does not match findings',
  )
export const parse = parser('gitleaks report', schema)
