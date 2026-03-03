<script setup lang="ts">
import { AlertTriangle, CheckCircle2, LoaderCircle } from 'lucide-vue-next'
import { z } from 'zod'

import IntakeProgress from '~/components/intake/IntakeProgress.vue'
import IntakeSectionFields from '~/components/intake/IntakeSectionFields.vue'

definePageMeta({
  middleware: ['auth'],
})

type IntakeSection = 'personal' | 'education' | 'work' | 'immigration' | 'goals'

type IntakeFieldOption = {
  label: string
  value: string
}

type IntakeField = {
  key: string
  label: string
  placeholder: string
  helper: string
  type?: 'text' | 'email' | 'date' | 'number' | 'tel' | 'textarea' | 'select'
  required?: boolean
  testIdError?: string
  width?: 'full' | 'half'
  options?: IntakeFieldOption[]
}

type IntakeSectionDefinition = {
  id: IntakeSection
  label: string
  heading: string
  description: string
  fields: IntakeField[]
}

type SectionProgress = Record<IntakeSection, boolean>
type SectionFieldValues = Record<IntakeSection, Record<string, string | number>>

type IntakeDraftResponse = {
  status: string
  savedAt: string | null
  currentSection: IntakeSection
  values: Record<string, Record<string, unknown>>
}

type IntakeDraftPayload = {
  currentSection: IntakeSection
  sectionProgress: SectionProgress
  fieldValues: SectionFieldValues
}

type SaveFeedback = {
  tone: 'info' | 'success' | 'error'
  message: string
}

const yesNoOptions: IntakeFieldOption[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
]

const maritalStatusOptions: IntakeFieldOption[] = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Common-law', value: 'common-law' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
]

const educationLevelOptions: IntakeFieldOption[] = [
  { label: 'High school', value: 'high-school' },
  { label: 'Diploma or certificate', value: 'diploma' },
  { label: 'Bachelors degree', value: 'bachelors' },
  { label: 'Masters degree', value: 'masters' },
  { label: 'Doctorate (PhD)', value: 'phd' },
]

const ecaStatusOptions: IntakeFieldOption[] = [
  { label: 'Completed', value: 'completed' },
  { label: 'In progress', value: 'in-progress' },
  { label: 'Not started', value: 'not-started' },
  { label: 'Not required', value: 'not-required' },
]

const nocTeerOptions: IntakeFieldOption[] = [
  { label: 'TEER 0', value: '0' },
  { label: 'TEER 1', value: '1' },
  { label: 'TEER 2', value: '2' },
  { label: 'TEER 3', value: '3' },
  { label: 'TEER 4', value: '4' },
  { label: 'TEER 5', value: '5' },
]

const statusInCanadaOptions: IntakeFieldOption[] = [
  { label: 'Outside Canada', value: 'outside-canada' },
  { label: 'Visitor status', value: 'visitor' },
  { label: 'Study permit', value: 'study-permit' },
  { label: 'Work permit', value: 'work-permit' },
  { label: 'Post-graduation work permit', value: 'pgwp' },
  { label: 'Permanent resident', value: 'permanent-resident' },
  { label: 'Other', value: 'other' },
]

const primaryGoalOptions: IntakeFieldOption[] = [
  { label: 'Permanent residency', value: 'permanent-residency' },
  { label: 'Work permit strategy', value: 'work-permit' },
  { label: 'Study then transition', value: 'study-to-pr' },
  { label: 'Family sponsorship path', value: 'family-sponsorship' },
  { label: 'Business or entrepreneur route', value: 'business' },
]

const priorityPreferenceOptions: IntakeFieldOption[] = [
  { label: 'Fastest timeline', value: 'fastest-timeline' },
  { label: 'Highest approval odds', value: 'highest-odds' },
  { label: 'Lowest overall cost', value: 'lowest-cost' },
  { label: 'Long-term flexibility', value: 'long-term-flexibility' },
]

