import { z } from 'zod'
import { parser, positive } from './parser.mjs'

export const schema = z
  .object({
    semi: z.boolean(),
    singleQuote: z.boolean(),
    trailingComma: z.enum(['all', 'es5', 'none']),
    printWidth: positive,
  })
  .strict()
export const parse = parser('Prettier configuration', schema)
