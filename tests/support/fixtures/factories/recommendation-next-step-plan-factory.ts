import { faker } from '@faker-js/faker'

import {
  createRecommendationComparisonPathwayType,
  type RecommendationComparisonPathwayType,
} from './recommendation-comparison-factory'

export type RecommendationNextStepPlanStep = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  sequence: number
}

export type RecommendationNextStepPlan = {
  summary: string
  steps: RecommendationNextStepPlanStep[]
  limitation: string
}

export type RecommendationNextStepPlanResultsResponse = {
  runId: string
  profileSnapshotId: string
  status: 'completed' | 'degraded' | 'failed'
  results: {
    direct: RecommendationCandidateWithNextStepPlan[]
    blocked: RecommendationCandidateWithNextStepPlan[]
    composed: RecommendationCandidateWithNextStepPlan[]
  }
  comparison: unknown
  noComposedReason?: string
}

type RecommendationCitation = {
  citationId: string
  claimText: string
  sourceTitle: string
  sourceUrl: string
  sourceType: 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
  excerpt: string
  retrievalDate: string
  freshness: 'fresh' | 'stale' | 'unknown'
}

export type RecommendationCandidateWithNextStepPlan = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  rationale: string
  fitSignals: Array<{
    id: string
    label: string
    detail: string
    state: 'strength' | 'watch' | 'gap'
  }>
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
  blockers: Array<{
    id: string
    label: string
    detail: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }>
  tradeoffs: Array<{
    id: string
    dimension: 'effort' | 'timing' | 'complexity' | 'cost'
    summary: string
    impact: 'high' | 'medium' | 'low'
  }>
  improvementActions: Array<{
    id: string
    title: string
    detail: string
    priority: 'now' | 'next' | 'later'
    expectedImpact: string
  }>
  composedSteps?: string[]
  pathwayType: RecommendationComparisonPathwayType
  citations: RecommendationCitation[]
  trustBoundary: 'source-backed' | 'inferred' | 'system-generated'
  nextStepPlan: RecommendationNextStepPlan
}

export function createRecommendationNextStepPlanIds(prefix: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  return {
    runId: `${prefix}-run-${seed}`,
    profileSnapshotId: `${prefix}-snapshot-${seed}`,
  }
}

export function createRecommendationNextStepPlanStep(
  sequence: number,
  overrides: Partial<RecommendationNextStepPlanStep> = {},
): RecommendationNextStepPlanStep {
  const priority = sequence === 1 ? 'now' : sequence === 2 ? 'next' : 'later'

  return {
    id: faker.string.uuid(),
    title: `${sequence === 1 ? 'Gather' : sequence === 2 ? 'Prepare' : 'Review'} ${faker.word.adjective()} ${faker.word.noun()}`,
    detail: faker.lorem.sentence(),
    priority,
    sequence,
    ...overrides,
  }
}

export function createRecommendationNextStepPlan(
  overrides: Partial<RecommendationNextStepPlan> = {},
): RecommendationNextStepPlan {
  const steps = overrides.steps ?? [
    createRecommendationNextStepPlanStep(1, {
      title: 'Gather the core eligibility evidence',
      detail: 'Pull together the language, work, and settlement-fund documents already referenced in this recommendation.',
      priority: 'now',
    }),
    createRecommendationNextStepPlanStep(2, {
      title: 'Prepare the pathway-specific profile updates',
      detail: 'Update the recommendation inputs with the strongest evidence so the next submission step matches this pathway.',
      priority: 'next',
    }),
    createRecommendationNextStepPlanStep(3, {
      title: 'Review the remaining caveats before submission',
      detail: 'Check the blocker, tradeoff, and trust notes one more time so the action plan stays aligned with the recommendation strength.',
      priority: 'later',
    }),
  ]

  return {
    summary: 'Move this recommendation from comparison to action with a short, concrete plan.',
    steps,
    limitation: '',
    ...overrides,
  }
}

function createRecommendationCitation(
  overrides: Partial<RecommendationCitation> = {},
): RecommendationCitation {
  return {
    citationId: faker.string.uuid(),
    claimText: 'Language readiness keeps this pathway actionable in the current MVP rules.',
    sourceTitle: 'Express Entry Language Requirements',
    sourceUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html',
    sourceType: 'regulation',
    excerpt: 'Language results at or above the current benchmark support near-term pathway action.',
    retrievalDate: '2026-03-01T00:00:00Z',
    freshness: 'fresh',
    ...overrides,
  }
}

export function createRecommendationNextStepPlanEvaluationPayload() {
  return {
    currentSection: 'goals',
    sectionProgress: {
      personal: true,
      education: true,
      work: true,
      immigration: true,
      goals: true,
    },
    fieldValues: {
      personal: {},
      education: {
        highestEducationLevel: 'bachelors',
      },
      work: {
        yearsSkilledExperience: 3,
        hasValidJobOffer: 'no',
      },
      immigration: {
        openToRelocation: 'yes',
        englishClb: 9,
        availableSettlementFundsCad: 30000,
      },
      goals: {
        targetTimelineMonths: 6,
        budgetCad: 12000,
        willingToStudyOrRetrain: 'yes',
      },
    },
  }
}

