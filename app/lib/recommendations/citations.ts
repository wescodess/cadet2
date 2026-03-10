export const recommendationCitationSourceTypes = [
  'regulation',
  'policy-bulletin',
  'knowledge-base',
  'assessment-guide',
] as const

export const recommendationTrustBoundaryValues = [
  'source-backed',
  'inferred',
  'system-generated',
] as const

export type RecommendationCitationSourceType = typeof recommendationCitationSourceTypes[number]
export type RecommendationTrustBoundary = typeof recommendationTrustBoundaryValues[number]

export type RecommendationSourceContext = {
  excerpt: string
  retrievalDate: string
  freshness: 'fresh' | 'stale' | 'unknown'
  sourceTitle: string
  sourceType: RecommendationCitationSourceType
  sourceUrl: string
}

/**
 * Browser-facing citation metadata shape.
 * Must stay in sync with the server contract in
 * server/api/recommendations/runs/[runId]/results.get.ts
 */
export type RecommendationCitation = RecommendationSourceContext & {
  citationId: string
  claimText: string
}

export function getRecommendationTrustBoundaryLabel(boundary: RecommendationTrustBoundary) {
  if (boundary === 'source-backed') {
    return 'Source-backed'
  }

  if (boundary === 'inferred') {
    return 'Inferred'
  }

  return 'System-generated'
}

export function getRecommendationTrustBoundaryBadgeLabel(boundary: RecommendationTrustBoundary) {
  if (boundary === 'source-backed') {
    return 'Source-backed'
  }

  if (boundary === 'inferred') {
    return 'Strategic guidance'
  }

  return 'Limited evidence'
}

export function getRecommendationTrustBoundaryDescription(boundary: RecommendationTrustBoundary) {
  if (boundary === 'source-backed') {
    return 'This recommendation includes inspectable evidence context for its recommendation claims.'
  }

  if (boundary === 'inferred') {
    return 'This recommendation combines evidence with strategic inference. Review caveats before acting.'
  }

  return 'This recommendation is generated without direct evidence linkage and should be treated with added caution.'
}

export function getRecommendationCitationSourceTypeLabel(sourceType: RecommendationCitationSourceType) {
  if (sourceType === 'policy-bulletin') {
    return 'Policy bulletin'
  }

  if (sourceType === 'knowledge-base') {
    return 'Knowledge base'
  }

  if (sourceType === 'assessment-guide') {
    return 'Assessment guide'
  }

  return 'Regulation'
}
