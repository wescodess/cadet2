<script setup lang="ts">
import { computed, ref } from 'vue'

import PathwayRuleAccordion from '@/components/admin/PathwayRuleAccordion.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Accordion,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { adminNavigationLinks } from '@/lib/admin/navigation'
import type { PathwayDefinitionRecord, PathwayDefinitionStatus } from '@/lib/admin/pathwayDefinitions'
import type {
  PathwayRuleDraft,
  PathwayRuleRecord,
  PathwayRulesEditorItem,
} from '@/lib/admin/pathwayRules'
import {
  clonePathwayRuleDraft,
  createDefaultPathwayRuleDraft,
} from '@/lib/admin/pathwayRules'

type ListPathwayDefinitionsResponse = {
  ok: boolean
  items: PathwayDefinitionRecord[]
  totalCount: number
}

type ListPathwayRulesResponse = {
  ok: boolean
  items: PathwayRuleRecord[]
  totalCount: number
}

type NuxtErrorLike = {
  statusMessage?: string
  data?: {
    statusMessage?: string
  }
}

definePageMeta({
  middleware: ['auth', 'admin'],
})

const { loggedIn, waitForSession } = useUserSession()

const items = ref<PathwayRulesEditorItem[]>([])
const pending = ref(false)
const savingPathwayId = ref<string | null>(null)
const expandedValues = ref<string[]>([])
const confirmPathwayId = ref<string | null>(null)
const feedback = ref<{ tone: 'success' | 'error', message: string } | null>(null)

const activeCount = computed(() => items.value.filter(item => item.draftDefinition.status === 'active').length)
const dirtyCount = computed(() => items.value.filter(item => isDirty(item)).length)
const confirmItem = computed(() => items.value.find(item => item.pathwayId === confirmPathwayId.value) || null)

function resolveErrorMessage(error: unknown, fallback: string) {
  const typedError = error as NuxtErrorLike
  return typedError?.data?.statusMessage || typedError?.statusMessage || fallback
}

function toRuleDraft(rule: PathwayRuleRecord): PathwayRuleDraft {
  return {
    id: rule.id,
    unmetConditionId: rule.unmetConditionId,
    fieldPath: rule.fieldPath,
    operator: rule.operator,
    comparisonValue: rule.comparisonValue,
  }
}

function cloneRuleList(rules: PathwayRuleDraft[]) {
  return rules.map(clonePathwayRuleDraft)
}

function normalizePathwayItem(item: PathwayRulesEditorItem) {
  return JSON.stringify({
    definition: {
      displayName: item.draftDefinition.displayName.trim(),
      description: item.draftDefinition.description.trim(),
      status: item.draftDefinition.status,
    },
    rules: item.draftRules.map(rule => ({
      id: rule.id || null,
      unmetConditionId: rule.unmetConditionId.trim(),
      fieldPath: rule.fieldPath,
      operator: rule.operator,
      comparisonValue: rule.comparisonValue,
    })),
  })
}

function isDirty(item: PathwayRulesEditorItem) {
  const baseline = JSON.stringify({
    definition: {
      displayName: item.initialDefinition.displayName.trim(),
      description: (item.initialDefinition.description || '').trim(),
      status: item.initialDefinition.status,
    },
    rules: item.initialRules.map(rule => ({
      id: rule.id || null,
      unmetConditionId: rule.unmetConditionId.trim(),
      fieldPath: rule.fieldPath,
      operator: rule.operator,
      comparisonValue: rule.comparisonValue,
    })),
  })

  return baseline !== normalizePathwayItem(item)
}

function upsertPathwayItem(nextItem: PathwayRulesEditorItem) {
  const index = items.value.findIndex(item => item.pathwayId === nextItem.pathwayId)

  if (index === -1) {
    items.value = [...items.value, nextItem]
    return
  }

  items.value = items.value.map((item, itemIndex) => itemIndex === index ? nextItem : item)
}

function updatePathwayItem(pathwayId: string, updater: (item: PathwayRulesEditorItem) => PathwayRulesEditorItem) {
  const currentItem = items.value.find(item => item.pathwayId === pathwayId)
  if (!currentItem) {
    return
  }

  upsertPathwayItem(updater(currentItem))
}

