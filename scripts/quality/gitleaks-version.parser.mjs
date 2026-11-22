import { z } from 'zod'
import { parser } from './parser.mjs'

export const schema = z
  .object({
    status: z.literal(0),
    stdout: z.string().regex(/^\d+\.\d+\.\d+\n$/),
    stderr: z.literal(''),
  })
  .strict()
export const parse = parser('gitleaks version', schema)
