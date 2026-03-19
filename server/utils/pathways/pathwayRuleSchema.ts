import { z } from 'zod'

export const eligibilityDslFieldPathValues = [
  'englishClb',
  'yearsSkilledExperience',
  'settlementFundsCad',
  'hasValidJobOffer',
  'openToRelocation',
  'willingToStudyOrRetrain',
  'budgetCad',
  'targetTimelineMonths',
] as const

export const eligibilityDslBooleanFieldPathValues = [
  'hasValidJobOffer',
  'openToRelocation',
  'willingToStudyOrRetrain',
] as const

export const eligibilityDslOperatorValues = [
  '>=',
  '<=',
  '>',
  '<',
  '==',
  '!=',
] as const

export const eligibilityDslFieldPathSchema = z.enum(eligibilityDslFieldPathValues)
export const eligibilityDslOperatorSchema = z.enum(eligibilityDslOperatorValues)
const eligibilityDslBooleanFieldPathSet = new Set<string>(eligibilityDslBooleanFieldPathValues)

export const pathwayRuleComparisonValueSchema = z.union([
  z.number().finite(),
  z.boolean(),
  z.string().trim().min(1).max(255),
])

function validatePathwayRuleCompatibility(
  value: {
    fieldPath: (typeof eligibilityDslFieldPathValues)[number]
    operator: (typeof eligibilityDslOperatorValues)[number]
    comparisonValue: z.infer<typeof pathwayRuleComparisonValueSchema>
  },
  ctx: z.RefinementCtx,
) {
  const usesBooleanComparison = eligibilityDslBooleanFieldPathSet.has(value.fieldPath)

  if (usesBooleanComparison) {
    if (value.operator !== '==' && value.operator !== '!=') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Boolean pathway fields only support == or != operators.',
        path: ['operator'],
      })
    }

    if (typeof value.comparisonValue !== 'boolean') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Boolean pathway fields require a boolean comparison value.',
        path: ['comparisonValue'],
      })
    }

    return
  }

  if (typeof value.comparisonValue === 'boolean') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Boolean comparison values are only valid for boolean pathway fields.',
      path: ['comparisonValue'],
    })
  }
}

const pathwayRuleBaseSchema = z.object({
  unmetConditionId: z.string().trim().min(1).max(160),
  fieldPath: eligibilityDslFieldPathSchema,
  operator: eligibilityDslOperatorSchema,
  comparisonValue: pathwayRuleComparisonValueSchema,
}).strict()

export const pathwayRuleRecordSchema = pathwayRuleBaseSchema.extend({
  id: z.string().trim().min(1),
  pathwayId: z.string().trim().min(1),
  displayOrder: z.number().int().min(0),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
}).superRefine(validatePathwayRuleCompatibility)

export const pathwayRuleInputSchema = pathwayRuleBaseSchema.extend({
  id: z.string().trim().min(1).optional(),
}).superRefine(validatePathwayRuleCompatibility)

export const replacePathwayRulesSchema = z.object({
  rules: z.array(pathwayRuleInputSchema).min(1).max(24),
}).strict()

export type EligibilityDslFieldPath = z.infer<typeof eligibilityDslFieldPathSchema>
export type EligibilityDslOperator = z.infer<typeof eligibilityDslOperatorSchema>
export type PathwayRuleComparisonValue = z.infer<typeof pathwayRuleComparisonValueSchema>
export type PathwayRuleRecord = z.infer<typeof pathwayRuleRecordSchema>
export type PathwayRuleInput = z.infer<typeof pathwayRuleInputSchema>
export type ReplacePathwayRulesInput = z.infer<typeof replacePathwayRulesSchema>

export function isBooleanEligibilityDslFieldPath(fieldPath: EligibilityDslFieldPath) {
  return eligibilityDslBooleanFieldPathSet.has(fieldPath)
}
