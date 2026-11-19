<script setup lang="ts">
import { createAdminOperation } from '@/lib/admin/createOperation'

import { computed, ref } from 'vue'

import EvidenceSourceDetail from '@/components/admin/EvidenceSourceDetail.vue'
import EvidenceSourceList from '@/components/admin/EvidenceSourceList.vue'
import SignOutButton from '@/components/auth/SignOutButton.vue'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { adminNavigationLinks } from '@/lib/admin/navigation'
import type { PathwayDefinitionRecord } from '@/lib/admin/pathwayDefinitions'
import type {
  EvidenceSourceDetailRecord,
  EvidenceSourceDraft,
  EvidenceSourceRecord,
} from '@/lib/admin/evidenceSources'
import {
  createEmptyEvidenceSourceDraft,
  createEvidenceSourceDraftFromRecord,
} from '@/lib/admin/evidenceSources'

type ListEvidenceSourcesResponse = {
  ok: boolean
  currentUserIsAdmin: boolean
  items: EvidenceSourceRecord[]
}

type ListPathwayDefinitionsResponse = {
  ok: boolean
  items: PathwayDefinitionRecord[]
  totalCount: number
}

type CreateEvidenceSourceResponse = {
  ok: boolean
  sourceId: string
  status: string
}

type NuxtErrorLike = {
  statusMessage?: string
  data?: {
    statusMessage?: string
  }
}

const createOperation = createAdminOperation()

definePageMeta({
  middleware: ['auth', 'admin'],
})

const { loggedIn, waitForSession } = useUserSession()

const sources = ref<EvidenceSourceRecord[]>([])
const pathwayOptions = ref<PathwayDefinitionRecord[]>([])
const selectedSourceId = ref<string | null>(null)
const selectedDetail = ref<EvidenceSourceDetailRecord | null>(null)
const detailMode = ref<'empty' | 'view' | 'edit' | 'create'>('empty')
const draft = ref<EvidenceSourceDraft>(createEmptyEvidenceSourceDraft())
const pending = ref(false)
const detailPending = ref(false)
const saving = ref(false)
const actionPending = ref<string | null>(null)
const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null)
const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'paused' | 'stale' | 'pending' | 'rejected'>('all')
const confirmAction = ref<'pause' | 'remove' | null>(null)

const activeCount = computed(
  () => sources.value.filter((source) => source.lifecycleStatus === 'active').length,
)
const staleCount = computed(
  () => sources.value.filter((source) => source.freshness === 'stale').length,
)
const mobileShowsDetail = computed(() => detailMode.value !== 'empty')
const confirmSource = computed(() => selectedDetail.value?.source || null)

const filteredSources = computed(() => {
  const normalizedSearch = searchQuery.value.trim().toLowerCase()

  return sources.value.filter((source) => {
    if (statusFilter.value === 'active' && source.lifecycleStatus !== 'active') {
      return false
    }

    if (statusFilter.value === 'paused' && source.lifecycleStatus !== 'paused') {
      return false
    }

    if (statusFilter.value === 'pending' && source.lifecycleStatus !== 'pending') {
      return false
    }

    if (statusFilter.value === 'rejected' && source.lifecycleStatus !== 'rejected') {
      return false
    }

    if (statusFilter.value === 'stale' && source.freshness !== 'stale') {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return (
      source.name.toLowerCase().includes(normalizedSearch) ||
      (source.description || '').toLowerCase().includes(normalizedSearch) ||
      source.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch))
    )
  })
})

function resolveErrorMessage(error: unknown, fallback: string) {
  const typedError = error as NuxtErrorLike
  return typedError?.data?.statusMessage || typedError?.statusMessage || fallback
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function loadPathways() {
  const response = await $fetch<ListPathwayDefinitionsResponse>('/api/admin/pathways')
  pathwayOptions.value = response.items
}

async function loadSources() {
  const response = await $fetch<ListEvidenceSourcesResponse>('/api/admin/rag/sources')
  sources.value = response.items
}

async function selectSource(sourceId: string) {
  detailPending.value = true

  try {
    const detail = await $fetch<EvidenceSourceDetailRecord>(
      `/api/admin/rag/sources/${encodeURIComponent(sourceId)}`,
    )
    selectedSourceId.value = sourceId
    selectedDetail.value = detail
    detailMode.value = 'view'
    draft.value = createEvidenceSourceDraftFromRecord(detail.source)
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load the evidence source detail.'),
    }
  } finally {
    detailPending.value = false
  }
}