async function loadRules(pathwayId: string) {
  const response = await $fetch<ListPathwayRulesResponse>(`/api/admin/pathways/${encodeURIComponent(pathwayId)}/rules`)
  return response.items.map(toRuleDraft)
}

async function loadPathways() {
  pending.value = true

  try {
    const definitions = await $fetch<ListPathwayDefinitionsResponse>('/api/admin/pathways')
    const rules = await Promise.all(definitions.items.map(item => loadRules(item.pathwayId)))

    items.value = definitions.items.map((definition, index) => {
      const initialRules = rules[index] || []

      return {
        pathwayId: definition.pathwayId,
        initialDefinition: definition,
        draftDefinition: {
          displayName: definition.displayName,
          description: definition.description || '',
          status: definition.status,
        },
        initialRules: cloneRuleList(initialRules),
        draftRules: cloneRuleList(initialRules),
      }
    })

    expandedValues.value = definitions.items.map(item => item.pathwayId)
    feedback.value = null
  }
  catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load the managed pathway rules.'),
    }
  }
  finally {
    pending.value = false
  }
}

function updateDefinition(pathwayId: string, field: 'displayName' | 'description' | 'status', value: string) {
  updatePathwayItem(pathwayId, item => ({
    ...item,
    draftDefinition: {
      ...item.draftDefinition,
      [field]: field === 'status' ? value as PathwayDefinitionStatus : value,
    },
  }))
}

function updateRule(pathwayId: string, index: number, rule: PathwayRuleDraft) {
  updatePathwayItem(pathwayId, item => ({
    ...item,
    draftRules: item.draftRules.map((currentRule, ruleIndex) => ruleIndex === index ? rule : currentRule),
  }))
}

function addRule(pathwayId: string) {
  updatePathwayItem(pathwayId, item => ({
    ...item,
    draftRules: [...item.draftRules, createDefaultPathwayRuleDraft()],
  }))
}

function removeRule(pathwayId: string, index: number) {
  updatePathwayItem(pathwayId, item => ({
    ...item,
    draftRules: item.draftRules.filter((_, ruleIndex) => ruleIndex !== index),
  }))
}

function requestSave(pathwayId: string) {
  const item = items.value.find(entry => entry.pathwayId === pathwayId)
  if (!item) {
    return
  }

  if (item.draftDefinition.status === 'active' || item.initialDefinition.status === 'active') {
    confirmPathwayId.value = pathwayId
    return
  }

  void savePathway(pathwayId)
}

async function savePathway(pathwayId: string) {
  const item = items.value.find(entry => entry.pathwayId === pathwayId)
  if (!item) {
    return
  }

  if (item.draftRules.length === 0) {
    feedback.value = {
      tone: 'error',
      message: 'Each pathway requires at least one eligibility rule before it can be saved.',
    }
    return
  }

  const invalidRule = item.draftRules.find(rule => rule.unmetConditionId.trim().length === 0)
  if (invalidRule) {
    feedback.value = {
      tone: 'error',
      message: 'Every rule requires a condition name before saving.',
    }
    return
  }

  savingPathwayId.value = pathwayId

  try {
    let latestDefinition = item.initialDefinition

    if (
      item.draftDefinition.displayName.trim() !== item.initialDefinition.displayName
      || item.draftDefinition.description.trim() !== (item.initialDefinition.description || '')
    ) {
      latestDefinition = await $fetch<PathwayDefinitionRecord>(`/api/admin/pathways/${encodeURIComponent(pathwayId)}`, {
        method: 'PATCH',
        body: {
          displayName: item.draftDefinition.displayName.trim(),
          description: item.draftDefinition.description.trim() || null,
        },
      })
    }

    if (item.draftDefinition.status !== latestDefinition.status) {
      latestDefinition = await $fetch<PathwayDefinitionRecord>(`/api/admin/pathways/${encodeURIComponent(pathwayId)}/status`, {
        method: 'PATCH',
        body: {
          status: item.draftDefinition.status,
        },
      })
    }

    const rulesResponse = await $fetch<ListPathwayRulesResponse>(`/api/admin/pathways/${encodeURIComponent(pathwayId)}/rules`, {
      method: 'PUT',
      body: {
        rules: item.draftRules.map(rule => ({
          id: rule.id,
          unmetConditionId: rule.unmetConditionId.trim(),
          fieldPath: rule.fieldPath,
          operator: rule.operator,
          comparisonValue: rule.comparisonValue,
        })),
      },
    })

    const latestRules = rulesResponse.items.map(toRuleDraft)

    upsertPathwayItem({
      pathwayId,
      initialDefinition: latestDefinition,
      draftDefinition: {
        displayName: latestDefinition.displayName,
        description: latestDefinition.description || '',
        status: latestDefinition.status,
      },
      initialRules: cloneRuleList(latestRules),
      draftRules: cloneRuleList(latestRules),
    })

    feedback.value = {
      tone: 'success',
      message: `${latestDefinition.displayName} rules were saved through the admin workflow.`,
    }
  }
  catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to save the pathway rule changes.'),
    }
  }
  finally {
    savingPathwayId.value = null
    confirmPathwayId.value = null
  }
}

