import { faker } from '@faker-js/faker'

import { createIntakeDraftPayload, type IntakeDraftPayload } from './intake-draft-factory'

export type RecommendationRunStatus = 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'

export type RecommendationRunRecord = {
  runId: string
  userId: string
  profileSnapshotId: string
  status: RecommendationRunStatus
  createdAt: string
  updatedAt: string
}

type IntakeSubmitRouteProbe = {
  intakePath: string
  workspacePath: string
  draftApiPath: string
  submitApiPath: string
  recommendationRunsApiPath: string
  authPath: string
}

function mergeFieldValues(
  base: IntakeDraftPayload['fieldValues'],
  overrides: Partial<IntakeDraftPayload['fieldValues']> = {},
): IntakeDraftPayload['fieldValues'] {
  return {
    personal: {
      ...(base.personal || {}),
      ...(overrides.personal || {}),
    },
    education: {
      ...(base.education || {}),
      ...(overrides.education || {}),
    },
    work: {
      ...(base.work || {}),
      ...(overrides.work || {}),
    },
    immigration: {
      ...(base.immigration || {}),
      ...(overrides.immigration || {}),
    },
    goals: {
      ...(base.goals || {}),
      ...(overrides.goals || {}),
    },
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

export function createIntakeSubmitRouteProbe(baseUrl: string): IntakeSubmitRouteProbe {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return {
    intakePath: `${normalizedBaseUrl}/workspace/intake`,
    workspacePath: `${normalizedBaseUrl}/workspace`,
    draftApiPath: `${normalizedBaseUrl}/api/intake/draft`,
    submitApiPath: `${normalizedBaseUrl}/api/intake/submit`,
    recommendationRunsApiPath: `${normalizedBaseUrl}/api/workspace/recommendation-runs`,
    authPath: `${normalizedBaseUrl}/auth`,
  }
}

export function createCompletedIntakeDraftPayload(overrides: Partial<IntakeDraftPayload> = {}): IntakeDraftPayload {
  const {
    fieldValues: overrideFieldValues,
    sectionProgress: overrideSectionProgress,
    ...restOverrides
  } = overrides
  const baseFieldValues: IntakeDraftPayload['fieldValues'] = {
    personal: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      dateOfBirth: '1994-06-12',
      countryOfCitizenship: 'Nigeria',
      maritalStatus: 'single',
      dependantsCount: 0,
    },
    education: {
      highestLevel: 'bachelors',
      fieldOfStudy: 'Computer Science',
      countryOfEducation: 'Nigeria',
      hasCanadianEducation: 'no',
      credentialEcaStatus: 'completed',
    },
    work: {
      currentRole: 'Product Manager',
      nocTeerCategory: '1',
      yearsSkilledExperience: 5,
      canadianWorkExperienceYears: 0,
      hasValidJobOffer: 'no',
      jobOfferProvince: '',
      selfEmployedExperience: 'no',
    },
    immigration: {
      currentCountry: 'Nigeria',
      currentStatusInCanada: 'outside-canada',
      statusExpiryDate: '',
      intendedProvince: 'Ontario',
      openToRelocation: 'yes',
      englishClb: 9,
      frenchClb: 0,
      availableSettlementFundsCad: 25000,
      previousRefusal: 'no',
      urgencyDeadline: '',
    },
    goals: {
      primaryGoal: 'permanent-residency',
      targetTimelineMonths: 12,
      budgetCad: 20000,
      priorityPreference: 'highest-odds',
      locationPreference: 'targeted-provinces',
      willingToStudyOrRetrain: 'yes',
      hasFamilyInCanada: 'no',
      additionalContext: 'I can relocate and start studies if it improves success odds.',
    },
  }

  return createIntakeDraftPayload({
    currentSection: 'goals',
    sectionProgress: {
      personal: true,
      education: true,
      work: true,
      immigration: true,
      goals: true,
      ...(overrideSectionProgress || {}),
    },
    fieldValues: mergeFieldValues(baseFieldValues, overrideFieldValues),
    ...restOverrides,
  })
}

export function createIncompleteIntakeDraftPayload(overrides: Partial<IntakeDraftPayload> = {}): IntakeDraftPayload {
  const {
    fieldValues: overrideFieldValues,
    sectionProgress: overrideSectionProgress,
    ...restOverrides
  } = overrides
  const baseFieldValues: IntakeDraftPayload['fieldValues'] = {
    personal: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      dateOfBirth: '',
      countryOfCitizenship: '',
      maritalStatus: '',
      dependantsCount: '',
    },
    education: {
      highestLevel: '',
      fieldOfStudy: '',
      countryOfEducation: '',
      hasCanadianEducation: '',
      credentialEcaStatus: '',
    },
    work: {},
    immigration: {},
    goals: {},
  }

  return createIntakeDraftPayload({
    currentSection: 'education',
    sectionProgress: {
      personal: true,
      education: false,
      work: false,
      immigration: false,
      goals: false,
      ...(overrideSectionProgress || {}),
    },
    fieldValues: mergeFieldValues(baseFieldValues, overrideFieldValues),
    ...restOverrides,
  })
}

export function createRecommendationRunRecord(overrides: Partial<RecommendationRunRecord> = {}): RecommendationRunRecord {
  const createdAt = overrides.createdAt || faker.date.recent({ days: 2 }).toISOString()
  const updatedAt = overrides.updatedAt || createdAt

  return {
    runId: overrides.runId || `run_${faker.string.alphanumeric(12)}`,
    userId: overrides.userId || `user_${faker.string.alphanumeric(10)}`,
    profileSnapshotId: overrides.profileSnapshotId || `snapshot_${faker.string.alphanumeric(12)}`,
    status: overrides.status || 'queued',
    createdAt,
    updatedAt,
  }
}

export function createRecommendationRunListFixture() {
  const newest = createRecommendationRunRecord({
    createdAt: new Date('2026-03-04T13:15:00.000Z').toISOString(),
    updatedAt: new Date('2026-03-04T13:15:00.000Z').toISOString(),
    status: 'queued',
  })
  const older = createRecommendationRunRecord({
    createdAt: new Date('2026-03-01T09:45:00.000Z').toISOString(),
    updatedAt: new Date('2026-03-01T09:45:00.000Z').toISOString(),
    status: 'evaluating',
  })

  return [newest, older]
}