async function loadPageData() {
  pending.value = true

  try {
    await Promise.all([loadPathways(), loadSources()])

    if (
      selectedSourceId.value &&
      sources.value.some((source) => source.id === selectedSourceId.value)
    ) {
      await selectSource(selectedSourceId.value)
    } else if (detailMode.value === 'view' || detailMode.value === 'edit') {
      selectedSourceId.value = null
      selectedDetail.value = null
      detailMode.value = 'empty'
    }

    feedback.value = null
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load the evidence source curation surface.'),
    }
  } finally {
    pending.value = false
  }
}

function updateDraft(nextDraft: EvidenceSourceDraft) {
  draft.value = nextDraft
}

function startCreate() {
  selectedSourceId.value = null
  selectedDetail.value = null
  draft.value = createEmptyEvidenceSourceDraft()
  detailMode.value = 'create'
}

function startEdit() {
  if (!selectedDetail.value) {
    return
  }

  draft.value = createEvidenceSourceDraftFromRecord(selectedDetail.value.source)
  detailMode.value = 'edit'
}

function cancelDetail() {
  if (detailMode.value === 'edit' && selectedDetail.value) {
    draft.value = createEvidenceSourceDraftFromRecord(selectedDetail.value.source)
    detailMode.value = 'view'
    return
  }

  if (detailMode.value === 'create') {
    detailMode.value = selectedDetail.value ? 'view' : 'empty'
    return
  }
}

function buildCreatePayload() {
  const basePayload = {
    type: draft.value.type,
    name: draft.value.name.trim(),
    description: draft.value.description.trim() || null,
    trustScore: Math.max(0, Math.min(100, Math.round(draft.value.trustScore))),
    linkedPathwayIds: draft.value.linkedPathwayIds,
    tenantId: draft.value.tenantId.trim() || 'default',
    tags: splitCsv(draft.value.tagsText),
    schedule: {
      frequency: draft.value.frequency,
      intervalHours: draft.value.frequency === 'interval' ? draft.value.intervalHours : undefined,
    },
    enabled: true,
  }

  if (draft.value.type === 'website') {
    return {
      ...basePayload,
      websiteConfig: {
        seedUrls: splitCsv(draft.value.websiteSeedUrls),
        allowedDomains: splitCsv(draft.value.websiteAllowedDomains),
        includePatterns: splitCsv(draft.value.websiteIncludePatterns),
        excludePatterns: splitCsv(draft.value.websiteExcludePatterns),
        maxDepth: draft.value.websiteMaxDepth,
        maxPagesPerRun: draft.value.websiteMaxPagesPerRun,
        renderMode: draft.value.websiteRenderMode,
        requestHeadersRef: draft.value.websiteRequestHeadersRef.trim() || undefined,
        respectRobots: draft.value.websiteRespectRobots,
      },
    }
  }

  return {
    ...basePayload,
    youtubeConfig: {
      channelId: draft.value.youtubeChannelId.trim(),
      channelUrl: draft.value.youtubeChannelUrl.trim(),
      maxVideosPerRun: draft.value.youtubeMaxVideosPerRun,
      includeShorts: draft.value.youtubeIncludeShorts,
      preferredLanguage: draft.value.youtubePreferredLanguage.trim() || undefined,
    },
  }
}

