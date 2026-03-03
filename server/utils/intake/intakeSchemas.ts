import { z } from 'zod'

export const intakeSections = ['personal', 'education', 'work', 'immigration', 'goals'] as const

export type IntakeSection = (typeof intakeSections)[number]

export const intakeSectionSchema = z.enum(intakeSections)

const sectionValueSchema = z.record(z.string(), z.unknown())

export const sectionProgressSchema = z.object({
  personal: z.boolean(),
  education: z.boolean(),
  work: z.boolean(),
  immigration: z.boolean(),
  goals: z.boolean(),
}).strict()

export const sectionFieldValuesSchema = z.object({
  personal: sectionValueSchema.optional(),
  education: sectionValueSchema.optional(),
  work: sectionValueSchema.optional(),
  immigration: sectionValueSchema.optional(),
  goals: sectionValueSchema.optional(),
}).strict()

export const intakeDraftInputSchema = z.object({
  currentSection: intakeSectionSchema,
  sectionProgress: sectionProgressSchema,
  fieldValues: sectionFieldValuesSchema,
}).strict()

export type IntakeDraftInput = z.infer<typeof intakeDraftInputSchema>

export type IntakeDraftRecord = {
  currentSection: IntakeSection
  sectionProgress: Record<IntakeSection, boolean>
  fieldValues: Record<IntakeSection, Record<string, unknown>>
}

export const defaultSectionProgress: Record<IntakeSection, boolean> = {
  personal: false,
  education: false,
  work: false,
  immigration: false,
  goals: false,
}

export const emptyFieldValues: Record<IntakeSection, Record<string, unknown>> = {
  personal: {},
  education: {},
  work: {},
  immigration: {},
  goals: {},
}
