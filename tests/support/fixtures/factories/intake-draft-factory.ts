import { faker } from '@faker-js/faker'

export type IntakeSection = 'personal' | 'education' | 'work' | 'immigration' | 'goals'

export type IntakeDraftPayload = {
  currentSection: IntakeSection
  sectionProgress: Record<IntakeSection, boolean>
  fieldValues: Record<string, Record<string, unknown>>
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
