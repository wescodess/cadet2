import type {
  RecommendationCitation,
  RecommendationEvidenceReference,
} from './buildRecommendationCitations'

export type RecommendationTrustBoundary = 'source-backed' | 'inferred' | 'system-generated'

type RecommendationConfidence = 'high' | 'medium' | 'low' | 'withheld'
type RecommendationQualification = 'supported' | 'low-confidence' | 'withheld'

export type ClassifyTrustBoundaryInput = {
  evidenceReferences?: RecommendationEvidenceReference[] | null
  citations?: RecommendationCitation[] | null
  confidence?: RecommendationConfidence | null
  qualification?: RecommendationQualification | null
}

export function classifyTrustBoundary(input: ClassifyTrustBoundaryInput): RecommendationTrustBoundary {
  if (input.confidence === 'withheld' || input.qualification === 'withheld') {
    return 'system-generated'
  }

  const citations = Array.isArray(input.citations)
    ? input.citations
    : Array.isArray(input.evidenceReferences)
      ? input.evidenceReferences
      : []

  if (citations.length === 0) {
    return 'inferred'
  }

  if (input.confidence === 'high' && input.qualification === 'supported') {
    return 'source-backed'
  }

  return 'inferred'
}
