import { faker } from '@faker-js/faker'

export type IntakeSection = 'personal' | 'education' | 'work' | 'immigration' | 'goals'

export type IntakeDraftPayload = {
  currentSection: IntakeSection
  sectionProgress: Record<IntakeSection, boolean>
  fieldValues: Record<string, Record<string, unknown>>
  sourceRunId?: string | null
}

export type GoalsConstraintsValues = {
  primaryGoal: string
  targetTimelineMonths: number
  budgetCad: number
  priorityPreference: string
  locationPreference: string
  willingToStudyOrRetrain: 'yes' | 'no'
  hasFamilyInCanada: 'yes' | 'no'
  additionalContext: string
}

type IntakeRouteProbe = {
  intakePath: string
  draftApiPath: string
  authPath: string
}

type ResumeDraftFixture = {
  savedAt: string
  draft: IntakeDraftPayload
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

export function createIntakeRouteProbe(baseUrl: string): IntakeRouteProbe {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return {
    intakePath: `${normalizedBaseUrl}/workspace/intake`,
    draftApiPath: `${normalizedBaseUrl}/api/intake/draft`,
    authPath: `${normalizedBaseUrl}/auth`,
  }
}

export function createIntakeDraftPayload(overrides: Partial<IntakeDraftPayload> = {}): IntakeDraftPayload {
  const defaultPayload: IntakeDraftPayload = {
    currentSection: 'education',
    sectionProgress: {
      personal: true,
      education: false,
      work: false,
      immigration: false,
      goals: false,
    },
    fieldValues: {
      personal: {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        countryOfCitizenship: 'Nigeria',
      },
      education: {
        highestLevel: 'Bachelors',
      },
    },
  }

  return {
    ...defaultPayload,
    ...overrides,
    sectionProgress: {
      ...defaultPayload.sectionProgress,
      ...(overrides.sectionProgress || {}),
    },
    fieldValues: {
      ...defaultPayload.fieldValues,
      ...(overrides.fieldValues || {}),
    },
  }
}

export function createResumeDraftFixture(overrides: Partial<IntakeDraftPayload> = {}): ResumeDraftFixture {
  const draft = createIntakeDraftPayload(overrides)

  return {
    savedAt: new Date().toISOString(),
    draft,
  }
}

export function createGoalsConstraintsValues(overrides: Partial<GoalsConstraintsValues> = {}): GoalsConstraintsValues {
  return {
    primaryGoal: 'permanent-residency',
    targetTimelineMonths: 12,
    budgetCad: 18000,
    priorityPreference: 'lowest-cost',
    locationPreference: 'targeted-provinces',
    willingToStudyOrRetrain: 'yes',
    hasFamilyInCanada: 'no',
    additionalContext: 'I can relocate outside Ontario if processing is faster.',
    ...overrides,
  }
}

export function createGoalsDraftPayload(overrides: Partial<IntakeDraftPayload> = {}): IntakeDraftPayload {
  const goalsValues = createGoalsConstraintsValues()

  return createIntakeDraftPayload({
    currentSection: 'goals',
    sectionProgress: {
      personal: true,
      education: true,
      work: true,
      immigration: true,
      goals: false,
      ...(overrides.sectionProgress || {}),
    },
    fieldValues: {
      ...createIntakeDraftPayload().fieldValues,
      goals: goalsValues,
      ...(overrides.fieldValues || {}),
    },
    ...overrides,
  })
}

export function createGoalsUpdateFixture() {
  return {
    initial: createGoalsConstraintsValues({
      targetTimelineMonths: 10,
      budgetCad: 14000,
      priorityPreference: 'highest-odds',
      locationPreference: 'major-city-focus',
      additionalContext: 'My status expires in 6 months and I prefer low up-front costs.',
    }),
    updated: createGoalsConstraintsValues({
      targetTimelineMonths: 6,
      budgetCad: 22000,
      priorityPreference: 'fastest-timeline',
      locationPreference: 'any-province',
      additionalContext: 'I can study in Manitoba if it shortens processing time.',
    }),
  }
}