const sections: IntakeSectionDefinition[] = [
  {
    id: 'personal',
    label: 'Personal',
    heading: 'Personal profile',
    description: 'Capture identity and household context to ground pathway scoring and family-linked options.',
    fields: [
      {
        key: 'firstName',
        label: 'First name',
        placeholder: 'Ada',
        helper: 'We use this to personalize your plan and document checklists.',
        required: true,
        testIdError: 'intake-error-first-name',
        width: 'half',
      },
      {
        key: 'lastName',
        label: 'Last name',
        placeholder: 'Okafor',
        helper: 'This helps keep your saved profile aligned with your formal records.',
        required: true,
        width: 'half',
      },
      {
        key: 'email',
        label: 'Email address',
        type: 'email',
        placeholder: 'ada@example.com',
        helper: 'We use this to send secure updates when your pathway insights are ready.',
        required: true,
        width: 'full',
      },
      {
        key: 'dateOfBirth',
        label: 'Date of birth',
        type: 'date',
        placeholder: 'YYYY-MM-DD',
        helper: 'Age affects many pathway cutoffs and ranking assumptions.',
        required: true,
        width: 'half',
      },
      {
        key: 'countryOfCitizenship',
        label: 'Country of citizenship',
        placeholder: 'India',
        helper: 'Citizenship can change eligibility requirements and document routes.',
        required: true,
        width: 'half',
      },
      {
        key: 'maritalStatus',
        label: 'Marital status',
        type: 'select',
        placeholder: 'Select marital status',
        helper: 'Family status affects points, dependants, and certain pathway options.',
        required: true,
        width: 'half',
        options: maritalStatusOptions,
      },
      {
        key: 'dependantsCount',
        label: 'Number of dependants',
        type: 'number',
        placeholder: '0',
        helper: 'Dependants can influence settlement funds, processing, and pathway fit.',
        required: true,
        width: 'half',
      },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    heading: 'Education history',
    description: 'Education signals credential strength and whether additional assessment steps are needed.',
    fields: [
      {
        key: 'highestLevel',
        label: 'Highest completed level',
        type: 'select',
        placeholder: 'Select highest completed level',
        helper: 'This helps estimate credential impact in recommendation scoring.',
        required: true,
        width: 'full',
        options: educationLevelOptions,
      },
      {
        key: 'fieldOfStudy',
        label: 'Field of study',
        placeholder: 'Computer Science',
        helper: 'Study domain can affect pathway competitiveness and occupational fit.',
        required: true,
        width: 'half',
      },
      {
        key: 'countryOfEducation',
        label: 'Country of highest education',
        placeholder: 'Canada',
        helper: 'Where credentials were earned affects recognition and equivalency assumptions.',
        required: true,
        width: 'half',
      },
      {
        key: 'hasCanadianEducation',
        label: 'Do you have Canadian education?',
        type: 'select',
        placeholder: 'Select an option',
        helper: 'Canadian study experience can materially increase eligibility in several streams.',
        required: true,
        width: 'half',
        options: yesNoOptions,
      },
      {
        key: 'credentialEcaStatus',
        label: 'Credential assessment (ECA) status',
        type: 'select',
        placeholder: 'Select assessment status',
        helper: 'ECA readiness changes what pathways are immediately viable.',
        required: true,
        width: 'half',
        options: ecaStatusOptions,
      },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    heading: 'Work experience',
    description: 'Employment profile defines skilled eligibility, urgency routes, and near-term options.',
    fields: [
      {
        key: 'currentRole',
        label: 'Current role or title',
        placeholder: 'Software Engineer',
        helper: 'Your role helps identify comparable pathways and likely evidence needs.',
        required: true,
        width: 'full',
      },
      {
        key: 'nocTeerCategory',
        label: 'NOC TEER category',
        type: 'select',
        placeholder: 'Select TEER category',
        helper: 'TEER level is a primary filter in many Canadian immigration streams.',
        required: true,
        width: 'half',
        options: nocTeerOptions,
      },
      {
        key: 'yearsSkilledExperience',
        label: 'Years of skilled work experience',
        type: 'number',
        placeholder: '3',
        helper: 'Skilled experience length directly affects ranking and pathway viability.',
        required: true,
        width: 'half',
      },
      {
        key: 'canadianWorkExperienceYears',
        label: 'Years of Canadian work experience',
        type: 'number',
        placeholder: '0',
        helper: 'Canadian work history can significantly improve points and pathway access.',
        required: true,
        width: 'half',
      },
      {
        key: 'hasValidJobOffer',
        label: 'Do you have a valid job offer in Canada?',
        type: 'select',
        placeholder: 'Select an option',
        helper: 'A valid job offer may unlock direct or faster routes.',
        required: true,
        width: 'half',
        options: yesNoOptions,
      },
      {
        key: 'jobOfferProvince',
        label: 'Job offer province (if applicable)',
        placeholder: 'Ontario',
        helper: 'Province matters when evaluating provincial nominee options.',
        width: 'half',
      },
      {
        key: 'selfEmployedExperience',
        label: 'Do you have self-employed experience?',
        type: 'select',
        placeholder: 'Select an option',
        helper: 'Self-employment history may affect evidence requirements and stream fit.',
        required: true,
        width: 'half',
        options: yesNoOptions,
      },
    ],
  },
  {
    id: 'immigration',
    label: 'Immigration',
    heading: 'Immigration context',
    description: 'Immigration status, language profile, and constraints determine immediate pathway realism.',
    fields: [
      {
        key: 'currentCountry',
        label: 'Current country of residence',
        placeholder: 'Nigeria',
        helper: 'Country context affects available pathways and processing assumptions.',
        required: true,
        width: 'full',
      },
      {
        key: 'currentStatusInCanada',
        label: 'Current status in Canada',
        type: 'select',
        placeholder: 'Select your status',
        helper: 'Current status strongly influences urgent options and legal timelines.',
        required: true,
        width: 'half',
        options: statusInCanadaOptions,
      },
      {
        key: 'statusExpiryDate',
        label: 'Status expiry date (if applicable)',
        type: 'date',
        placeholder: 'YYYY-MM-DD',
        helper: 'Expiry deadlines help prioritize pathways that need immediate action.',
        width: 'half',
      },
      {
        key: 'intendedProvince',
        label: 'Intended province or territory',
        placeholder: 'Ontario',
        helper: 'Province preference affects program availability and recommendation ordering.',
        required: true,
        width: 'half',
      },
      {
        key: 'openToRelocation',
        label: 'Open to relocation across provinces?',
        type: 'select',
        placeholder: 'Select an option',
        helper: 'Relocation flexibility increases the set of plausible pathways.',
        required: true,
        width: 'half',
        options: yesNoOptions,
      },
      {
        key: 'englishClb',
        label: 'English CLB score',
        type: 'number',
        placeholder: '7',
        helper: 'Language level is a major scoring driver for economic pathways.',
        required: true,
        width: 'half',
      },
      {
        key: 'frenchClb',
        label: 'French CLB score (optional)',
        type: 'number',
        placeholder: '0',
        helper: 'French proficiency can improve competitiveness in many streams.',
        width: 'half',
      },
      {
        key: 'availableSettlementFundsCad',
        label: 'Available settlement funds (CAD)',
        type: 'number',
        placeholder: '15000',
        helper: 'Funds influence eligibility and readiness for specific pathways.',
        required: true,
        width: 'full',
      },
      {
        key: 'previousRefusal',
        label: 'Any previous visa or immigration refusal?',
        type: 'select',
        placeholder: 'Select an option',
        helper: 'Past refusals can change risk profile and document strategy.',
        required: true,
        width: 'half',
        options: yesNoOptions,
      },
      {
        key: 'urgencyDeadline',
        label: 'Urgent deadline (if any)',
        type: 'date',
        placeholder: 'YYYY-MM-DD',
        helper: 'Use this when a permit, status, or personal timeline is time-sensitive.',
        width: 'half',
      },
    ],
  },
  {
    id: 'goals',
    label: 'Goals',
    heading: 'Planning goals',
    description: 'Your priorities, timing, and constraints determine which pathways should be ranked first.',
    fields: [
      {
        key: 'primaryGoal',
        label: 'Primary immigration goal',
        type: 'select',
        placeholder: 'Select your primary goal',
        helper: 'Clear goals improve recommendation quality and timeline guidance.',
        required: true,
        width: 'full',
        options: primaryGoalOptions,
      },
      {
        key: 'targetTimelineMonths',
        label: 'Target timeline (months)',
        type: 'number',
        placeholder: '12',
        helper: 'Timeline pressure changes tradeoffs between stronger and faster routes.',
        required: true,
        width: 'half',
      },
      {
        key: 'budgetCad',
        label: 'Estimated process budget (CAD)',
        type: 'number',
        placeholder: '10000',
        helper: 'Budget constraints affect which options are realistically executable.',
        required: true,
        width: 'half',
      },
      {
        key: 'priorityPreference',
        label: 'Top decision priority',
        type: 'select',
        placeholder: 'Select top priority',
        helper: 'This helps rank pathways by what matters most to you.',
        required: true,
        width: 'full',
        options: priorityPreferenceOptions,
      },
      {
        key: 'willingToStudyOrRetrain',
        label: 'Willing to study or retrain if needed?',
        type: 'select',
        placeholder: 'Select an option',
        helper: 'Training flexibility can unlock stronger long-term pathways.',
        required: true,
        width: 'half',
        options: yesNoOptions,
      },
      {
        key: 'hasFamilyInCanada',
        label: 'Do you have close family in Canada?',
        type: 'select',
        placeholder: 'Select an option',
        helper: 'Family presence can increase pathway opportunities or points.',
        required: true,
        width: 'half',
        options: yesNoOptions,
      },
      {
        key: 'additionalContext',
        label: 'Additional context',
        type: 'textarea',
        placeholder: 'Share any constraints or context that could affect recommendation quality.',
        helper: 'Use this for unique details not captured above.',
        width: 'full',
      },
    ],
  },
]

const sectionIds = sections.map(section => section.id)

const fieldValues = reactive<SectionFieldValues>({
  personal: {
    firstName: '',
    lastName: '',
    email: '',
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
  work: {
    currentRole: '',
    nocTeerCategory: '',
    yearsSkilledExperience: '',
    canadianWorkExperienceYears: '',
    hasValidJobOffer: '',
    jobOfferProvince: '',
    selfEmployedExperience: '',
  },
  immigration: {
    currentCountry: '',
    currentStatusInCanada: '',
    statusExpiryDate: '',
    intendedProvince: '',
    openToRelocation: '',
    englishClb: '',
    frenchClb: '',
    availableSettlementFundsCad: '',
    previousRefusal: '',
    urgencyDeadline: '',
  },
  goals: {
    primaryGoal: '',
    targetTimelineMonths: '',
    budgetCad: '',
    priorityPreference: '',
    willingToStudyOrRetrain: '',
    hasFamilyInCanada: '',
    additionalContext: '',
  },
})

const sectionProgress = reactive<SectionProgress>({
  personal: false,
  education: false,
  work: false,
  immigration: false,
  goals: false,
})

const sectionErrors = reactive<Record<IntakeSection, Record<string, string>>>({
  personal: {},
  education: {},
  work: {},
  immigration: {},
  goals: {},
})

const requiredText = (message: string) => z.string().trim().min(1, message)

const requiredEmail = (message: string) => requiredText(message).email('Enter a valid email address.')

const requiredDate = (message: string) => requiredText(message)
  .refine(value => !Number.isNaN(Date.parse(value)), 'Enter a valid date.')

const optionalDate = () => z.string().trim()
  .refine(value => value === '' || !Number.isNaN(Date.parse(value)), 'Enter a valid date.')

function coerceNumberInput(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return undefined
    }

    const parsed = Number(trimmed)
    return Number.isNaN(parsed) ? value : parsed
  }

  return value
}

const requiredNumber = (message: string, minValue = 0) => z.preprocess(
  coerceNumberInput,
  z.number({
    required_error: message,
    invalid_type_error: 'Enter a valid number.',
  }).min(minValue, `Enter a number greater than or equal to ${minValue}.`),
)

const requiredWholeNumber = (message: string, minValue = 0) => z.preprocess(
  coerceNumberInput,
  z.number({
    required_error: message,
    invalid_type_error: 'Enter a valid whole number.',
  })
    .int('Enter a valid whole number.')
    .min(minValue, `Enter a number greater than or equal to ${minValue}.`),
)

const optionalWholeNumber = () => z.preprocess(
  coerceNumberInput,
  z.number({
    invalid_type_error: 'Enter a valid whole number.',
  }).int('Enter a valid whole number.').optional(),
)

const sectionValidationSchemas = {
  personal: z.object({
    firstName: requiredText('Enter your first name to continue.'),
    lastName: requiredText('Enter your last name to continue.'),
    email: requiredEmail('Enter your email to continue.'),
    dateOfBirth: requiredDate('Enter your date of birth to continue.'),
    countryOfCitizenship: requiredText('Enter your country of citizenship to continue.'),
    maritalStatus: requiredText('Select your marital status to continue.'),
    dependantsCount: requiredWholeNumber('Enter the number of dependants to continue.', 0),
  }),
  education: z.object({
    highestLevel: requiredText('Select your highest completed education level.'),
    fieldOfStudy: requiredText('Enter your field of study to continue.'),
    countryOfEducation: requiredText('Enter your country of education to continue.'),
    hasCanadianEducation: requiredText('Select whether you have Canadian education.'),
    credentialEcaStatus: requiredText('Select your credential assessment status.'),
  }),
  work: z.object({
    currentRole: requiredText('Enter your current role or occupation.'),
    nocTeerCategory: requiredText('Select your NOC TEER category.'),
    yearsSkilledExperience: requiredNumber('Enter your years of skilled work experience.', 0),
    canadianWorkExperienceYears: requiredNumber('Enter your years of Canadian work experience.', 0),
    hasValidJobOffer: requiredText('Select whether you have a valid Canadian job offer.'),
    jobOfferProvince: z.string().trim(),
    selfEmployedExperience: requiredText('Select whether you have self-employed experience.'),
  }),
  immigration: z.object({
    currentCountry: requiredText('Enter your current country of residence.'),
    currentStatusInCanada: requiredText('Select your current status in Canada.'),
    statusExpiryDate: optionalDate(),
    intendedProvince: requiredText('Enter your intended province or territory.'),
    openToRelocation: requiredText('Select whether you are open to relocation.'),
    englishClb: requiredWholeNumber('Enter your English CLB score.', 0)
      .refine(value => Number(value) <= 12, 'English CLB score must be between 0 and 12.'),
    frenchClb: optionalWholeNumber()
      .refine(value => value === '' || Number(value) <= 12, 'French CLB score must be between 0 and 12.'),
    availableSettlementFundsCad: requiredNumber('Enter your available settlement funds in CAD.', 0),
    previousRefusal: requiredText('Select whether you have a previous refusal.'),
    urgencyDeadline: optionalDate(),
  }),
  goals: z.object({
    primaryGoal: requiredText('Select your primary immigration goal.'),
    targetTimelineMonths: requiredWholeNumber('Enter your target timeline in months.', 1),
    budgetCad: requiredNumber('Enter your estimated process budget in CAD.', 0),
    priorityPreference: requiredText('Select your top decision priority.'),
    willingToStudyOrRetrain: requiredText('Select whether you are willing to study or retrain.'),
    hasFamilyInCanada: requiredText('Select whether you have close family in Canada.'),
    additionalContext: z.string().trim(),
  }),
} satisfies Record<IntakeSection, z.ZodTypeAny>

const currentSection = ref<IntakeSection>('personal')
const validationSummary = ref<string[]>([])
const saveFeedback = ref<SaveFeedback | null>(null)
const isSaving = ref(false)
const isHydrating = ref(true)

const currentSectionIndex = computed(() => sectionIds.findIndex(sectionId => sectionId === currentSection.value))
const activeSection = computed(() => sections[currentSectionIndex.value] || sections[0]!)

function isIntakeSection(value: string): value is IntakeSection {
  return sectionIds.includes(value as IntakeSection)
}

function clearValidationForSection(sectionId: IntakeSection) {
  sectionErrors[sectionId] = {}
  validationSummary.value = []
}

function coerceRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function coerceString(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function restoreProgressBySection(sectionId: IntakeSection) {
  const activeIndex = sectionIds.findIndex(id => id === sectionId)

  for (const [index, id] of sectionIds.entries()) {
    sectionProgress[id] = index < activeIndex
  }
}

function hydrateFieldValues(values: Record<string, Record<string, unknown>>) {
  for (const section of sections) {
    const sectionValueMap = coerceRecord(values[section.id])

    for (const field of section.fields) {
      fieldValues[section.id][field.key] = coerceString(sectionValueMap[field.key])
    }
  }
}

function validateCurrentSection() {
  const sectionId = currentSection.value
  const schema = sectionValidationSchemas[sectionId]
  const sectionInput = fieldValues[sectionId]
  const parsed = schema.safeParse(sectionInput)

  clearValidationForSection(sectionId)

  if (parsed.success) {
    return true
  }

  const nextErrors: Record<string, string> = {}

  for (const issue of parsed.error.issues) {
    const issueKey = String(issue.path[0] || '')

    if (issueKey && !nextErrors[issueKey]) {
      nextErrors[issueKey] = issue.message
    }
  }

  sectionErrors[sectionId] = nextErrors
  validationSummary.value = Object.values(nextErrors)

  return false
}

function createDraftPayload(options?: {
  currentSection?: IntakeSection
  sectionProgress?: Partial<SectionProgress>
}): IntakeDraftPayload {
  return {
    currentSection: options?.currentSection || currentSection.value,
    sectionProgress: {
      personal: sectionProgress.personal,
      education: sectionProgress.education,
      work: sectionProgress.work,
      immigration: sectionProgress.immigration,
      goals: sectionProgress.goals,
      ...(options?.sectionProgress || {}),
    },
    fieldValues: {
      personal: { ...fieldValues.personal },
      education: { ...fieldValues.education },
      work: { ...fieldValues.work },
      immigration: { ...fieldValues.immigration },
      goals: { ...fieldValues.goals },
    },
  }
}

async function saveDraft(payload: IntakeDraftPayload = createDraftPayload()) {
  isSaving.value = true
  saveFeedback.value = {
    tone: 'info',
    message: 'Saving your draft...',
  }

  try {
    const response = await $fetch<IntakeDraftResponse>('/api/intake/draft', {
      method: 'POST',
      body: payload,
    })

    saveFeedback.value = {
      tone: 'success',
      message: response.savedAt
        ? `Draft saved at ${new Date(response.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
        : 'Draft saved successfully.',
    }

    return true
  }
  catch {
    saveFeedback.value = {
      tone: 'error',
      message: 'We could not save your draft. Please try again.',
    }

    return false
  }
  finally {
    isSaving.value = false
  }
}

function moveToPreviousSection() {
  const currentIndex = currentSectionIndex.value

  if (currentIndex <= 0) {
    return
  }

  clearValidationForSection(currentSection.value)
  currentSection.value = sectionIds[currentIndex - 1]!
}

async function moveToNextSection() {
  const valid = validateCurrentSection()

  if (!valid) {
    return
  }

  const sourceSection = currentSection.value
  const currentIndex = currentSectionIndex.value
  const targetSection = currentIndex < sectionIds.length - 1
    ? sectionIds[currentIndex + 1]!
    : sourceSection
  const saved = await saveDraft(createDraftPayload({
    currentSection: targetSection,
    sectionProgress: {
      [sourceSection]: true,
    },
  }))

  if (!saved) {
    return
  }

  sectionProgress[sourceSection] = true
  currentSection.value = targetSection
  clearValidationForSection(currentSection.value)
}

async function hydrateDraft() {
  try {
    const response = await $fetch<IntakeDraftResponse>('/api/intake/draft')

    if (response?.values) {
      hydrateFieldValues(response.values)
    }

    if (response?.currentSection && isIntakeSection(response.currentSection)) {
      currentSection.value = response.currentSection
      restoreProgressBySection(response.currentSection)
    }
  }
  finally {
    isHydrating.value = false
  }
}

onMounted(async () => {
  await hydrateDraft()
})

</script>

<template>
  <div data-testid="intake-page" class="flex h-full w-full flex-col pb-[60px] lg:pb-0">
    <div class="mb-6 md:mb-10">
      <IntakeProgress
        :sections="sections.map(section => ({ id: section.id, label: section.label }))"
        :current-section="currentSection"
        :section-progress="sectionProgress"
      />
    </div>

    <!-- Active Section Heading -->
    <div class="mb-6 md:mb-8">
      <h2
        data-testid="intake-section-heading"
        class="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl"
      >
        {{ activeSection.heading }}
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-500 md:text-base">
        {{ activeSection.description }}
      </p>
    </div>

    <!-- Form Container -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
      <div class="space-y-6 md:space-y-8">
        <div
          v-if="validationSummary.length > 0"
          data-testid="intake-validation-summary"
          role="alert"
          class="rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <div class="mb-2 flex items-start gap-2 text-amber-900">
            <AlertTriangle class="mt-0.5 size-4" />
            <p class="text-sm font-semibold">
              Please fix the following before moving forward:
            </p>
          </div>
          <ul class="list-disc space-y-1 pl-6 text-sm text-amber-900">
            <li
              v-for="message in validationSummary"
              :key="message"
            >
              {{ message }}
            </li>
          </ul>
        </div>

        <div v-if="isHydrating" class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Restoring your saved draft...
        </div>

        <div
          v-for="section in sections"
          :key="`fields-${section.id}`"
        >
          <IntakeSectionFields
            v-if="section.id === currentSection"
            v-model="fieldValues[section.id]"
            :fields="section.fields"
            :errors="sectionErrors[section.id]"
          />
        </div>

        <!-- Desktop Footer Actions -->
        <div class="hidden items-center justify-between border-t border-slate-100 pt-8 lg:flex">
          <div class="flex items-center gap-4">
            <button
              v-if="currentSectionIndex > 0"
              type="button"
              data-testid="intake-previous"
              :disabled="isHydrating"
              @click="moveToPreviousSection"
              class="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Back
            </button>
            <button
              type="button"
              data-testid="intake-save"
              :disabled="isHydrating || isSaving"
              @click="saveDraft()"
              class="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-6 font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <LoaderCircle v-if="isSaving" class="mr-2 size-4 animate-spin" />
              Save Draft
            </button>
            <div
              v-if="saveFeedback"
              data-testid="intake-save-feedback"
              class="flex items-center gap-1.5 rounded-full px-3 py-1"
              :class="[
                saveFeedback.tone === 'success' ? 'bg-emerald-50 text-emerald-600' :
                saveFeedback.tone === 'error' ? 'bg-red-50 text-red-600' :
                'bg-slate-50 text-slate-600'
              ]"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 v-if="saveFeedback.tone === 'success'" class="size-3.5" />
              <AlertTriangle v-else-if="saveFeedback.tone === 'error'" class="size-3.5" />
              <LoaderCircle v-else class="size-3.5 animate-spin" />
              <span class="text-[10px] font-bold uppercase tracking-wider">{{ saveFeedback.message }}</span>
            </div>
          </div>
          <button
            type="button"
            data-testid="intake-next"
            :disabled="isHydrating"
            @click="moveToNextSection"
            class="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--trust)] px-8 font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            Next Section
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Header Actions (Sticky Bottom) -->
    <!-- Matches WorkspaceShell's mobile nav layout padding by rendering right above standard 60px nav area or sitting on top of it -->
    <div class="fixed inset-x-0 bottom-[60px] z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-sm lg:hidden">
      <div class="mx-auto flex max-w-lg items-center justify-between gap-3">
        <button
          v-if="currentSectionIndex > 0"
          type="button"
          data-testid="intake-previous-mobile"
          :disabled="isHydrating"
          @click="moveToPreviousSection"
          class="flex-1 rounded-lg py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          data-testid="intake-save-mobile"
          :disabled="isHydrating || isSaving"
          @click="saveDraft()"
          class="flex-1 rounded-lg border border-slate-200 py-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
        >
          {{ isSaving ? 'Saving...' : 'Save Draft' }}
        </button>
        <button
          type="button"
          data-testid="intake-next-mobile"
          :disabled="isHydrating"
          @click="moveToNextSection"
          class="flex flex-[1.5] items-center justify-center gap-1.5 rounded-lg bg-[var(--trust)] py-3 text-sm font-semibold text-white shadow-md shadow-[var(--trust)]/20 transition-all hover:brightness-110"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