function expandAll() {
  expandedValues.value = items.value.map(item => item.pathwayId)
}

function collapseAll() {
  expandedValues.value = []
}

if (import.meta.client) {
  await waitForSession()

  if (!loggedIn.value) {
    await navigateTo('/auth')
  }
  else {
    await loadPathways()
  }
}
</script>

<template>
  <main class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 text-slate-900 md:px-6">
    <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Trust Operations
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-slate-950">
          Pathway rules
        </h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Move the recommendation catalog from hard-coded predicates into an editable, governed eligibility DSL.
        </p>

        <dl class="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">
              Active
            </dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ activeCount }}
            </dd>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">
              Dirty
            </dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ dirtyCount }}
            </dd>
          </div>
        </dl>

        <nav class="mt-6 space-y-2" aria-label="Admin navigation">
          <NuxtLink
            v-for="link in adminNavigationLinks"
            :key="link.href"
            :to="link.href"
            class="flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition"
            :class="link.href === '/admin/pathway-rules'
              ? 'border-teal-200 bg-teal-50 text-teal-900'
              : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'"
          >
            <span>{{ link.label }}</span>
            <span class="text-xs uppercase tracking-[0.16em] text-slate-400">
              {{ link.href === '/admin/pathway-rules' ? 'Live' : 'Link' }}
            </span>
          </NuxtLink>
        </nav>
      </aside>

      <section class="space-y-5">
        <header class="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Admin-only governance surface
              </p>
              <h2 class="text-3xl font-semibold text-slate-950">
                Declarative eligibility editor
              </h2>
              <p class="max-w-3xl text-sm leading-6 text-slate-600">
                Each saved rule persists as structured pathway governance data and feeds the live recommendation evaluation pipeline without exposing governance mechanics to end users.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="outline" :disabled="pending" @click="collapseAll">
                Collapse all
              </Button>
              <Button variant="outline" :disabled="pending" @click="expandAll">
                Expand all
              </Button>
              <Button variant="outline" :disabled="pending" @click="loadPathways">
                {{ pending ? 'Refreshing…' : 'Refresh rules' }}
              </Button>
            </div>
          </div>
        </header>

        <div
          v-if="feedback"
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="feedback.tone === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-rose-200 bg-rose-50 text-rose-700'"
        >
          {{ feedback.message }}
        </div>

        <Accordion v-model="expandedValues" type="multiple" class="space-y-4">
          <PathwayRuleAccordion
            v-for="item in items"
            :key="item.pathwayId"
            :item="item"
            :dirty="isDirty(item)"
            :saving="savingPathwayId === item.pathwayId"
            @add-rule="addRule(item.pathwayId)"
            @remove-rule="index => removeRule(item.pathwayId, index)"
            @save="requestSave(item.pathwayId)"
            @update-definition="payload => updateDefinition(item.pathwayId, payload.field, payload.value)"
            @update-rule="payload => updateRule(item.pathwayId, payload.index, payload.rule)"
          />
        </Accordion>
      </section>
    </div>

    <AlertDialog :open="Boolean(confirmPathwayId)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Save live pathway changes?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ confirmItem
              ? `${confirmItem.draftDefinition.displayName} is active or will become active. Saving now updates the live recommendation rules used by admins and downstream recommendation processing.`
              : 'Saving now updates the live recommendation rules used by admins and downstream recommendation processing.' }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="confirmPathwayId = null">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction @click="confirmPathwayId && savePathway(confirmPathwayId)">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>
</template>
