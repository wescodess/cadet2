<script setup lang="ts">
import { AlertTriangle, CheckCircle2, LoaderCircle, Save } from 'lucide-vue-next'
import { z } from 'zod'

import IntakeProgress from '~/components/intake/IntakeProgress.vue'
import IntakeSectionFields from '~/components/intake/IntakeSectionFields.vue'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card'

definePageMeta({
  middleware: ['auth'],
})

type IntakeSection = 'personal' | 'education' | 'work' | 'immigration' | 'goals'

type IntakeField = {
  key: string
  label: string
  placeholder: string
  helper: string
  type?: 'text' | 'email'
  required?: boolean
  testIdError?: string
}

type IntakeSectionDefinition = {
  id: IntakeSection
  label: string
  heading: string
  description: string
  fields: IntakeField[]
}

type SectionProgress = Record<IntakeSection, boolean>
type SectionFieldValues = Record<IntakeSection, Record<string, string>>

type IntakeDraftResponse = {
  status: string
  savedAt: string | null
  currentSection: IntakeSection
  values: Record<string, Record<string, unknown>>
}

type SaveFeedback = {
  tone: 'info' | 'success' | 'error'
  message: string
}

const sections: IntakeSectionDefinition[] = [
  {
    id: 'personal',
    label: 'Personal',
    heading: 'Personal profile',
    description: 'Share core identity details so recommendations can match your legal profile correctly.',
    fields: [
      {
        key: 'firstName',
        label: 'First name',
        placeholder: 'Ada',
        helper: 'We use this to personalize your plan and document checklists.',
        required: true,
        testIdError: 'intake-error-first-name',
      },
      {
        key: 'lastName',
        label: 'Last name',
        placeholder: 'Okafor',
        helper: 'This helps keep your saved profile aligned with your formal records.',
        required: true,
      },
      {
        key: 'email',
        label: 'Email address',
        type: 'email',
        placeholder: 'ada@example.com',
        helper: 'We use this to send secure updates when your pathway insights are ready.',
        required: true,
      },
    ],
  },
  {
    id: 'education',
    label: 'Education',
    heading: 'Education history',
    description: 'Education details shape score assumptions and pathway eligibility confidence.',
    fields: [
      {
        key: 'highestLevel',
        label: 'Highest completed level',
        placeholder: 'Bachelors',
        helper: 'This helps estimate credential impact in recommendation scoring.',
        required: true,
      },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    heading: 'Work experience',
    description: 'Work context narrows pathways and expected competitiveness.',
    fields: [
      {
        key: 'currentRole',
        label: 'Current role or title',
        placeholder: 'Software Engineer',
        helper: 'Your role helps identify comparable pathways and likely evidence needs.',
        required: true,
      },
    ],
  },
  {
    id: 'immigration',
    label: 'Immigration',
    heading: 'Immigration context',
    description: 'Immigration intent and status help prioritize realistic path options.',
    fields: [
      {
        key: 'currentCountry',
        label: 'Current country of residence',
        placeholder: 'Nigeria',
        helper: 'Country context affects available pathways and processing assumptions.',
        required: true,
      },
    ],
  },
  {
    id: 'goals',
    label: 'Goals',
    heading: 'Planning goals',
    description: 'Your goals steer recommendation ranking and action priorities.',
    fields: [
      {
        key: 'primaryGoal',
        label: 'Primary immigration goal',
        placeholder: 'Permanent residency',
        helper: 'Clear goals improve recommendation quality and timeline guidance.',
        required: true,
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
  },
  education: {
    highestLevel: '',
  },
  work: {
    currentRole: '',
  },
  immigration: {
    currentCountry: '',
  },
  goals: {
    primaryGoal: '',
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

const sectionValidationSchemas: Record<IntakeSection, z.ZodObject<Record<string, z.ZodString>>> = {
  personal: z.object({
    firstName: z.string().trim().min(1, 'Enter your first name to continue.'),
    lastName: z.string().trim().min(1, 'Enter your last name to continue.'),
    email: z.string().trim().min(1, 'Enter your email to continue.'),
  }),
  education: z.object({
    highestLevel: z.string().trim().min(1, 'Enter your highest completed education level.'),
  }),
  work: z.object({
    currentRole: z.string().trim().min(1, 'Enter your current role or occupation.'),
  }),
  immigration: z.object({
    currentCountry: z.string().trim().min(1, 'Enter your current country of residence.'),
  }),
  goals: z.object({
    primaryGoal: z.string().trim().min(1, 'Enter your primary immigration goal.'),
  }),
}

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

function toDraftPayload() {
  return {
    currentSection: currentSection.value,
    sectionProgress,
    fieldValues,
  }
}

async function saveDraft() {
  isSaving.value = true
  saveFeedback.value = {
    tone: 'info',
    message: 'Saving your draft...',
  }

  try {
    const response = await $fetch<IntakeDraftResponse>('/api/intake/draft', {
      method: 'POST',
      body: toDraftPayload(),
    })

    saveFeedback.value = {
      tone: 'success',
      message: response.savedAt
        ? `Draft saved at ${new Date(response.savedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`
        : 'Draft saved successfully.',
    }
  }
  catch {
    saveFeedback.value = {
      tone: 'error',
      message: 'We could not save your draft. Please try again.',
    }
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

  const currentIndex = currentSectionIndex.value
  sectionProgress[currentSection.value] = true

  if (currentIndex < sectionIds.length - 1) {
    currentSection.value = sectionIds[currentIndex + 1]!
  }

  await saveDraft()
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
  <section class="space-y-6" data-testid="intake-page">
    <header class="space-y-2">
      <h1 class="text-2xl font-bold text-slate-900">
        Guided Intake
      </h1>
      <p class="text-sm text-slate-600">
        Complete each section at your pace. Your progress saves to your workspace as you go.
      </p>
    </header>

    <IntakeProgress
      :sections="sections.map(section => ({ id: section.id, label: section.label }))"
      :current-section="currentSection"
      :section-progress="sectionProgress"
    />

    <Card class="border-slate-200 bg-white">
      <CardHeader>
        <CardTitle
          data-testid="intake-section-heading"
          class="text-xl font-semibold text-slate-900"
        >
          {{ activeSection.heading }}
        </CardTitle>
        <CardDescription class="text-slate-600">
          {{ activeSection.description }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          v-if="validationSummary.length > 0"
          data-testid="intake-validation-summary"
          role="alert"
          class="rounded-lg border border-amber-200 bg-amber-50 p-3"
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
          v-show="section.id === currentSection"
          :key="section.id"
        >
          <IntakeSectionFields
            v-model="fieldValues[section.id]"
            :fields="section.fields"
            :errors="sectionErrors[section.id]"
          />
        </div>
      </CardContent>
      <CardFooter class="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            data-testid="intake-previous"
            :disabled="isHydrating"
            @click="moveToPreviousSection"
            class="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            Previous
          </button>
          <button
            type="button"
            data-testid="intake-next"
            :disabled="isHydrating"
            @click="moveToNextSection"
            class="inline-flex min-h-[44px] items-center justify-center rounded-md bg-[var(--trust)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--trust)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            Next
          </button>
          <button
            type="button"
            data-testid="intake-save"
            :disabled="isHydrating || isSaving"
            @click="saveDraft"
            class="inline-flex min-h-[44px] items-center justify-center rounded-md border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            <LoaderCircle v-if="isSaving" class="mr-2 size-4 animate-spin" />
            <Save v-else class="mr-2 size-4" />
            Save Draft
          </button>
        </div>

        <p
          v-if="saveFeedback"
          data-testid="intake-save-feedback"
          class="inline-flex items-center gap-2 text-sm"
          :class="[
            saveFeedback.tone === 'error'
              ? 'text-red-700'
              : saveFeedback.tone === 'success'
                ? 'text-emerald-700'
                : 'text-slate-600',
          ]"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            v-if="saveFeedback.tone === 'success'"
            class="size-4"
          />
          <AlertTriangle
            v-else-if="saveFeedback.tone === 'error'"
            class="size-4"
          />
          <LoaderCircle
            v-else
            class="size-4 animate-spin"
          />
          {{ saveFeedback.message }}
        </p>
      </CardFooter>
    </Card>
  </section>
</template>