function buildUpdatePayload() {
  const basePayload = {
    name: draft.value.name.trim(),
    description: draft.value.description.trim() || null,
    trustScore: Math.max(0, Math.min(100, Math.round(draft.value.trustScore))),
    tenantId: draft.value.tenantId.trim() || 'default',
    linkedPathwayIds: draft.value.linkedPathwayIds,
    tags: splitCsv(draft.value.tagsText),
    schedule: {
      frequency: draft.value.frequency,
      intervalHours: draft.value.frequency === 'interval' ? draft.value.intervalHours : undefined,
    },
    enabled: true,
  }

  if (draft.value.type === 'website') {
    return {
      ...basePayload,
      websiteConfig: {
        seedUrls: splitCsv(draft.value.websiteSeedUrls),
        allowedDomains: splitCsv(draft.value.websiteAllowedDomains),
        includePatterns: splitCsv(draft.value.websiteIncludePatterns),
        excludePatterns: splitCsv(draft.value.websiteExcludePatterns),
        maxDepth: draft.value.websiteMaxDepth,
        maxPagesPerRun: draft.value.websiteMaxPagesPerRun,
        renderMode: draft.value.websiteRenderMode,
        requestHeadersRef: draft.value.websiteRequestHeadersRef.trim() || undefined,
        respectRobots: draft.value.websiteRespectRobots,
      },
    }
  }

  return {
    ...basePayload,
    youtubeConfig: {
      channelId: draft.value.youtubeChannelId.trim(),
      channelUrl: draft.value.youtubeChannelUrl.trim(),
      maxVideosPerRun: draft.value.youtubeMaxVideosPerRun,
      includeShorts: draft.value.youtubeIncludeShorts,
      preferredLanguage: draft.value.youtubePreferredLanguage.trim() || undefined,
    },
  }
}

async function saveDetail() {
  saving.value = true

  try {
    if (detailMode.value === 'create') {
      const payload = buildCreatePayload()
      const created = await $fetch<CreateEvidenceSourceResponse>('/api/admin/rag/sources', {
        method: 'POST',
        headers: createOperation.headers(payload),
        body: payload,
      })

      await loadSources()
      await selectSource(created.sourceId)
      if (selectedSourceId.value === created.sourceId) createOperation.complete()

      feedback.value = {
        tone: 'success',
        message: 'Evidence source created and added to the curated trust inventory.',
      }
      return
    }

    if (!selectedSourceId.value) {
      return
    }

    const detail = await $fetch<EvidenceSourceDetailRecord>(
      `/api/admin/rag/sources/${encodeURIComponent(selectedSourceId.value)}`,
      {
        method: 'PATCH',
        body: buildUpdatePayload(),
      },
    )

    selectedDetail.value = detail
    detailMode.value = 'view'
    draft.value = createEvidenceSourceDraftFromRecord(detail.source)
    await loadSources()

    feedback.value = {
      tone: 'success',
      message: `${detail.source.name} was updated in the curated evidence inventory.`,
    }
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to save the evidence source.'),
    }
  } finally {
    saving.value = false
  }
}

async function runSourceAction(action: 'pause' | 'resume' | 'remove' | 'refresh') {
  if (!selectedSourceId.value) {
    return
  }

  actionPending.value = action

  try {
    if (action === 'refresh') {
      await $fetch('/api/admin/rag/ingestion/run', {
        method: 'POST',
        body: {
          mode: 'manual',
          sourceIds: [selectedSourceId.value],
        },
      })

      feedback.value = {
        tone: 'success',
        message: 'Manual refresh queued for the selected evidence source.',
      }
    } else if (action === 'remove') {
      await $fetch(`/api/admin/rag/sources/${encodeURIComponent(selectedSourceId.value)}`, {
        method: 'DELETE',
      })

      const removedSourceId = selectedSourceId.value
      await loadSources()
      selectedSourceId.value = null
      selectedDetail.value = null
      detailMode.value = 'empty'

      feedback.value = {
        tone: 'success',
        message: `Evidence source ${removedSourceId} was removed from the curated inventory.`,
      }
    } else {
      await $fetch(
        `/api/admin/rag/sources/${encodeURIComponent(selectedSourceId.value)}/${action}`,
        {
          method: 'POST',
        },
      )

      await loadSources()
      await selectSource(selectedSourceId.value)

      feedback.value = {
        tone: 'success',
        message: `Evidence source ${action === 'pause' ? 'paused' : 'resumed'} successfully.`,
      }
    }
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, `Unable to ${action} the evidence source.`),
    }
  } finally {
    actionPending.value = null
    confirmAction.value = null
  }
}

