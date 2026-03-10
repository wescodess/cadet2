const recommendationCitationSourceTypes = [
  'regulation',
  'policy-bulletin',
  'knowledge-base',
  'assessment-guide',
] as const

type RecommendationCitationSourceType = typeof recommendationCitationSourceTypes[number]
type RecommendationCitationFreshness = 'fresh' | 'stale' | 'unknown'

export type RecommendationEvidenceReference = {
  citationId?: unknown
  claim?: unknown
  source?: {
    title?: unknown
    url?: unknown
    type?: unknown
    excerpt?: unknown
    retrievedAt?: unknown
  } | null
} | null

export type RecommendationCitation = {
  citationId: string
  claimText: string
  sourceTitle: string
  sourceUrl: string
  sourceType: RecommendationCitationSourceType
  excerpt: string
  retrievalDate: string
  freshness: RecommendationCitationFreshness
}

const canonicalSourceTypeSet = new Set<string>(recommendationCitationSourceTypes)
const freshEvidenceWindowMs = 180 * 24 * 60 * 60 * 1000

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function normalizeSourceType(value: unknown): RecommendationCitationSourceType {
  const normalized = toNonEmptyString(value).toLowerCase()

  if (canonicalSourceTypeSet.has(normalized)) {
    return normalized as RecommendationCitationSourceType
  }

  return 'knowledge-base'
}

function normalizeFreshness(retrievalDate: string, now = Date.now()): RecommendationCitationFreshness {
  if (!retrievalDate) {
    return 'unknown'
  }

  const timestamp = Date.parse(retrievalDate)
  if (Number.isNaN(timestamp)) {
    return 'unknown'
  }

  return (now - timestamp) <= freshEvidenceWindowMs
    ? 'fresh'
    : 'stale'
}

export function buildRecommendationCitations(
  evidenceReferences: RecommendationEvidenceReference[] | null | undefined,
): RecommendationCitation[] {
  if (!Array.isArray(evidenceReferences) || evidenceReferences.length === 0) {
    return []
  }

  return evidenceReferences.flatMap((reference, index) => {
    const referenceRecord = toRecord(reference)
    const sourceRecord = toRecord(referenceRecord.source)

    const claimText = toNonEmptyString(referenceRecord.claim)
    const sourceTitle = toNonEmptyString(sourceRecord.title)
    const sourceUrl = toNonEmptyString(sourceRecord.url)
    const excerpt = toNonEmptyString(sourceRecord.excerpt) || claimText
    const retrievalDate = toNonEmptyString(sourceRecord.retrievedAt)

    if (!claimText || !sourceTitle || !sourceUrl) {
      return []
    }

    return [{
      citationId: toNonEmptyString(referenceRecord.citationId) || `citation-${index + 1}`,
      claimText,
      sourceTitle,
      sourceUrl,
      sourceType: normalizeSourceType(sourceRecord.type),
      excerpt,
      retrievalDate,
      freshness: normalizeFreshness(retrievalDate),
    }]
  })
}
