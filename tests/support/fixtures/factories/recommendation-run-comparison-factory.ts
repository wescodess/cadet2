import type { ComparisonResult } from '../../../../shared/types/recommendation-run-comparison'

import { createRecommendationRunHistoryListFixture } from './recommendation-run-history-factory'

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export function createRecommendationRunComparisonRouteProbe(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return {
    historyPath: `${normalizedBaseUrl}/workspace/history`,
    comparePath: (runA: string, runB: string, historyFilter?: string) =>
      `${normalizedBaseUrl}/workspace/compare?runA=${encodeURIComponent(runA)}&runB=${encodeURIComponent(runB)}${historyFilter ? `&historyFilter=${encodeURIComponent(historyFilter)}` : ''}`,
  }
}

export function createRecommendationRunComparisonFixture(overrides: Partial<ComparisonResult> = {}): ComparisonResult {
  const runs = createRecommendationRunHistoryListFixture()
  const baseline = runs[1] || runs[0]!
  const current = runs[0]!

  return {
    runs: {
      baseline: {
        id: baseline.id,
        createdAt: baseline.createdAt,
        status: baseline.status,
        profileSnapshotId: `${baseline.id}-snapshot`,
        recommendationCount: baseline.recommendationCount,
      },
      current: {
        id: current.id,
        createdAt: current.createdAt,
        status: current.status,
        profileSnapshotId: `${current.id}-snapshot`,
        recommendationCount: current.recommendationCount,
      },
    },
    summary: {
      added: 1,
      removed: 1,
      changed: 3,
      overallConfidenceChange: 1,
      newEvidenceCount: 2,
    },
    pathwayChanges: [
      {
        pathwayId: 'mvp-skilled-worker',
        pathwayName: 'Skilled Worker pathway',
        changeType: 'tier-changed',
        impact: 'improved',
        beforeType: 'blocked',
        afterType: 'direct',
        beforeRank: 2,
        afterRank: 1,
        rankDelta: -1,
        beforeTier: 'conditional-fit',
        afterTier: 'strong-fit',
        beforeScore: 74,
        afterScore: 91,
        scoreDelta: 17,
        reason: 'Tier moved from conditional fit to strong fit.',
        trustDiff: {
          pathwayId: 'mvp-skilled-worker',
          pathwayName: 'Skilled Worker pathway',
          beforeCitationCount: 1,
          afterCitationCount: 2,
          citationDelta: 1,
          addedCitationCount: 1,
          removedCitationCount: 0,
          beforeFreshness: 'stale',
          afterFreshness: 'fresh',
          freshnessChange: 'improved',
          beforeConfidence: 'medium',
          afterConfidence: 'high',
          confidenceChange: 'improved',
          beforeTrustBoundary: 'inferred',
          afterTrustBoundary: 'source-backed',
          trustBoundaryChanged: true,
          addedEvidence: [
            {
              citationId: 'citation-skilled-worker-language',
              claimText: 'CLB 9 now clears the current benchmark.',
              sourceTitle: 'Express Entry Language Requirements',
              sourceUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html',
              excerpt: 'Current language evidence is sufficient.',
              retrievalDate: '2026-03-10T00:00:00.000Z',
              freshness: 'fresh',
            },
          ],
          removedEvidence: [],
        },
      },
      {
        pathwayId: 'mvp-study-to-work',
        pathwayName: 'Study-to-Work pathway',
        changeType: 'added',
        impact: 'improved',
        beforeType: null,
        afterType: 'composed',
        beforeRank: null,
        afterRank: 3,
        rankDelta: null,
        beforeTier: null,
        afterTier: 'lower-confidence',
        beforeScore: null,
        afterScore: 61,
        scoreDelta: null,
        reason: 'Study-to-Work pathway is newly ranked in the later run.',
        trustDiff: null,
      },
      {
        pathwayId: 'mvp-provincial-nominee',
        pathwayName: 'Provincial Nominee pathway',
        changeType: 'removed',
        impact: 'declined',
        beforeType: 'blocked',
        afterType: null,
        beforeRank: 1,
        afterRank: null,
        rankDelta: null,
        beforeTier: 'conditional-fit',
        afterTier: null,
        beforeScore: 68,
        afterScore: null,
        scoreDelta: null,
        reason: 'Provincial Nominee pathway no longer appears in the later run.',
        trustDiff: null,
      },
    ],
    trustChanges: [
      {
        pathwayId: 'mvp-skilled-worker',
        pathwayName: 'Skilled Worker pathway',
        beforeCitationCount: 1,
        afterCitationCount: 2,
        citationDelta: 1,
        addedCitationCount: 1,
        removedCitationCount: 0,
        beforeFreshness: 'stale',
        afterFreshness: 'fresh',
        freshnessChange: 'improved',
        beforeConfidence: 'medium',
        afterConfidence: 'high',
        confidenceChange: 'improved',
        beforeTrustBoundary: 'inferred',
        afterTrustBoundary: 'source-backed',
        trustBoundaryChanged: true,
        addedEvidence: [
          {
            citationId: 'citation-skilled-worker-language',
            claimText: 'CLB 9 now clears the current benchmark.',
            sourceTitle: 'Express Entry Language Requirements',
            sourceUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html',
            excerpt: 'Current language evidence is sufficient.',
            retrievalDate: '2026-03-10T00:00:00.000Z',
            freshness: 'fresh',
          },
        ],
        removedEvidence: [],
      },
    ],
    caveatChanges: {
      added: [
        {
          id: 'caveat-added-1',
          pathwayId: 'mvp-study-to-work',
          pathwayName: 'Study-to-Work pathway',
          text: 'Program intake windows should be rechecked before acting.',
        },
      ],
      removed: [
        {
          id: 'caveat-removed-1',
          pathwayId: 'mvp-skilled-worker',
          pathwayName: 'Skilled Worker pathway',
          text: 'Language score was nearing expiry.',
        },
      ],
    },
    profileDelta: {
      changedFieldCount: 2,
      changedFields: [
        {
          key: 'work.hasValidJobOffer',
          section: 'work',
          label: 'Valid job offer',
          beforeValue: 'No',
          afterValue: 'Yes',
        },
        {
          key: 'immigration.englishClb',
          section: 'immigration',
          label: 'English CLB',
          beforeValue: '8',
          afterValue: '9',
        },
      ],
      summary: '2 preserved profile inputs changed between the compared runs.',
    },
    comparisonAvailable: true,
    ...overrides,
  }
}
