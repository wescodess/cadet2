import { describe, expect, it } from 'vitest'

import { buildPathwayRuleEvaluator, evaluateEligibilityDslRule } from '../../server/utils/pathways/eligibilityDslEvaluator'
import type { NormalizedPathwayProfile } from '../../server/utils/pathways/mvpPathwayCatalog'
import { pathwayRuleInputSchema } from '../../server/utils/pathways/pathwayRuleSchema'

const baselineProfile: NormalizedPathwayProfile = {
  englishClb: 9,
  yearsSkilledExperience: 4,
  settlementFundsCad: 24000,
  hasValidJobOffer: true,
  openToRelocation: true,
  willingToStudyOrRetrain: true,
  budgetCad: 32000,
  targetTimelineMonths: 18,
}

describe('eligibilityDslEvaluator', () => {
  it('matches numeric threshold rules used by the seeded MVP pathways', () => {
    expect(evaluateEligibilityDslRule({
      unmetConditionId: 'minimum-english-clb-8',
      fieldPath: 'englishClb',
      operator: '>=',
      comparisonValue: 8,
    }, baselineProfile)).toBe(true)

    expect(evaluateEligibilityDslRule({
      unmetConditionId: 'minimum-budget-25000-cad',
      fieldPath: 'budgetCad',
      operator: '>=',
      comparisonValue: 40000,
    }, baselineProfile)).toBe(false)
  })

  it('supports boolean equality checks for offer and relocation requirements', () => {
    expect(evaluateEligibilityDslRule({
      unmetConditionId: 'requires-valid-job-offer',
      fieldPath: 'hasValidJobOffer',
      operator: '==',
      comparisonValue: true,
    }, baselineProfile)).toBe(true)

    expect(evaluateEligibilityDslRule({
      unmetConditionId: 'requires-relocation-flexibility',
      fieldPath: 'openToRelocation',
      operator: '!=',
      comparisonValue: true,
    }, baselineProfile)).toBe(false)
  })

  it('builds pathway evaluators that preserve the legacy unmetConditionId contract', () => {
    const evaluator = buildPathwayRuleEvaluator({
      unmetConditionId: 'minimum-skilled-experience-2-years',
      fieldPath: 'yearsSkilledExperience',
      operator: '>=',
      comparisonValue: 2,
    })

    expect(evaluator.unmetConditionId).toBe('minimum-skilled-experience-2-years')
    expect(evaluator.isSatisfied({
      ...baselineProfile,
      yearsSkilledExperience: 1,
    })).toBe(false)
  })

  it('rejects invalid boolean operators at the rule-schema boundary', () => {
    const parsed = pathwayRuleInputSchema.safeParse({
      unmetConditionId: 'requires-valid-job-offer',
      fieldPath: 'hasValidJobOffer',
      operator: '>',
      comparisonValue: true,
    })

    expect(parsed.success).toBe(false)
  })
})
