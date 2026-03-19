import { z } from 'zod'

export const pathwayDefinitionStatusValues = ['active', 'inactive', 'draft'] as const

export const pathwayDefinitionStatusSchema = z.enum(pathwayDefinitionStatusValues)

const pathwayDefinitionDescriptionInputSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}, z.string().max(4000).nullable())

export const pathwayDefinitionRecordSchema = z.object({
  pathwayId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  status: pathwayDefinitionStatusSchema,
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
}).strict()

export const pathwayDefinitionListQuerySchema = z.object({
  status: pathwayDefinitionStatusSchema.optional(),
}).strict()

export const createPathwayDefinitionSchema = z.object({
  pathwayId: z.string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Pathway ID must use lowercase letters, numbers, and hyphens only.'),
  displayName: z.string().trim().min(1).max(255),
  description: pathwayDefinitionDescriptionInputSchema.optional(),
  status: pathwayDefinitionStatusSchema.default('draft'),
}).strict()

export const updatePathwayDefinitionSchema = z.object({
  displayName: z.string().trim().min(1).max(255),
  description: pathwayDefinitionDescriptionInputSchema.optional(),
}).strict()

export const updatePathwayStatusSchema = z.object({
  status: pathwayDefinitionStatusSchema,
}).strict()

export type PathwayDefinitionStatus = z.infer<typeof pathwayDefinitionStatusSchema>
export type PathwayDefinitionRecord = z.infer<typeof pathwayDefinitionRecordSchema>
export type CreatePathwayDefinitionInput = z.infer<typeof createPathwayDefinitionSchema>
export type UpdatePathwayDefinitionInput = z.infer<typeof updatePathwayDefinitionSchema>
