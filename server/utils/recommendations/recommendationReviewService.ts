import type { H3Event } from 'h3'
import { getFunctionName, makeFunctionReference } from 'convex/server'
import type { FunctionArgs, FunctionReturnType } from 'convex/server'
import { api, internal } from '../../../convex/_generated/api'
import { createConvexAdminClient, createConvexUserHttpClientForEvent } from '../convex-admin-client'
import { requireAdminSession } from '../auth/requireAdminSession'
import { listPathwayDefinitions } from '../pathways/pathwayDefinitionService'
import { toEvidenceSourceRecord, type EvidenceSourceRecord } from '../admin/evidenceSourceSchema'
import {
  loadRecommendationCitationReviewStateMap,
  loadRecommendationRunReviewStateMap,
} from './recommendationReviewStateService'
import { listFallbackRecommendationRuns } from './testRecommendationRunFallback'
import { toIsoString } from './reviewDateUtils'
import {
  recommendationReviewFreshnessLabelSchema,
  recommendationReviewStateSchema,
  recommendationReviewSupportStrengthSchema,
  recommendationReviewTrustScoreSchema,
  type RecommendationReviewFreshnessLabel,
  type RecommendationReviewRunStatus,
  type RecommendationReviewState,
  type RecommendationReviewSupportStrength,
  type RecommendationReviewTrustScore,
} from './recommendationReviewSchema'

// The admin HTTP transport supports internal calls; its SDK types require public references.
const listReviewRuns = makeFunctionReference<
  'query',
  FunctionArgs<typeof internal.recommendationRuns.listForAdmin>,
  FunctionReturnType<typeof internal.recommendationRuns.listForAdmin>
>(getFunctionName(internal.recommendationRuns.listForAdmin))
const readReviewRun = makeFunctionReference<
  'query',
  FunctionArgs<typeof internal.recommendationRuns.readRankedRecommendationsForAdmin>,
  FunctionReturnType<typeof internal.recommendationRuns.readRankedRecommendationsForAdmin>
>(getFunctionName(internal.recommendationRuns.readRankedRecommendationsForAdmin))

type ConvexRecommendationReviewCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  rationale?: string
  qualification?: 'supported' | 'low-confidence' | 'withheld'
  confidence?: 'high' | 'medium' | 'low' | 'withheld'
  freshness?: 'fresh' | 'stale' | 'unknown'
  caveat?: string
  fitSignals?: Array<{
    label?: string
    detail?: string
    state?: 'strength' | 'watch' | 'gap'
  }>
  citations?: unknown
}

type ConvexRecommendationReviewRun = {
  runId: string
  userId: string
  profileSnapshotId: string
  status: RecommendationReviewRunStatus | string
  createdAt: number | string | Date
  updatedAt: number | string | Date
  recommendationResults?: {
    rankedAt?: number
    noComposedReason?: string
    direct?: ConvexRecommendationReviewCandidate[]
    blocked?: ConvexRecommendationReviewCandidate[]
    composed?: ConvexRecommendationReviewCandidate[]
  } | null
}

type RecommendationReviewRunSummary = {
  runId: string
  profileSnapshotId: string
  createdAt: string
  recommendationStatus: RecommendationReviewRunStatus
  trustScore: RecommendationReviewTrustScore
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: RecommendationReviewFreshnessLabel
  citationCount: number
  reviewState: RecommendationReviewState
  flaggedCitationCount: number
  anonymizedSubject: string
  caveatCount: number
}

type RecommendationReviewCitation = {
  citationId: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  sourceType: 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
  claimSnippet: string
  pathwayId: string
  pathwayLabel: string
  freshness: RecommendationReviewFreshnessLabel
  supportStrength: RecommendationReviewSupportStrength
  matchContext: string
  reviewState: RecommendationReviewState
  lastReviewedAt: string | null
  flagReason: string | null
}

