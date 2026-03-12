import { describe, expect, it } from 'vitest'

import { groupRunComparisonPathways } from '../../app/lib/workspace/recommendation-run-comparison'

describe('groupRunComparisonPathways', () => {
  it('keeps declined changes out of the improved bucket', () => {
    const grouped = groupRunComparisonPathways([
      {
        pathwayId: 'improved-pathway',
        pathwayName: 'Improved pathway',
        changeType: 'score-changed',
        impact: 'improved',
        beforeType: 'blocked',
        afterType: 'direct',
        beforeRank: 2,
        afterRank: 1,
        rankDelta: -1,
        beforeTier: 'conditional-fit',
        afterTier: 'strong-fit',
        beforeScore: 71,
        afterScore: 90,
        scoreDelta: 19,
        reason: 'Score improved.',
        trustDiff: null,
      },
      {
        pathwayId: 'declined-pathway',
        pathwayName: 'Declined pathway',
        changeType: 'tier-changed',
        impact: 'declined',
        beforeType: 'direct',
        afterType: 'blocked',
        beforeRank: 1,
        afterRank: 3,
        rankDelta: 2,
        beforeTier: 'strong-fit',
        afterTier: 'conditional-fit',
        beforeScore: 88,
        afterScore: 63,
        scoreDelta: -25,
        reason: 'Score declined.',
        trustDiff: null,
      },
    ])

    expect(grouped.improved).toHaveLength(1)
    expect(grouped.improved[0]?.pathwayId).toBe('improved-pathway')
  })
})
