import {
  defaultSectionProgress,
  emptyGoalsFieldValues,
  emptyFieldValues,
  goalsFieldValuesSchema,
  type GoalsFieldValues,
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

function parseGoalsField<Key extends keyof GoalsFieldValues>(
  key: Key,
  input: Record<string, unknown>,
): GoalsFieldValues[Key] {
  const schema = goalsFieldValuesSchema.shape[key]
  const parsed = schema.safeParse(input[key])

  if (parsed.success && parsed.data !== undefined) {
    return parsed.data as GoalsFieldValues[Key]
  }

  return emptyGoalsFieldValues[key]
}

function normalizeGoalsFieldValues(input: unknown): GoalsFieldValues {
  const parsedGoals = goalsFieldValuesSchema.safeParse(input)

  if (parsedGoals.success) {
    return {
      ...emptyGoalsFieldValues,
      ...parsedGoals.data,
    }
  }

  const goalsInput = toRecord(input)

  return {
    primaryGoal: parseGoalsField('primaryGoal', goalsInput),
    targetTimelineMonths: parseGoalsField('targetTimelineMonths', goalsInput),
    budgetCad: parseGoalsField('budgetCad', goalsInput),
    priorityPreference: parseGoalsField('priorityPreference', goalsInput),
    locationPreference: parseGoalsField('locationPreference', goalsInput),
    willingToStudyOrRetrain: parseGoalsField('willingToStudyOrRetrain', goalsInput),
    hasFamilyInCanada: parseGoalsField('hasFamilyInCanada', goalsInput),
    additionalContext: parseGoalsField('additionalContext', goalsInput),
  }
}

function normalizeFieldValues(input: Record<string, unknown>): Record<IntakeSection, Record<string, unknown>> {
  const normalized: Record<IntakeSection, Record<string, unknown>> = {
    personal: {},
    education: {},
    work: {},
    immigration: {},
    goals: { ...emptyGoalsFieldValues },
  }

  for (const section of intakeSections) {
    if (section === 'goals') {
      normalized.goals = normalizeGoalsFieldValues(input[section])
      continue
    }

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

function normalizeSourceRunId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

export function normalizeIntakePayload(payload: IntakeDraftInput): IntakeDraftRecord {
  return {
    currentSection: payload.currentSection,
    sectionProgress: normalizeSectionProgress(payload.sectionProgress),
    fieldValues: normalizeFieldValues(payload.fieldValues),
    sourceRunId: normalizeSourceRunId(payload.sourceRunId),
  }
}

export function normalizeStoredIntakeDraft(input: {
  currentSection?: unknown
  sectionProgress?: unknown
  fieldValues?: unknown
  sourceRunId?: unknown
}): IntakeDraftRecord {
  const sectionProgress = toRecord(parseJsonIfString(input.sectionProgress))
  const fieldValues = toRecord(parseJsonIfString(input.fieldValues))

  return {
    currentSection: normalizeCurrentSection(input.currentSection),
    sectionProgress: normalizeSectionProgress(sectionProgress),
    fieldValues: normalizeFieldValues(fieldValues),
    sourceRunId: normalizeSourceRunId(input.sourceRunId),
  }
}

export function createEmptyIntakeDraft(): IntakeDraftRecord {
  return {
    currentSection: 'personal',
    sectionProgress: { ...defaultSectionProgress },
    fieldValues: { ...emptyFieldValues },
    sourceRunId: null,
  }
}