if (import.meta.client) {
  await waitForSession()

  if (!loggedIn.value) {
    await navigateTo('/auth')
  } else {
    await loadPageData()
  }
}
</script>

<template>
  <main
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 text-slate-900 md:px-6"
  >
    <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Trust Operations
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-slate-950">Evidence sources</h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Curate the trusted evidence inventory that supports recommendation rationale without
          exposing governance mechanics to end users.
        </p>

        <dl class="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Active</dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ activeCount }}
            </dd>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Stale</dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ staleCount }}
            </dd>
          </div>
        </dl>

        <nav class="mt-6 space-y-2" aria-label="Admin navigation">
          <NuxtLink
            v-for="link in adminNavigationLinks"
            :key="link.href"
            :to="link.href"
            class="flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition"
            :class="
              link.href === '/admin/evidence-sources'
                ? 'border-teal-200 bg-teal-50 text-teal-900'
                : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
            "
          >
            <span>{{ link.label }}</span>
            <span class="text-xs uppercase tracking-[0.16em] text-slate-400">
              {{ link.href === '/admin/evidence-sources' ? 'Live' : 'Link' }}
            </span>
          </NuxtLink>
        </nav>

        <SignOutButton class="mt-6" />
      </aside>

      <section class="space-y-5">
        <header class="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Admin-only governance surface
              </p>
              <h2 class="text-3xl font-semibold text-slate-950">Master-detail source curation</h2>
              <p class="max-w-3xl text-sm leading-6 text-slate-600">
                Review trusted sources, inspect freshness and trust scoring, then pause, resume,
                refresh, edit, or remove them without leaving the governance workspace.
              </p>
            </div>
            <Button variant="outline" :disabled="pending" @click="loadPageData">
              {{ pending ? 'Refreshing…' : 'Refresh sources' }}
            </Button>
          </div>
        </header>

        <div
          v-if="feedback"
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          "
        >
          {{ feedback.message }}
        </div>

        <div class="grid gap-5 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)]">
          <div :class="mobileShowsDetail ? 'hidden lg:block' : 'block'">
            <div
              class="mb-4 grid gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_200px]"
            >
              <Input v-model="searchQuery" placeholder="Search sources, tags, or description" />
              <NativeSelect v-model="statusFilter">
                <option value="all">All states</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="stale">Stale</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </NativeSelect>
            </div>

            <EvidenceSourceList
              :items="filteredSources"
              :loading="pending"
              :selected-source-id="selectedSourceId"
              @create="startCreate"
              @select="selectSource"
            />
          </div>

          <div :class="mobileShowsDetail ? 'block' : 'hidden lg:block'">
            <EvidenceSourceDetail
              :action-pending="actionPending"
              :detail="selectedDetail"
              :draft="draft"
              :loading="detailPending"
              :mode="detailMode"
              :pathway-options="pathwayOptions"
              :saving="saving"
              :show-back-button="mobileShowsDetail"
              @back="detailMode = 'empty'"
              @cancel="cancelDetail"
              @pause="confirmAction = 'pause'"
              @refresh="runSourceAction('refresh')"
              @remove="confirmAction = 'remove'"
              @resume="runSourceAction('resume')"
              @save="saveDetail"
              @start-edit="startEdit"
              @update:draft="updateDraft"
            />
          </div>
        </div>
      </section>
    </div>

    <AlertDialog :open="Boolean(confirmAction)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {{ confirmAction === 'remove' ? 'Remove curated source?' : 'Pause curated source?' }}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{
              confirmAction === 'remove'
                ? `${confirmSource?.name || 'This source'} will be removed from the evidence inventory and no longer appear in the curation workspace.`
                : `${confirmSource?.name || 'This source'} will stop participating in active recommendation support until it is resumed.`
            }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="confirmAction = null"> Cancel </AlertDialogCancel>
          <AlertDialogAction @click="confirmAction && runSourceAction(confirmAction)">
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </main>
</template>
