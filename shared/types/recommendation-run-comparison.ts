export type RecommendationRunComparisonStatus = 'completed' | 'degraded' | 'failed'
export type RecommendationRunComparisonResultType = 'direct' | 'blocked' | 'composed'
export type RecommendationRunComparisonTier = 'strong-fit' | 'conditional-fit' | 'lower-confidence'
export type RecommendationRunComparisonConfidence = 'high' | 'medium' | 'low' | 'withheld'
export type RecommendationRunComparisonFreshness = 'fresh' | 'stale' | 'unknown'
export type RecommendationRunComparisonTrustBoundary = 'source-backed' | 'inferred' | 'system-generated'
export type RecommendationRunComparisonChangeType = 'added' | 'removed' | 'tier-changed' | 'score-changed' | 'unchanged'
export type RecommendationRunComparisonImpact = 'improved' | 'declined' | 'neutral'
export type RecommendationRunComparisonShift = 'improved' | 'declined' | 'unchanged'

export type RecommendationRunComparisonRunMeta = {
  id: string
  createdAt: string
  status: RecommendationRunComparisonStatus
  profileSnapshotId: string
  recommendationCount: number
}

export type RecommendationRunComparisonSummary = {
  added: number
  removed: number
  changed: number
  overallConfidenceChange: number
  newEvidenceCount: number
}

export type RecommendationRunComparisonCaveat = {
  id: string
  pathwayId: string
  pathwayName: string
  text: string
}

export type RecommendationRunComparisonEvidenceReference = {
  citationId: string
  claimText: string
  sourceTitle: string
  sourceUrl: string
  excerpt: string
  retrievalDate: string
  freshness: RecommendationRunComparisonFreshness
}

export type TrustChange = {
  pathwayId: string
  pathwayName: string
  beforeCitationCount: number
  afterCitationCount: number
  citationDelta: number
  addedCitationCount: number
  removedCitationCount: number
  beforeFreshness: RecommendationRunComparisonFreshness
  afterFreshness: RecommendationRunComparisonFreshness
  freshnessChange: RecommendationRunComparisonShift
  beforeConfidence: RecommendationRunComparisonConfidence
  afterConfidence: RecommendationRunComparisonConfidence
  confidenceChange: RecommendationRunComparisonShift
  beforeTrustBoundary: RecommendationRunComparisonTrustBoundary
  afterTrustBoundary: RecommendationRunComparisonTrustBoundary
  trustBoundaryChanged: boolean
  addedEvidence: RecommendationRunComparisonEvidenceReference[]
  removedEvidence: RecommendationRunComparisonEvidenceReference[]
}

export type ProfileDeltaField = {
  key: string
  section: string
  label: string
  beforeValue: string
  afterValue: string
}

export type ProfileDeltaSummary = {
  changedFieldCount: number
  changedFields: ProfileDeltaField[]
  summary: string
}

export type PathwayChange = {
  pathwayId: string
  pathwayName: string
  changeType: RecommendationRunComparisonChangeType
  impact: RecommendationRunComparisonImpact
  beforeType: RecommendationRunComparisonResultType | null
  afterType: RecommendationRunComparisonResultType | null
  beforeRank: number | null
  afterRank: number | null
  rankDelta: number | null
  beforeTier: RecommendationRunComparisonTier | null
  afterTier: RecommendationRunComparisonTier | null
  beforeScore: number | null
  afterScore: number | null
  scoreDelta: number | null
  reason: string
  trustDiff: TrustChange | null
}

export type ComparisonResult = {
  runs: {
    baseline: RecommendationRunComparisonRunMeta
    current: RecommendationRunComparisonRunMeta
  }
  summary: RecommendationRunComparisonSummary
  pathwayChanges: PathwayChange[]
  trustChanges: TrustChange[]
  caveatChanges: {
    added: RecommendationRunComparisonCaveat[]
    removed: RecommendationRunComparisonCaveat[]
  }
  profileDelta: ProfileDeltaSummary | null
  comparisonAvailable: boolean
  unavailableReason?: string
}
