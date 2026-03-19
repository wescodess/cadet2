import type { PathwayDefinitionRecord, PathwayDefinitionStatus } from './pathwayDefinitions'

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

export const eligibilityDslOperatorValues = ['>=', '<=', '>', '<', '==', '!='] as const
export const eligibilityDslBooleanOperatorValues = ['==', '!='] as const

export type EligibilityDslFieldPath = typeof eligibilityDslFieldPathValues[number]
export type EligibilityDslOperator = typeof eligibilityDslOperatorValues[number]

export type PathwayRuleDraft = {
  id?: string
  unmetConditionId: string
  fieldPath: EligibilityDslFieldPath
  operator: EligibilityDslOperator
  comparisonValue: number | boolean | string
}

export type PathwayRuleRecord = PathwayRuleDraft & {
  id: string
  pathwayId: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type PathwayRulesEditorItem = {
  pathwayId: string
  initialDefinition: PathwayDefinitionRecord
  draftDefinition: {
    displayName: string
    description: string
    status: PathwayDefinitionStatus
  }
  initialRules: PathwayRuleDraft[]
  draftRules: PathwayRuleDraft[]
}

export const pathwayRuleFieldLabels: Record<EligibilityDslFieldPath, string> = {
  englishClb: 'English CLB',
  yearsSkilledExperience: 'Skilled experience',
  settlementFundsCad: 'Settlement funds',
  hasValidJobOffer: 'Valid job offer',
  openToRelocation: 'Relocation flexibility',
  willingToStudyOrRetrain: 'Study or retraining intent',
  budgetCad: 'Available budget',
  targetTimelineMonths: 'Timeline in months',
}

export const pathwayRuleTestIds = {
  accordion: 'admin-pathway-rules-accordion',
  row: 'admin-rule-form-row',
  addButton: 'admin-rule-add-button',
  saveButton: 'admin-rule-save-button',
} as const

export function createDefaultPathwayRuleDraft(): PathwayRuleDraft {
  return {
    unmetConditionId: '',
    fieldPath: 'englishClb',
    operator: '>=',
    comparisonValue: 0,
  }
}

export function clonePathwayRuleDraft(rule: PathwayRuleDraft): PathwayRuleDraft {
  return {
    id: rule.id,
    unmetConditionId: rule.unmetConditionId,
    fieldPath: rule.fieldPath,
    operator: rule.operator,
    comparisonValue: rule.comparisonValue,
  }
}

export function isBooleanEligibilityFieldPath(fieldPath: EligibilityDslFieldPath) {
  return (eligibilityDslBooleanFieldPathValues as readonly string[]).includes(fieldPath)
}