type RecommendationReviewRunDetail = {
  ok: true
  run: RecommendationReviewRunSummary & {
    subjectReference: {
      label: string
      profileSnapshotId: string
    }
    trustSignals: {
      strong: number
      watch: number
      gaps: number
    }
    caveats: string[]
    citationBuckets: {
      all: number
      weakSupport: number
      staleSources: number
      missingReferences: number
    }
  }
  citations: RecommendationReviewCitation[]
}

const reviewableStatuses = new Set<RecommendationReviewRunStatus>([
  'completed',
  'degraded',
  'failed',
])

const pathwayLabels: Record<string, string> = {
  'mvp-skilled-worker': 'Skilled Worker pathway',
  'mvp-provincial-nominee': 'Provincial Nominee pathway',
  'mvp-study-to-work': 'Study-to-Work pathway',
}

function normalizeRunStatus(value: string): RecommendationReviewRunStatus | null {
  return reviewableStatuses.has(value as RecommendationReviewRunStatus)
    ? (value as RecommendationReviewRunStatus)
    : null
}

function flattenCandidates(run: ConvexRecommendationReviewRun) {
  const results = run.recommendationResults

  return [
    ...(results?.direct || []),
    ...(results?.blocked || []),
    ...(results?.composed || []),
  ].sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank
    }

    return left.pathwayId.localeCompare(right.pathwayId)
  })
}

function getPathwayLabel(pathwayId: string, pathwayLabelMap: Map<string, string>) {
  return pathwayLabelMap.get(pathwayId) || pathwayLabels[pathwayId] || pathwayId
}

function buildAnonymizedSubject(profileSnapshotId: string) {
  const suffix = profileSnapshotId
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-4)
    .toUpperCase()
  return `Candidate ${suffix || 'ANON'}`
}

function normalizeCitationSourceType(value: unknown): RecommendationReviewCitation['sourceType'] {
  if (
    value === 'regulation' ||
    value === 'policy-bulletin' ||
    value === 'knowledge-base' ||
    value === 'assessment-guide'
  ) {
    return value
  }

  return 'knowledge-base'
}

function toNonEmptyString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeFreshnessLabelFromDate(
  value: string | null | undefined,
): RecommendationReviewFreshnessLabel {
  if (!value) {
    return 'expired'
  }

  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return 'expired'
  }

  const ageDays = (Date.now() - timestamp) / (1000 * 60 * 60 * 24)
  if (ageDays <= 180) {
    return 'current'
  }

  if (ageDays <= 365) {
    return 'stale'
  }

  return 'expired'
}

function normalizeFreshnessLabelFromSource(
  source: EvidenceSourceRecord | null | undefined,
): RecommendationReviewFreshnessLabel {
  if (!source) {
    return 'expired'
  }

  if (source.freshness === 'fresh') {
    return 'current'
  }

  if (source.freshness === 'stale') {
    return 'stale'
  }

  return 'expired'
}

function pickConfidence(candidates: ConvexRecommendationReviewCandidate[]) {
  const weight: Record<'high' | 'medium' | 'low' | 'withheld', number> = {
    high: 0,
    medium: 1,
    low: 2,
    withheld: 3,
  }

  return candidates.reduce<'high' | 'medium' | 'low' | 'withheld'>((current, candidate) => {
    const next =
      candidate.confidence === 'high' ||
      candidate.confidence === 'medium' ||
      candidate.confidence === 'low' ||
      candidate.confidence === 'withheld'
        ? candidate.confidence
        : 'withheld'

    return weight[next] > weight[current] ? next : current
  }, 'high')
}

function pickRunFreshness(
  citations: RecommendationReviewCitation[],
  candidates: ConvexRecommendationReviewCandidate[],
) {
  const explicitLabels = citations.map((citation) => citation.freshness)
  if (explicitLabels.includes('expired')) {
    return 'expired'
  }

  if (explicitLabels.includes('stale')) {
    return 'stale'
  }

  if (explicitLabels.includes('current')) {
    return 'current'
  }

  if (
    candidates.some(
      (candidate) => candidate.freshness === 'stale' || candidate.freshness === 'unknown',
    )
  ) {
    return 'stale'
  }

  return 'current'
}

