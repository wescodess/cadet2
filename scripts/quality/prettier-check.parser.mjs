import { z } from 'zod'
import { parser } from './parser.mjs'

export const schema = z.boolean()
export const parse = parser('Prettier check result', schema)
