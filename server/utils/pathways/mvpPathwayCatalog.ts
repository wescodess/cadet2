export const MVP_PATHWAY_IDS = [
  'mvp-skilled-worker',
  'mvp-provincial-nominee',
  'mvp-study-to-work',
] as const

export type MvpPathwayId = (typeof MVP_PATHWAY_IDS)[number]

export type NormalizedPathwayProfile = {
  englishClb: number
  yearsSkilledExperience: number
  settlementFundsCad: number
  hasValidJobOffer: boolean
  openToRelocation: boolean
  willingToStudyOrRetrain: boolean
  budgetCad: number
  targetTimelineMonths: number
}

export type MvpPathwayRule = {
  unmetConditionId: string
  isSatisfied: (profile: NormalizedPathwayProfile) => boolean
}

export type MvpPathwayDefinition = {
  pathwayId: MvpPathwayId
  rules: readonly MvpPathwayRule[]
}

export const MVP_PATHWAY_CATALOG: readonly MvpPathwayDefinition[] = [
  {
    pathwayId: 'mvp-skilled-worker',
    rules: [
      {
        unmetConditionId: 'minimum-english-clb-8',
        isSatisfied: (profile) => profile.englishClb >= 8,
      },
      {
        unmetConditionId: 'minimum-skilled-experience-2-years',
        isSatisfied: (profile) => profile.yearsSkilledExperience >= 2,
      },
      {
        unmetConditionId: 'minimum-settlement-funds-15000-cad',
        isSatisfied: (profile) => profile.settlementFundsCad >= 15000,
      },
    ],
  },
  {
    pathwayId: 'mvp-provincial-nominee',
    rules: [
      {
        unmetConditionId: 'requires-valid-job-offer',
        isSatisfied: (profile) => profile.hasValidJobOffer,
      },
      {
        unmetConditionId: 'requires-relocation-flexibility',
        isSatisfied: (profile) => profile.openToRelocation,
      },
    ],
  },
  {
    pathwayId: 'mvp-study-to-work',
    rules: [
      {
        unmetConditionId: 'requires-study-or-retraining-intent',
        isSatisfied: (profile) => profile.willingToStudyOrRetrain,
      },
      {
        unmetConditionId: 'minimum-budget-25000-cad',
        isSatisfied: (profile) => profile.budgetCad >= 25000,
      },
      {
        unmetConditionId: 'minimum-timeline-10-months',
        isSatisfied: (profile) => profile.targetTimelineMonths >= 10,
      },
    ],
  },
]