function pickTrustScore(input: {
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: RecommendationReviewFreshnessLabel
  citationCount: number
  caveatCount: number
  weakCitationCount: number
}) {
  if (
    input.citationCount === 0 ||
    input.confidence === 'withheld' ||
    input.confidence === 'low' ||
    input.freshness === 'expired' ||
    input.weakCitationCount > 1
  ) {
    return recommendationReviewTrustScoreSchema.parse('low')
  }

  if (
    input.confidence === 'high' &&
    input.freshness === 'current' &&
    input.caveatCount <= 1 &&
    input.weakCitationCount === 0
  ) {
    return recommendationReviewTrustScoreSchema.parse('high')
  }

  return recommendationReviewTrustScoreSchema.parse('medium')
}

function computeSupportStrength(input: {
  candidate: ConvexRecommendationReviewCandidate
  freshness: RecommendationReviewFreshnessLabel
  hasMappedSource: boolean
}) {
  if (
    !input.hasMappedSource ||
    input.freshness === 'expired' ||
    input.candidate.qualification === 'withheld'
  ) {
    return recommendationReviewSupportStrengthSchema.parse('unsupported')
  }

  if (
    input.freshness === 'stale' ||
    input.candidate.confidence === 'low' ||
    input.candidate.confidence === 'withheld' ||
    input.candidate.qualification === 'low-confidence'
  ) {
    return recommendationReviewSupportStrengthSchema.parse('weak')
  }

  if (input.candidate.confidence === 'high' && input.candidate.qualification === 'supported') {
    return recommendationReviewSupportStrengthSchema.parse('strong')
  }

  return recommendationReviewSupportStrengthSchema.parse('adequate')
}

function resolveSourceUrl(source: EvidenceSourceRecord | null | undefined, fallbackUrl = '') {
  const crawlConfig = source?.crawlConfig || {}
  const seedUrls = Array.isArray(crawlConfig.seedUrls)
    ? crawlConfig.seedUrls.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    : []
  const youtubeUrl = typeof crawlConfig.channelUrl === 'string' ? crawlConfig.channelUrl.trim() : ''

  return fallbackUrl || seedUrls[0] || youtubeUrl || 'https://example.com'
}

function sourceMatchesCitation(
  source: EvidenceSourceRecord,
  input: {
    pathwayId: string
    sourceUrl: string
    sourceName: string
  },
) {
  let score = 0

  if (source.linkedPathwayIds.includes(input.pathwayId)) {
    score += 5
  }

  const sourceUrl = resolveSourceUrl(source)
  if (sourceUrl && input.sourceUrl) {
    try {
      if (new URL(sourceUrl).hostname === new URL(input.sourceUrl).hostname) {
        score += 3
      }
    } catch {}
  }

  if (input.sourceName && source.name.toLowerCase().includes(input.sourceName.toLowerCase())) {
    score += 1
  }

  return score
}

function matchEvidenceSource(
  sources: EvidenceSourceRecord[],
  input: {
    pathwayId: string
    sourceUrl: string
    sourceName: string
  },
) {
  let bestScore = -1
  let bestSource: EvidenceSourceRecord | null = null

  for (const source of sources) {
    const score = sourceMatchesCitation(source, input)
    if (score > bestScore) {
      bestScore = score
      bestSource = source
    }
  }

  if (bestSource) {
    return bestSource
  }

  return sources.find((source) => source.linkedPathwayIds.includes(input.pathwayId)) || null
}

function normalizeStoredCitations(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    )
    .map((entry, index) => ({
      citationId: toNonEmptyString(entry.citationId) || `citation-${index + 1}`,
      claimSnippet: toNonEmptyString(entry.claimText || entry.claim) || '',
      sourceName: toNonEmptyString(entry.sourceTitle),
      sourceUrl: toNonEmptyString(entry.sourceUrl),
      sourceType: normalizeCitationSourceType(entry.sourceType),
      retrievalDate: toNonEmptyString(entry.retrievalDate),
      excerpt: toNonEmptyString(entry.excerpt),
    }))
    .filter((entry) => entry.claimSnippet.length > 0)
}

