import { z } from 'zod'
import { nonempty, parser } from './parser.mjs'

export const schema = z
  .object({ ignored: z.boolean(), inferredParser: nonempty.nullable() })
  .strict()
export const parse = parser('Prettier file info', schema)