export function createCandidateWithNextStepPlan(
  overrides: Partial<RecommendationCandidateWithNextStepPlan> = {},
): RecommendationCandidateWithNextStepPlan {
  const candidate: RecommendationCandidateWithNextStepPlan = {
    pathwayId: 'mvp-skilled-worker',
    type: 'direct',
    rank: 1,
    tier: 'strong-fit',
    score: 88,
    rationale: 'Skilled Worker is ready sooner and still benefits from a small evidence refresh.',
    fitSignals: [
      {
        id: 'language-readiness',
        label: 'Language readiness',
        detail: 'CLB 9 already clears the current benchmark.',
        state: 'strength',
      },
    ],
    qualification: 'supported',
    confidence: 'high',
    freshness: 'fresh',
    caveat: 'Recheck evidence freshness before final submission.',
    blockers: [],
    tradeoffs: [
      {
        id: 'tradeoff-effort',
        dimension: 'effort',
        summary: 'Requires moderate document assembly and timeline discipline.',
        impact: 'medium',
      },
    ],
    improvementActions: [
      {
        id: 'action-evidence-refresh',
        title: 'Refresh profile evidence',
        detail: 'Update the profile with the latest language and settlement-fund proof.',
        priority: 'now',
        expectedImpact: 'Keeps the strongest pathway ready for near-term action.',
      },
    ],
    composedSteps: [],
    pathwayType: createRecommendationComparisonPathwayType('direct'),
    citations: [createRecommendationCitation()],
    trustBoundary: 'source-backed',
    nextStepPlan: createRecommendationNextStepPlan({
      summary: 'Take the direct route forward by packaging the strongest evidence first.',
      steps: [
        createRecommendationNextStepPlanStep(1, {
          title: 'Gather language and funds evidence',
          detail: 'Collect the current CLB result and settlement-fund proof before touching the application draft.',
          priority: 'now',
        }),
        createRecommendationNextStepPlanStep(2, {
          title: 'Update the profile before submission prep',
          detail: 'Refresh the workspace inputs so the submission checklist reflects the current evidence state.',
          priority: 'next',
        }),
      ],
      limitation: '',
    }),
    ...overrides,
  }

  return {
    ...candidate,
    pathwayType: overrides.pathwayType || createRecommendationComparisonPathwayType(candidate.type),
  }
}

export function createBlockedCandidateWithNextStepPlan(
  overrides: Partial<RecommendationCandidateWithNextStepPlan> = {},
): RecommendationCandidateWithNextStepPlan {
  return createCandidateWithNextStepPlan({
    pathwayId: 'mvp-provincial-nominee',
    type: 'blocked',
    rank: 2,
    tier: 'conditional-fit',
    score: 63,
    qualification: 'low-confidence',
    confidence: 'medium',
    rationale: 'A provincial nominee route remains viable, but a valid job offer still blocks near-term action.',
    caveat: 'This route should stay in planning mode until the job-offer blocker is resolved.',
    blockers: [
      {
        id: 'job-offer',
        label: 'Valid job offer required',
        detail: 'A qualifying job offer is still missing for the strongest nominee route.',
        severity: 'critical',
      },
    ],
    improvementActions: [
      {
        id: 'action-job-offer',
        title: 'Secure an eligible job offer',
        detail: 'Prioritize employer outreach before investing effort in submission paperwork.',
        priority: 'now',
        expectedImpact: 'Closes the blocker that currently keeps the route from being actionable.',
      },
    ],
    pathwayType: createRecommendationComparisonPathwayType('blocked'),
    trustBoundary: 'inferred',
    nextStepPlan: createRecommendationNextStepPlan({
      summary: 'Close the blocker first so this pathway can move from planning into execution.',
      steps: [
        createRecommendationNextStepPlanStep(1, {
          title: 'Confirm the job-offer gap',
          detail: 'Check the current nominee requirements and confirm the exact employer evidence still missing.',
          priority: 'now',
        }),
        createRecommendationNextStepPlanStep(2, {
          title: 'Request employer documentation',
          detail: 'Reach out to target employers and collect offer details that satisfy the route rules.',
          priority: 'next',
        }),
      ],
      limitation: 'Do not treat this pathway as ready for submission until an eligible job offer is secured.',
    }),
    ...overrides,
  })
}

export function createComposedCandidateWithNextStepPlan(
  overrides: Partial<RecommendationCandidateWithNextStepPlan> = {},
): RecommendationCandidateWithNextStepPlan {
  return createCandidateWithNextStepPlan({
    pathwayId: 'mvp-study-to-work',
    type: 'composed',
    rank: 3,
    tier: 'conditional-fit',
    score: 57,
    qualification: 'supported',
    confidence: 'medium',
    rationale: 'The study-to-work route remains viable, but it requires staged milestones instead of immediate filing.',
    composedSteps: [
      'Secure a study-aligned program plan',
      'Complete the study period',
      'Transition into the work stage before re-running eligibility',
    ],
    pathwayType: createRecommendationComparisonPathwayType('composed'),
    trustBoundary: 'source-backed',
    nextStepPlan: createRecommendationNextStepPlan({
      summary: 'Sequence this longer-horizon pathway as staged milestones instead of a single immediate application push.',
      steps: [
        createRecommendationNextStepPlanStep(1, {
          title: 'Compare the study-stage options',
          detail: 'Review the strongest training route first so the long-horizon pathway starts with a realistic entry point.',
          priority: 'now',
        }),
        createRecommendationNextStepPlanStep(2, {
          title: 'Prepare the milestone handoff',
          detail: 'Map what has to be true before moving from study into the work-stage milestone.',
          priority: 'next',
        }),
        createRecommendationNextStepPlanStep(3, {
          title: 'Review the long-horizon tradeoffs',
          detail: 'Confirm that the extra time, budget, and sequencing still fit the user goals before committing.',
          priority: 'later',
        }),
      ],
      limitation: 'Treat this plan as a staged route, not an immediate submission recommendation.',
    }),
    ...overrides,
  })
}