function buildCandidateFallbackCitation(
  run: ConvexRecommendationReviewRun,
  candidate: ConvexRecommendationReviewCandidate,
  candidateIndex: number,
  source: EvidenceSourceRecord | null,
  pathwayLabel: string,
) {
  const citationId = `${run.runId}-${candidate.pathwayId}-${candidateIndex + 1}`
  const claimSnippet =
    candidate.caveat?.trim() ||
    candidate.rationale?.trim() ||
    `${pathwayLabel} requires admin review because direct citation evidence was not persisted.`
  const sourceName = source?.name || `${pathwayLabel} governance reference`

  return {
    citationId,
    claimSnippet,
    sourceName,
    sourceUrl: resolveSourceUrl(source),
    sourceType: normalizeCitationSourceType(
      source?.type === 'website' ? 'knowledge-base' : 'policy-bulletin',
    ),
    freshness: normalizeFreshnessLabelFromSource(source),
    sourceId: source?.id || `source-unmapped-${candidate.pathwayId}`,
    matchContext: `${pathwayLabel} ${candidate.type} recommendation matched against current governance and pathway context.`,
  }
}

type FallbackRecommendationReviewRun = {
  runId: string
  userId: string
  profileSnapshotId: string
  status: RecommendationReviewRunStatus | string
  statusMessage?: string
  processingHeartbeatAt?: number
  createdAt: number
  updatedAt: number
  pathwayEvaluation?: {
    direct: Array<{
      pathwayId: string
      status: 'direct'
    }>
    blocked: Array<{
      pathwayId: string
      status: 'blocked'
      unmetConditions: string[]
    }>
    evaluatedAt: number
  }
}

function buildProjectedCitations(input: {
  run: ConvexRecommendationReviewRun
  candidates: ConvexRecommendationReviewCandidate[]
  sources: EvidenceSourceRecord[]
  pathwayLabelMap: Map<string, string>
  citationReviewStateMap: Map<
    string,
    {
      reviewState: RecommendationReviewState
      reason: string | null
      updatedAt: string
    }
  >
}) {
  return input.candidates.flatMap((candidate, candidateIndex) => {
    const pathwayLabel = getPathwayLabel(candidate.pathwayId, input.pathwayLabelMap)
    const storedCitations = normalizeStoredCitations(candidate.citations)

    if (storedCitations.length > 0) {
      return storedCitations.map((citation) => {
        const matchedSource = matchEvidenceSource(input.sources, {
          pathwayId: candidate.pathwayId,
          sourceUrl: citation.sourceUrl,
          sourceName: citation.sourceName,
        })
        const freshness = recommendationReviewFreshnessLabelSchema.parse(
          matchedSource
            ? normalizeFreshnessLabelFromSource(matchedSource)
            : normalizeFreshnessLabelFromDate(citation.retrievalDate),
        )
        const reviewKey = `${input.run.runId}:${citation.citationId}`
        const reviewState = input.citationReviewStateMap.get(reviewKey)
        const supportStrength = computeSupportStrength({
          candidate,
          freshness,
          hasMappedSource: Boolean(matchedSource),
        })

        return {
          citationId: citation.citationId,
          sourceId: matchedSource?.id || `source-unmapped-${candidate.pathwayId}`,
          sourceName:
            matchedSource?.name || citation.sourceName || `${pathwayLabel} governance reference`,
          sourceUrl: citation.sourceUrl || resolveSourceUrl(matchedSource),
          sourceType: citation.sourceType,
          claimSnippet: citation.claimSnippet,
          pathwayId: candidate.pathwayId,
          pathwayLabel,
          freshness,
          supportStrength,
          matchContext: `${pathwayLabel} ${candidate.type} recommendation matched on ${candidate.fitSignals?.[0]?.label || 'review context'}.`,
          reviewState: reviewState?.reviewState || recommendationReviewStateSchema.parse('pending'),
          lastReviewedAt: reviewState?.updatedAt || null,
          flagReason: reviewState?.reason || null,
        } satisfies RecommendationReviewCitation
      })
    }

    const fallbackSource = matchEvidenceSource(input.sources, {
      pathwayId: candidate.pathwayId,
      sourceUrl: '',
      sourceName: pathwayLabel,
    })
    const fallbackCitation = buildCandidateFallbackCitation(
      input.run,
      candidate,
      candidateIndex,
      fallbackSource,
      pathwayLabel,
    )
    const reviewKey = `${input.run.runId}:${fallbackCitation.citationId}`
    const reviewState = input.citationReviewStateMap.get(reviewKey)
    const supportStrength = computeSupportStrength({
      candidate,
      freshness: fallbackCitation.freshness,
      hasMappedSource: Boolean(fallbackSource),
    })

    return [
      {
        citationId: fallbackCitation.citationId,
        sourceId: fallbackCitation.sourceId,
        sourceName: fallbackCitation.sourceName,
        sourceUrl: fallbackCitation.sourceUrl,
        sourceType: fallbackCitation.sourceType,
        claimSnippet: fallbackCitation.claimSnippet,
        pathwayId: candidate.pathwayId,
        pathwayLabel,
        freshness: fallbackCitation.freshness,
        supportStrength,
        matchContext: fallbackCitation.matchContext,
        reviewState: reviewState?.reviewState || recommendationReviewStateSchema.parse('pending'),
        lastReviewedAt: reviewState?.updatedAt || null,
        flagReason: reviewState?.reason || null,
      } satisfies RecommendationReviewCitation,
    ]
  })
}

