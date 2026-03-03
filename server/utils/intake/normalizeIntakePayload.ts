import {
  defaultSectionProgress,
  emptyFieldValues,
  intakeSectionSchema,
  intakeSections,
  type IntakeDraftInput,
  type IntakeDraftRecord,
  type IntakeSection,
} from './intakeSchemas'

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value) as unknown
  }
  catch {
    return {}
  }
}

function normalizeSectionProgress(input: Record<string, unknown>): Record<IntakeSection, boolean> {
  const normalized = { ...defaultSectionProgress }

  for (const section of intakeSections) {
    if (typeof input[section] === 'boolean') {
      normalized[section] = input[section] as boolean
    }
  }

  return normalized
}

function normalizeFieldValues(input: Record<string, unknown>): Record<IntakeSection, Record<string, unknown>> {
  const normalized: Record<IntakeSection, Record<string, unknown>> = {
    personal: {},
    education: {},
    work: {},
    immigration: {},
    goals: {},
  }

  for (const section of intakeSections) {
    normalized[section] = toRecord(input[section])
  }

  return normalized
}

function normalizeCurrentSection(value: unknown): IntakeSection {
  const parsed = intakeSectionSchema.safeParse(value)

  if (parsed.success) {
    return parsed.data
  }

  return 'personal'
}

export function normalizeIntakePayload(payload: IntakeDraftInput): IntakeDraftRecord {
  return {
    currentSection: payload.currentSection,
    sectionProgress: normalizeSectionProgress(payload.sectionProgress),
    fieldValues: normalizeFieldValues(payload.fieldValues),
  }
}

export function normalizeStoredIntakeDraft(input: {
  currentSection?: unknown
  sectionProgress?: unknown
  fieldValues?: unknown
}): IntakeDraftRecord {
  const sectionProgress = toRecord(parseJsonIfString(input.sectionProgress))
  const fieldValues = toRecord(parseJsonIfString(input.fieldValues))

  return {
    currentSection: normalizeCurrentSection(input.currentSection),
    sectionProgress: normalizeSectionProgress(sectionProgress),
    fieldValues: normalizeFieldValues(fieldValues),
  }
}

export function createEmptyIntakeDraft(): IntakeDraftRecord {
  return {
    currentSection: 'personal',
    sectionProgress: { ...defaultSectionProgress },
    fieldValues: { ...emptyFieldValues },
  }
}
