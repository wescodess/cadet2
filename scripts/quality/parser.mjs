import { z } from 'zod'

export const nonempty = z
  .string()
  .refine((value) => value.trim().length > 0, 'Expected a nonempty string')
export const natural = z.number().int().nonnegative()
export const positive = z.number().int().positive()

export function jsonOutput(schema) {
  return z
    .string()
    .transform((raw, context) => {
      try {
        return JSON.parse(raw)
      } catch {
        context.addIssue({ code: 'custom', message: 'Invalid or truncated JSON' })
        return z.NEVER
      }
    })
    .pipe(schema)
}

export function parser(name, schema) {
  return (raw) => {
    const result = schema.safeParse(raw)
    if (!result.success) {
      const issues = result.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`)
      throw new Error(`Invalid ${name}: ${issues.join('; ')}`)
    }
    return result.data
  }
}