function buildRunSummary(input: {
  run: ConvexRecommendationReviewRun
  candidates: ConvexRecommendationReviewCandidate[]
  citations: RecommendationReviewCitation[]
  reviewState: RecommendationReviewState
}) {
  const reviewableStatus = normalizeRunStatus(input.run.status)
  if (!reviewableStatus) {
    return null
  }

  const caveats = input.candidates
    .map((candidate) => candidate.caveat?.trim() || '')
    .filter(Boolean)
  const confidence = pickConfidence(input.candidates)
  const freshness = pickRunFreshness(input.citations, input.candidates)
  const weakCitationCount = input.citations.filter(
    (citation) => citation.supportStrength === 'weak' || citation.supportStrength === 'unsupported',
  ).length

  return {
    runId: input.run.runId,
    profileSnapshotId: input.run.profileSnapshotId,
    createdAt: toIsoString(input.run.createdAt),
    recommendationStatus: reviewableStatus,
    trustScore: pickTrustScore({
      confidence,
      freshness,
      citationCount: input.citations.length,
      caveatCount: caveats.length,
      weakCitationCount,
    }),
    confidence,
    freshness,
    citationCount: input.citations.length,
    reviewState: input.reviewState,
    flaggedCitationCount: input.citations.filter((citation) => citation.reviewState === 'flagged')
      .length,
    anonymizedSubject: buildAnonymizedSubject(input.run.profileSnapshotId),
    caveatCount: caveats.length,
  } satisfies RecommendationReviewRunSummary
}

async function loadReviewProjectionContext(event: H3Event) {
  const [pathwayDefinitions, sourceResult] = await Promise.all([
    listPathwayDefinitions(),
    createConvexUserHttpClientForEvent(event).then(async (convex) => {
      return await convex.query(api.ragSources.listSources, {
        includeAllForAdmin: true,
      })
    }),
  ])

  return {
    pathwayLabelMap: new Map(
      pathwayDefinitions.map((item) => [item.pathwayId, item.displayName] as const),
    ),
    sources: sourceResult.items.map((item) => toEvidenceSourceRecord(item as never)),
  }
}

