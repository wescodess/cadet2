export type RecommendationResultType = 'direct' | 'blocked' | 'composed'

export type RecommendationPathwayType = {
  key: 'available-now' | 'blocked-but-close' | 'strategic-multi-step'
  label: string
  description: string
}

export type RecommendationComparisonGroup = {
  key: RecommendationResultType
  label: string
  description: string
  count: number
}

export type RecommendationComparison = {
  mode: 'workspace' | 'fallback'
  summary: string
  limitation?: string
  groups: RecommendationComparisonGroup[]
  visibleGroupCount: number
  totalCandidateCount: number
}

export type RecommendationComparisonInput = {
  directCount: number
  blockedCount: number
  composedCount: number
  noComposedReason?: string
}

const pathwayTypeByResultType: Record<RecommendationResultType, RecommendationPathwayType> = {
  direct: {
    key: 'available-now',
    label: 'Available now',
    description: 'Current profile evidence supports action in the near term.',
  },
  blocked: {
    key: 'blocked-but-close',
    label: 'Blocked but close',
    description: 'The route is ranked, but one or more concrete blockers still need attention.',
  },
  composed: {
    key: 'strategic-multi-step',
    label: 'Strategic multi-step',
    description: 'This is a staged route that trades immediate action for a longer-horizon plan.',
  },
}

const groupDisplayByResultType: Record<RecommendationResultType, Omit<RecommendationComparisonGroup, 'count'>> = {
  direct: {
    key: 'direct',
    label: 'Available now',
    description: 'Paths you can act on soonest without inventing new prerequisites.',
  },
  blocked: {
    key: 'blocked',
    label: 'Blocked but close',
    description: 'Paths with useful ranking signal that still need explicit fixes first.',
  },
  composed: {
    key: 'composed',
    label: 'Longer-horizon pathways',
    description: 'Strategic routes that rely on staged milestones instead of immediate execution.',
  },
}

function buildGroups(input: RecommendationComparisonInput) {
  return ([
    {
      ...groupDisplayByResultType.direct,
      count: input.directCount,
    },
    {
      ...groupDisplayByResultType.blocked,
      count: input.blockedCount,
    },
    {
      ...groupDisplayByResultType.composed,
      count: input.composedCount,
    },
  ]).filter(group => group.count > 0)
}

function buildFallbackLimitation(
  groups: RecommendationComparisonGroup[],
  totalCandidateCount: number,
  noComposedReason?: string,
) {
  if (totalCandidateCount <= 1) {
    return 'Only one ranked pathway is available for this run, so a full side-by-side comparison would be misleading.'
  }

  const primaryGroup = groups[0]
  if (!primaryGroup) {
    return noComposedReason?.trim() || 'Comparison is limited because this run did not produce multiple pathway buckets.'
  }

  const classLabel = primaryGroup.key === 'direct'
    ? 'available-now'
    : primaryGroup.key === 'blocked'
      ? 'blocked-but-close'
      : 'longer-horizon'

  if (totalCandidateCount > 1) {
    return `All ${totalCandidateCount} ranked pathways fall into the same category (${classLabel}), so the workspace shifts into a structured review state instead of a side-by-side comparison across route types.`
  }

  return `Current results are limited to ${classLabel} pathways, so the workspace shifts into a structured review state.`
}

export function buildRecommendationComparison(input: RecommendationComparisonInput): RecommendationComparison {
  const groups = buildGroups(input)
  const totalCandidateCount = input.directCount + input.blockedCount + input.composedCount
  const visibleGroupCount = groups.length
  const mode = totalCandidateCount > 1 && visibleGroupCount > 1 ? 'workspace' : 'fallback'

  return {
    mode,
    summary: mode === 'workspace'
      ? 'Compare immediate, blocked, and longer-horizon pathways while keeping rank, trust, and next-step context visible.'
      : 'Comparison is limited for this run, so the workspace switches into a structured review state instead of a misleading empty layout.',
    limitation: mode === 'fallback'
      ? buildFallbackLimitation(groups, totalCandidateCount, input.noComposedReason)
      : undefined,
    groups,
    visibleGroupCount,
    totalCandidateCount,
  }
}

export function buildRecommendationPathwayType(type: RecommendationResultType): RecommendationPathwayType {
  return pathwayTypeByResultType[type]
}
