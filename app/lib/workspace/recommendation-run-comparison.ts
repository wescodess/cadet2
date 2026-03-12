import type { PathwayChange } from '~~/shared/types/recommendation-run-comparison'

export type RunComparisonCategory = 'all' | 'improved' | 'new' | 'removed'
export type RunComparisonTrend = 'up' | 'down' | 'neutral'
export type RunComparisonTone = 'success' | 'warning' | 'danger' | 'neutral'

export const runComparisonCategories: RunComparisonCategory[] = ['all', 'improved', 'new', 'removed']

export function getRunComparisonCategoryLabel(category: RunComparisonCategory) {
  if (category === 'improved') {
    return 'Improved'
  }

  if (category === 'new') {
    return 'New'
  }

  if (category === 'removed') {
    return 'Removed'
  }

  return 'All'
}

export function getRunComparisonTrend(value: number): RunComparisonTrend {
  if (value > 0) {
    return 'up'
  }

  if (value < 0) {
    return 'down'
  }

  return 'neutral'
}

export function formatSignedNumber(value: number, digits = 1) {
  if (value === 0) {
    return '0'
  }

  const normalized = Number.isInteger(value) ? String(value) : value.toFixed(digits)
  return value > 0 ? `+${normalized}` : normalized
}

export function formatComparisonRunDate(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date'
  }

  return parsed.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function groupRunComparisonPathways(changes: PathwayChange[]) {
  return {
    all: changes,
    improved: changes.filter(change =>
      change.impact === 'improved'
      && (change.changeType === 'tier-changed' || change.changeType === 'score-changed'),
    ),
    new: changes.filter(change => change.changeType === 'added'),
    removed: changes.filter(change => change.changeType === 'removed'),
  }
}

export function getPathwayChangePresentation(change: PathwayChange): {
  label: string
  tone: RunComparisonTone
} {
  if (change.changeType === 'added') {
    return {
      label: 'New',
      tone: 'success',
    }
  }

  if (change.changeType === 'removed') {
    return {
      label: 'Removed',
      tone: 'danger',
    }
  }

  if (change.impact === 'declined') {
    return {
      label: 'Lower confidence',
      tone: 'warning',
    }
  }

  if (change.impact === 'improved') {
    return {
      label: 'Improved',
      tone: 'success',
    }
  }

  if (change.changeType === 'unchanged') {
    return {
      label: 'Stable',
      tone: 'neutral',
    }
  }

  return {
    label: 'Changed',
    tone: 'warning',
  }
}

export function getRunComparisonToneClasses(tone: RunComparisonTone) {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }

  if (tone === 'danger') {
    return 'border-rose-200 bg-rose-50 text-rose-900'
  }

  if (tone === 'warning') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }

  return 'border-slate-200 bg-slate-100 text-slate-700'
}

export function formatTierLabel(tier: PathwayChange['beforeTier']) {
  if (!tier) {
    return 'Not ranked'
  }

  if (tier === 'strong-fit') {
    return 'Strong fit'
  }

  if (tier === 'conditional-fit') {
    return 'Conditional fit'
  }

  return 'Lower confidence'
}