function toFallbackCandidate(
  pathwayId: string,
  type: 'direct' | 'blocked',
  rank: number,
  unmetConditions: string[] = [],
): ConvexRecommendationReviewCandidate {
  return {
    pathwayId,
    type,
    rank,
    confidence: type === 'direct' ? 'medium' : 'low',
    qualification: type === 'direct' ? 'supported' : 'low-confidence',
    freshness: 'unknown',
    rationale:
      type === 'direct'
        ? `${pathwayLabels[pathwayId] || pathwayId} remained directly available in fallback recommendation evaluation.`
        : `${pathwayLabels[pathwayId] || pathwayId} requires follow-up on ${unmetConditions.join(', ') || 'unresolved conditions'} before reuse.`,
    caveat:
      type === 'direct'
        ? 'Fallback evaluation used pathway-only evidence and should be checked against current trust support.'
        : 'Fallback evaluation identified unresolved pathway conditions and should not be reused without review.',
    fitSignals: unmetConditions.slice(0, 2).map((condition) => ({
      label: condition,
      detail: `${condition} requires admin follow-up before continued reuse.`,
      state: 'gap' as const,
    })),
  }
}

function toFallbackReviewRunRecord(
  run: FallbackRecommendationReviewRun,
): ConvexRecommendationReviewRun {
  const direct = (run.pathwayEvaluation?.direct || []).map((entry, index) =>
    toFallbackCandidate(entry.pathwayId, 'direct', index + 1),
  )
  const blocked = (run.pathwayEvaluation?.blocked || []).map((entry, index) =>
    toFallbackCandidate(
      entry.pathwayId,
      'blocked',
      direct.length + index + 1,
      entry.unmetConditions,
    ),
  )

  return {
    runId: run.runId,
    userId: run.userId,
    profileSnapshotId: run.profileSnapshotId,
    status: run.status,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    recommendationResults: {
      rankedAt: run.pathwayEvaluation?.evaluatedAt,
      noComposedReason: '',
      direct,
      blocked,
      composed: [],
    },
  }
}

async function loadRecommendationRuns(event: H3Event) {
  await requireAdminSession(event)
  const convex = await createConvexAdminClient()
  let runs: ConvexRecommendationReviewRun[] = []

  try {
    runs = await convex.query(listReviewRuns, {})
  } catch {
    runs = listFallbackRecommendationRuns().map((run) =>
      toFallbackReviewRunRecord(run as FallbackRecommendationReviewRun),
    )
  }

  return runs
    .filter((run) => {
      const status = normalizeRunStatus(run.status)
      return Boolean(status) && flattenCandidates(run).length > 0
    })
    .sort((left, right) => {
      const leftTime = Date.parse(toIsoString(left.createdAt))
      const rightTime = Date.parse(toIsoString(right.createdAt))
      return rightTime - leftTime
    })
}

async function loadRecommendationRunDetail(event: H3Event, runId: string) {
  await requireAdminSession(event)
  const convex = await createConvexAdminClient()
  try {
    return await convex.query(readReviewRun, {
      runId,
    })
  } catch {
    const fallbackRun = listFallbackRecommendationRuns().find((run) => run.runId === runId) || null
    if (!fallbackRun) {
      return null
    }

    const normalized = toFallbackReviewRunRecord(fallbackRun as FallbackRecommendationReviewRun)

    return {
      runId: normalized.runId,
      userId: normalized.userId,
      profileSnapshotId: normalized.profileSnapshotId,
      status: normalized.status,
      createdAt: normalized.createdAt,
      updatedAt: normalized.updatedAt,
      results: {
        direct: normalized.recommendationResults?.direct || [],
        blocked: normalized.recommendationResults?.blocked || [],
        composed: normalized.recommendationResults?.composed || [],
      },
    }
  }
}

