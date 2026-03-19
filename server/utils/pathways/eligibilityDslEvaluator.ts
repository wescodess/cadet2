import type { MvpPathwayRule, NormalizedPathwayProfile } from './mvpPathwayCatalog'
import type {
  EligibilityDslFieldPath,
  EligibilityDslOperator,
  PathwayRuleComparisonValue,
  PathwayRuleRecord,
} from './pathwayRuleSchema'

type EligibilityDslRule = Pick<PathwayRuleRecord, 'unmetConditionId' | 'fieldPath' | 'operator' | 'comparisonValue'>

function readFieldValue(profile: NormalizedPathwayProfile, fieldPath: EligibilityDslFieldPath) {
  return profile[fieldPath]
}

function coerceBoolean(value: unknown) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === 'yes') {
      return true
    }

    if (normalized === 'false' || normalized === 'no') {
      return false
    }
  }

  return null
}

function coerceNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function compareValues(
  left: unknown,
  operator: EligibilityDslOperator,
  right: PathwayRuleComparisonValue,
) {
  const rightBoolean = coerceBoolean(right)
  const leftBoolean = coerceBoolean(left)

  if (rightBoolean !== null && leftBoolean !== null) {
    if (operator === '==') {
      return leftBoolean === rightBoolean
    }

    if (operator === '!=') {
      return leftBoolean !== rightBoolean
    }

    return false
  }

  const rightNumber = coerceNumber(right)
  const leftNumber = coerceNumber(left)

  if (rightNumber !== null && leftNumber !== null) {
    switch (operator) {
      case '>=':
        return leftNumber >= rightNumber
      case '<=':
        return leftNumber <= rightNumber
      case '>':
        return leftNumber > rightNumber
      case '<':
        return leftNumber < rightNumber
      case '==':
        return leftNumber === rightNumber
      case '!=':
        return leftNumber !== rightNumber
    }
  }

  const leftString = String(left ?? '').trim().toLowerCase()
  const rightString = String(right ?? '').trim().toLowerCase()

  if (operator === '==') {
    return leftString === rightString
  }

  if (operator === '!=') {
    return leftString !== rightString
  }

  return false
}

export function evaluateEligibilityDslRule(
  rule: EligibilityDslRule,
  profile: NormalizedPathwayProfile,
) {
  return compareValues(
    readFieldValue(profile, rule.fieldPath),
    rule.operator,
    rule.comparisonValue,
  )
}

export function buildPathwayRuleEvaluator(rule: EligibilityDslRule): MvpPathwayRule {
  return {
    unmetConditionId: rule.unmetConditionId,
    isSatisfied: profile => evaluateEligibilityDslRule(rule, profile),
  }
}
