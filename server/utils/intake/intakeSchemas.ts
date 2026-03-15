import { z } from 'zod'

export const intakeSections = ['personal', 'education', 'work', 'immigration', 'goals'] as const

export type IntakeSection = (typeof intakeSections)[number]

export const intakeSectionSchema = z.enum(intakeSections)

const sectionValueSchema = z.record(z.string(), z.unknown())

export const primaryGoalValues = [
  'permanent-residency',
  'work-permit',
  'study-to-pr',
  'family-sponsorship',
  'business',
] as const

export const priorityPreferenceValues = [
  'fastest-timeline',
  'highest-odds',
  'lowest-cost',
  'long-term-flexibility',
] as const

export const locationPreferenceValues = [
  'any-province',
  'targeted-provinces',
  'major-city-focus',
  'smaller-community-focus',
] as const

function trimString(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim()
  }

  return value
}

function parseNumberOrEmpty(value: unknown): unknown {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return ''
    }

    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? value : parsed
  }

  return value
}

const primaryGoalOrEmptySchema = z.preprocess(
  trimString,
  z.union([z.literal(''), z.enum(primaryGoalValues)]),
)

const priorityPreferenceOrEmptySchema = z.preprocess(
  trimString,
  z.union([z.literal(''), z.enum(priorityPreferenceValues)]),
)

const locationPreferenceOrEmptySchema = z.preprocess(
  trimString,
  z.union([z.literal(''), z.enum(locationPreferenceValues)]),
)

const timelineMonthsOrEmptySchema = z.preprocess(
  parseNumberOrEmpty,
  z.union([z.literal(''), z.number().int().min(1).max(120)]),
)

const budgetCadOrEmptySchema = z.preprocess(
  parseNumberOrEmpty,
  z.union([z.literal(''), z.number().min(0).max(100000000)]),
)

const yesNoOrEmptySchema = z.union([z.literal(''), z.enum(['yes', 'no'])])

const additionalContextOrEmptySchema = z.preprocess(
  trimString,
  z.union([z.literal(''), z.string().max(4000)]),
)

export const goalsFieldValuesSchema = z.object({
  primaryGoal: primaryGoalOrEmptySchema.optional(),
  targetTimelineMonths: timelineMonthsOrEmptySchema.optional(),
  budgetCad: budgetCadOrEmptySchema.optional(),
  priorityPreference: priorityPreferenceOrEmptySchema.optional(),
  locationPreference: locationPreferenceOrEmptySchema.optional(),
  willingToStudyOrRetrain: yesNoOrEmptySchema.optional(),
  hasFamilyInCanada: yesNoOrEmptySchema.optional(),
  additionalContext: additionalContextOrEmptySchema.optional(),
}).strict()

export type GoalsFieldValues = z.infer<typeof goalsFieldValuesSchema>

export const emptyGoalsFieldValues: GoalsFieldValues = {
  primaryGoal: '',
  targetTimelineMonths: '',
  budgetCad: '',
  priorityPreference: '',
  locationPreference: '',
  willingToStudyOrRetrain: '',
  hasFamilyInCanada: '',
  additionalContext: '',
}

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
  goals: goalsFieldValuesSchema.optional(),
}).strict()

export const intakeDraftInputSchema = z.object({
  currentSection: intakeSectionSchema,
  sectionProgress: sectionProgressSchema,
  fieldValues: sectionFieldValuesSchema,
  sourceRunId: z.union([
    z.string().trim().min(1),
    z.null(),
  ]).optional(),
}).strict()

export type IntakeDraftInput = z.infer<typeof intakeDraftInputSchema>

export type IntakeDraftRecord = {
  currentSection: IntakeSection
  sectionProgress: Record<IntakeSection, boolean>
  fieldValues: Record<IntakeSection, Record<string, unknown>>
  sourceRunId: string | null
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
  goals: { ...emptyGoalsFieldValues },
}