export async function listRecommendationReviews(event: H3Event) {
  const runs = await loadRecommendationRuns(event)
  const runIds = runs.map((run) => run.runId)
  const [runReviewStateMap, citationReviewStateMap, sourcesContext] = await Promise.all([
    loadRecommendationRunReviewStateMap(runIds),
    loadRecommendationCitationReviewStateMap(runIds),
    loadReviewProjectionContext(event),
  ])

  const items = runs
    .map((run) => {
      const candidates = flattenCandidates(run)
      const citations = buildProjectedCitations({
        run,
        candidates,
        sources: sourcesContext.sources,
        pathwayLabelMap: sourcesContext.pathwayLabelMap,
        citationReviewStateMap: citationReviewStateMap as Map<
          string,
          {
            reviewState: RecommendationReviewState
            reason: string | null
            updatedAt: string
          }
        >,
      })
      const reviewState =
        runReviewStateMap.get(run.runId)?.reviewState ||
        recommendationReviewStateSchema.parse('pending')

      return buildRunSummary({
        run,
        candidates,
        citations,
        reviewState,
      })
    })
    .filter((item): item is RecommendationReviewRunSummary => Boolean(item))

  return {
    ok: true as const,
    items,
    totalCount: items.length,
  }
}

export async function getRecommendationReviewDetail(
  event: H3Event,
  runId: string,
): Promise<RecommendationReviewRunDetail | null> {
  const rawRun = await loadRecommendationRunDetail(event, runId)
  if (!rawRun) {
    return null
  }

  const status = normalizeRunStatus(rawRun.status)
  if (!status) {
    return null
  }

  const candidates = [
    ...rawRun.results.direct,
    ...rawRun.results.blocked,
    ...rawRun.results.composed,
  ].sort((left, right) => left.rank - right.rank)
  const [runReviewStateMap, citationReviewStateMap, context] = await Promise.all([
    loadRecommendationRunReviewStateMap([runId]),
    loadRecommendationCitationReviewStateMap([runId]),
    loadReviewProjectionContext(event),
  ])

  const run: ConvexRecommendationReviewRun = {
    runId: rawRun.runId,
    userId: rawRun.userId,
    profileSnapshotId: rawRun.profileSnapshotId,
    status,
    createdAt: rawRun.createdAt,
    updatedAt: rawRun.updatedAt,
    recommendationResults: {
      direct: rawRun.results.direct,
      blocked: rawRun.results.blocked,
      composed: rawRun.results.composed,
    },
  }

  const citations = buildProjectedCitations({
    run,
    candidates,
    sources: context.sources,
    pathwayLabelMap: context.pathwayLabelMap,
    citationReviewStateMap: citationReviewStateMap as Map<
      string,
      {
        reviewState: RecommendationReviewState
        reason: string | null
        updatedAt: string
      }
    >,
  })
  const reviewState =
    runReviewStateMap.get(runId)?.reviewState || recommendationReviewStateSchema.parse('pending')
  const summary = buildRunSummary({
    run,
    candidates,
    citations,
    reviewState,
  })

  if (!summary) {
    return null
  }

  const caveats = [
    ...new Set(candidates.map((candidate) => candidate.caveat?.trim() || '').filter(Boolean)),
  ]

  return {
    ok: true,
    run: {
      ...summary,
      subjectReference: {
        label: summary.anonymizedSubject,
        profileSnapshotId: summary.profileSnapshotId,
      },
      trustSignals: {
        strong: citations.filter((citation) => citation.supportStrength === 'strong').length,
        watch: citations.filter(
          (citation) =>
            citation.supportStrength === 'adequate' || citation.supportStrength === 'weak',
        ).length,
        gaps: citations.filter((citation) => citation.supportStrength === 'unsupported').length,
      },
      caveats,
      citationBuckets: {
        all: citations.length,
        weakSupport: citations.filter(
          (citation) =>
            citation.supportStrength === 'weak' || citation.supportStrength === 'unsupported',
        ).length,
        staleSources: citations.filter(
          (citation) => citation.freshness === 'stale' || citation.freshness === 'expired',
        ).length,
        missingReferences: citations.filter(
          (citation) => citation.supportStrength === 'unsupported',
        ).length,
      },
    },
    citations,
  }
}
