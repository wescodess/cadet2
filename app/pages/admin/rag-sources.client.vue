<script setup lang="ts">
import SignOutButton from '@/components/auth/SignOutButton.vue'
import { createAdminOperation } from '@/lib/admin/createOperation'

import { adminNavigationLinks } from '@/lib/admin/navigation'

type SourceStatus = 'pending_approval' | 'approved' | 'rejected' | 'paused'
type SourceType = 'website' | 'youtube_channel'
type ScheduleFrequency = 'daily' | 'manual' | 'interval'
type BatchStatus =
  'queued' | 'running' | 'ingesting' | 'sync_pending' | 'syncing' | 'completed' | 'failed'
type SourceRunStatus = 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled'

type AdminStatusResult = {
  signedIn: boolean
  adminCount: number
  currentUserIsAdmin: boolean
  currentUser: { userId: string; email: string | null } | null
  bootstrapAvailable: boolean
}

const createOperation = createAdminOperation()

definePageMeta({
  middleware: ['auth', 'admin'],
})

type ListSourcesResult = {
  currentUserIsAdmin: boolean
  items: Array<{
    _id: string
    _creationTime: number
    type: SourceType
    status: SourceStatus
    name: string
    tenantId: string
    tags: string[]
    createdByUserId: string
    createdByEmail?: string
    approvedAt?: number
    rejectedAt?: number
    rejectionReason?: string
    enabled: boolean
    schedule: { frequency: ScheduleFrequency; intervalHours?: number }
    crawlConfig: Record<string, unknown>
    lastRunAt?: number
    lastSuccessAt?: number
    lastFailureAt?: number
    lastFailureReason?: string
    nextRunAt?: number
  }>
}

type IngestionBatchSummary = {
  sourcesSucceeded: number
  sourcesPartial: number
  sourcesFailed: number
  itemsNew: number
  itemsChanged: number
  itemsUnchanged: number
  itemsFailed: number
  transcriptAttempted: number
  transcriptSucceeded: number
  transcriptSucceededInnerTubeAndroid: number
  transcriptSucceededApi: number
  transcriptSucceededCaptionsXml: number
  transcriptSucceededWithTimestamps: number
  transcriptDescriptionFallback: number
}

type ListBatchesResult = {
  items: Array<{
    _id: string
    _creationTime: number
    status: BatchStatus
    scheduledFor: number
    startedAt?: number
    finishedAt?: number
    trigger: 'scheduled' | 'manual'
    sourceCount: number
    dueSourceIds: string[]
    idempotencyKey: string
    summary: IngestionBatchSummary
    requestedByUserId?: string
    requestedByEmail?: string
  }>
}

type BatchDetailResult = {
  batch: ListBatchesResult['items'][number]
  sourceRuns: Array<{
    _id: string
    sourceId: string
    batchId: string
    tenantId: string
    status: SourceRunStatus
    startedAt?: number
    finishedAt?: number
    trigger: 'scheduled' | 'manual' | 'retry'
    attempt: number
    maxAttempts: number
    lastError?: string
    stats: {
      discovered: number
      fetched: number
      new: number
      changed: number
      unchanged: number
      failed: number
      skipped: number
      transcriptAttempted: number
      transcriptSucceeded: number
      transcriptSucceededInnerTubeAndroid: number
      transcriptSucceededApi: number
      transcriptSucceededCaptionsXml: number
      transcriptSucceededWithTimestamps: number
      transcriptDescriptionFallback: number
    }
    errors: Array<{
      code: string
      message: string
      retryable?: boolean
      timestamp: number
    }>
    source: {
      _id: string
      name: string
      type: SourceType
    } | null
  }>
  syncJob: null | {
    _id: string
    status: string
  }
}

const { loggedIn, waitForSession } = useUserSession()

const phase0Ready = ref(false)
const phase0Error = ref('')

const adminStatus = ref<AdminStatusResult | null>(null)
const sources = ref<ListSourcesResult['items']>([])
const ingestionBatches = ref<ListBatchesResult['items']>([])
const selectedBatchId = ref<string | null>(null)
const selectedBatchDetail = ref<BatchDetailResult | null>(null)
const selectedBatchPending = ref(false)
const pending = ref(false)
const actionPending = ref(false)
const errorMessage = ref('')
const showOnlyMine = ref(false)
const statusFilter = ref<'all' | SourceStatus>('all')
const typeFilter = ref<'all' | SourceType>('all')
const batchStatusFilter = ref<'all' | BatchStatus>('all')

const sourceType = ref<SourceType>('website')
const sourceName = ref('')
const tenantId = ref('default')
const tagsCsv = ref('')
const frequency = ref<ScheduleFrequency>('daily')
const intervalHours = ref(24)

const websiteSeedUrls = ref('https://example.com/docs')
const websiteAllowedDomains = ref('example.com')
const websiteIncludePatterns = ref('**/docs/**')
const websiteExcludePatterns = ref('')
const websiteMaxDepth = ref(3)
const websiteMaxPagesPerRun = ref(200)
const websiteRenderMode = ref<'static' | 'rendered'>('static')
const websiteRespectRobots = ref(true)

const youtubeChannelId = ref('')
const youtubeChannelUrl = ref('')
const youtubeMaxVideosPerRun = ref(25)
const youtubeIncludeShorts = ref(false)
const youtubePreferredLanguage = ref('')

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatTimestamp(value?: number) {
  if (!value || Number.isNaN(value)) {
    return '—'
  }

  return new Date(value).toLocaleString()
}

function formatPercent(numerator?: number, denominator?: number) {
  const num = Number(numerator ?? 0)
  const den = Number(denominator ?? 0)
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) {
    return '—'
  }

  return `${Math.round((num / den) * 100)}%`
}

async function checkPhase0Access() {
  phase0Error.value = ''
  try {
    await $fetch('/api/admin/rag/phase0-readiness')
    phase0Ready.value = true
  } catch (error) {
    phase0Ready.value = false
    phase0Error.value =
      error instanceof Error ? error.message : 'Phase 0 admin readiness access failed'
  }
}

async function refreshAdminStatus() {
  const result = await $fetch<AdminStatusResult & { ok: boolean }>(
    '/api/admin/rag/sources/admin-status',
  )
  adminStatus.value = {
    signedIn: result.signedIn,
    adminCount: result.adminCount,
    currentUserIsAdmin: result.currentUserIsAdmin,
    currentUser: result.currentUser,
    bootstrapAvailable: result.bootstrapAvailable,
  }
}

async function refreshSources() {
  const result = await $fetch<{ ok: boolean } & ListSourcesResult>('/api/admin/rag/sources', {
    query: {
      showOnlyMine: showOnlyMine.value ? '1' : '0',
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      type: typeFilter.value === 'all' ? undefined : typeFilter.value,
      tenantId: tenantId.value.trim() || undefined,
    },
  })

  sources.value = result.items
}

async function refreshIngestionBatches() {
  const result = await $fetch<{ ok: boolean } & ListBatchesResult>(
    '/api/admin/rag/ingestion/batches',
    {
      query: {
        limit: 12,
        status: batchStatusFilter.value === 'all' ? undefined : batchStatusFilter.value,
      },
    },
  )

  ingestionBatches.value = result.items

  if (selectedBatchId.value) {
    const stillExists = result.items.some((batch) => batch._id === selectedBatchId.value)
    if (!stillExists) {
      selectedBatchId.value = null
      selectedBatchDetail.value = null
    }
  }
}

async function inspectBatch(batchId: string) {
  selectedBatchPending.value = true
  try {
    const result = await $fetch<{ ok: boolean } & BatchDetailResult>(
      `/api/admin/rag/ingestion/batches/${batchId}`,
    )
    selectedBatchId.value = batchId
    selectedBatchDetail.value = {
      batch: result.batch,
      sourceRuns: result.sourceRuns,
      syncJob: result.syncJob,
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load batch detail'
  } finally {
    selectedBatchPending.value = false
  }
}

async function refreshAll() {
  pending.value = true
  errorMessage.value = ''
  try {
    await checkPhase0Access()
    if (!phase0Ready.value) {
      return
    }
    await refreshAdminStatus()
    await refreshSources()
    await refreshIngestionBatches()
    if (selectedBatchId.value) {
      await inspectBatch(selectedBatchId.value)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load sources'
  } finally {
    pending.value = false
  }
}

async function runManualIngestion(sourceIds?: string[]) {
  actionPending.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ ok: boolean; batchId: string }>('/api/admin/rag/ingestion/run', {
      method: 'POST',
      body: {
        mode: 'manual',
        sourceIds: sourceIds?.length ? sourceIds : undefined,
      },
    })

    await refreshAll()
    await inspectBatch(result.batchId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Manual ingestion run failed'
  } finally {
    actionPending.value = false
  }
}

async function submitSource() {
  actionPending.value = true
  errorMessage.value = ''

  try {
    const schedule =
      frequency.value === 'interval'
        ? { frequency: 'interval' as const, intervalHours: intervalHours.value }
        : { frequency: frequency.value }

    const payload: Record<string, unknown> = {
      type: sourceType.value,
      name: sourceName.value,
      tenantId: tenantId.value.trim() || 'default',
      tags: splitCsv(tagsCsv.value),
      schedule,
      enabled: true,
    }

    if (sourceType.value === 'website') {
      payload.websiteConfig = {
        seedUrls: websiteSeedUrls.value
          .split('\n')
          .map((v) => v.trim())
          .filter(Boolean),
        allowedDomains: splitCsv(websiteAllowedDomains.value),
        includePatterns: splitCsv(websiteIncludePatterns.value),
        excludePatterns: splitCsv(websiteExcludePatterns.value),
        maxDepth: websiteMaxDepth.value,
        maxPagesPerRun: websiteMaxPagesPerRun.value,
        renderMode: websiteRenderMode.value,
        respectRobots: websiteRespectRobots.value,
      }
    } else {
      payload.youtubeConfig = {
        channelId: youtubeChannelId.value.trim(),
        channelUrl: youtubeChannelUrl.value.trim(),
        maxVideosPerRun: youtubeMaxVideosPerRun.value,
        includeShorts: youtubeIncludeShorts.value,
        preferredLanguage: youtubePreferredLanguage.value.trim() || undefined,
      }
    }

    await $fetch('/api/admin/rag/sources', {
      method: 'POST',
      headers: createOperation.headers(payload),
      body: payload,
    })
    createOperation.complete()
    sourceName.value = ''
    tagsCsv.value = ''
    await refreshAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Submit failed'
  } finally {
    actionPending.value = false
  }
}

async function approveSource(source: ListSourcesResult['items'][number]) {
  const frequencyInput = window.prompt(
    'Approve with frequency (daily | manual | interval)',
    source.schedule.frequency,
  )

  if (frequencyInput === null) {
    return
  }

  const requestedFrequency = frequencyInput.trim().toLowerCase()
  const frequency = (requestedFrequency || source.schedule.frequency) as ScheduleFrequency

  if (!['daily', 'manual', 'interval'].includes(frequency)) {
    errorMessage.value = 'Invalid frequency. Use daily, manual, or interval.'
    return
  }

  let schedule: { frequency: ScheduleFrequency; intervalHours?: number }
  if (frequency === 'interval') {
    const intervalInput = window.prompt(
      'Interval hours (integer >= 1)',
      String(source.schedule.intervalHours ?? 24),
    )

    if (intervalInput === null) {
      return
    }

    const parsedInterval = Math.floor(Number(intervalInput))
    if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
      errorMessage.value = 'Invalid interval hours. Enter an integer >= 1.'
      return
    }

    schedule = { frequency: 'interval', intervalHours: parsedInterval }
  } else {
    schedule = { frequency }
  }

  actionPending.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/rag/sources/${source._id}/approve`, {
      method: 'POST',
      body: {
        note: 'Approved from Phase 1 admin UI',
        schedule,
      },
    })
    await refreshAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Approve failed'
  } finally {
    actionPending.value = false
  }
}

async function rejectSource(sourceId: string) {
  const reason = window.prompt('Rejection reason')
  if (!reason) {
    return
  }

  actionPending.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/rag/sources/${sourceId}/reject`, {
      method: 'POST',
      body: { reason },
    })
    await refreshAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Reject failed'
  } finally {
    actionPending.value = false
  }
}

async function pauseSource(sourceId: string) {
  actionPending.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/rag/sources/${sourceId}/pause`, {
      method: 'POST',
      body: { note: 'Paused from Phase 1 admin UI' },
    })
    await refreshAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Pause failed'
  } finally {
    actionPending.value = false
  }
}

async function resumeSource(sourceId: string) {
  actionPending.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/rag/sources/${sourceId}/resume`, {
      method: 'POST',
      body: { note: 'Resumed from Phase 1 admin UI' },
    })
    await refreshAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Resume failed'
  } finally {
    actionPending.value = false
  }
}

function statusBadgeClass(status: SourceStatus) {
  switch (status) {
    case 'approved':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    case 'pending_approval':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
    case 'rejected':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
    case 'paused':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-200'
  }
}

function batchStatusBadgeClass(status: BatchStatus) {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    case 'sync_pending':
      return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
    case 'failed':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
    case 'queued':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
    case 'running':
    case 'ingesting':
    case 'syncing':
      return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
  }
}

function sourceRunStatusBadgeClass(status: SourceRunStatus) {
  switch (status) {
    case 'succeeded':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
    case 'partial':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200'
    case 'failed':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-200'
    case 'cancelled':
      return 'border-slate-500/40 bg-slate-500/10 text-slate-200'
    case 'queued':
      return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
    case 'running':
      return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
  }
}

if (import.meta.client) {
  await waitForSession()
  if (!loggedIn.value) {
    await navigateTo('/auth')
  } else {
    await refreshAll()
  }
}

watch([showOnlyMine, statusFilter, typeFilter, batchStatusFilter], async () => {
  if (!phase0Ready.value) {
    return
  }
  await refreshAll()
})
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-16">
    <header class="space-y-2">
      <NuxtLink to="/" class="text-xs text-slate-400 hover:text-slate-200"> ← Home </NuxtLink>
      <p class="text-xs uppercase tracking-[0.2em] text-emerald-300">RAG Sources</p>
      <h1 class="text-2xl font-semibold text-white">
        Phase 1/2 Source Registry + Ingestion Orchestrator
      </h1>
      <p class="text-sm text-slate-400">
        Create and approve sources, then trigger Phase 2 ingestion batches and inspect source-run
        job tracking. Admin actions are proxied through Nuxt routes protected by the Phase 0
        allowlist.
      </p>
    </header>

    <nav class="flex flex-wrap gap-2" aria-label="Admin navigation">
      <NuxtLink
        v-for="link in adminNavigationLinks"
        :key="link.href"
        :to="link.href"
        class="rounded-full border px-3 py-1.5 text-xs transition"
        :class="
          link.href === '/admin/rag-sources'
            ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white'
        "
      >
        {{ link.label }}
      </NuxtLink>
    </nav>

    <SignOutButton />

    <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <p class="text-sm text-slate-300">
            Reviewed admin grant:
            <span :class="phase0Ready ? 'text-emerald-300' : 'text-rose-300'">{{
              phase0Ready ? 'ok' : 'failed'
            }}</span>
          </p>
          <p v-if="adminStatus" class="text-sm text-slate-300">
            Convex admins: <code>{{ adminStatus.adminCount }}</code> · Current user admin:
            <span :class="adminStatus.currentUserIsAdmin ? 'text-emerald-300' : 'text-amber-300'">{{
              adminStatus.currentUserIsAdmin ? 'yes' : 'no'
            }}</span>
          </p>
          <p v-if="phase0Error" class="text-xs text-rose-300">
            {{ phase0Error }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-if="phase0Ready && adminStatus?.currentUserIsAdmin"
            type="button"
            class="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
            :disabled="actionPending"
            @click="runManualIngestion()"
          >
            Run Due Sources (Phase 2)
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60"
            :disabled="pending || actionPending"
            @click="refreshAll"
          >
            {{ pending ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
    >
      {{ errorMessage }}
    </p>

    <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-medium text-slate-200">New Source Submission</h2>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <label class="inline-flex items-center gap-2">
            <span>Type</span>
            <select
              v-model="sourceType"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
            >
              <option value="website">website</option>
              <option value="youtube_channel">youtube_channel</option>
            </select>
          </label>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="submitSource">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Name</span>
            <input
              v-model="sourceName"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              required
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Tenant ID</span>
            <input
              v-model="tenantId"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <label class="space-y-1 text-sm md:col-span-2">
            <span class="text-slate-300">Tags (comma-separated)</span>
            <input
              v-model="tagsCsv"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="docs, product"
            />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1 text-sm">
              <span class="text-slate-300">Frequency</span>
              <select
                v-model="frequency"
                class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              >
                <option value="daily">daily</option>
                <option value="manual">manual</option>
                <option value="interval">interval</option>
              </select>
            </label>
            <label class="space-y-1 text-sm">
              <span class="text-slate-300">Interval hrs</span>
              <input
                v-model.number="intervalHours"
                :disabled="frequency !== 'interval'"
                type="number"
                min="1"
                class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        <div v-if="sourceType === 'website'" class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1 text-sm md:col-span-2">
            <span class="text-slate-300">Seed URLs (one per line)</span>
            <textarea
              v-model="websiteSeedUrls"
              rows="3"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Allowed domains (comma-separated)</span>
            <input
              v-model="websiteAllowedDomains"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Include patterns</span>
            <input
              v-model="websiteIncludePatterns"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Exclude patterns</span>
            <input
              v-model="websiteExcludePatterns"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1 text-sm">
              <span class="text-slate-300">Max depth</span>
              <input
                v-model.number="websiteMaxDepth"
                type="number"
                min="0"
                max="10"
                class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
            <label class="space-y-1 text-sm">
              <span class="text-slate-300">Max pages/run</span>
              <input
                v-model.number="websiteMaxPagesPerRun"
                type="number"
                min="1"
                max="5000"
                class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              />
            </label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="space-y-1 text-sm">
              <span class="text-slate-300">Render mode</span>
              <select
                v-model="websiteRenderMode"
                class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              >
                <option value="static">static</option>
                <option value="rendered">rendered</option>
              </select>
            </label>
            <label class="inline-flex items-center gap-2 pt-7 text-sm text-slate-300">
              <input v-model="websiteRespectRobots" type="checkbox" class="size-4" />
              Respect robots.txt
            </label>
          </div>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2">
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Channel ID</span>
            <input
              v-model="youtubeChannelId"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="UC..."
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Channel URL</span>
            <input
              v-model="youtubeChannelUrl"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="https://www.youtube.com/@channel"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Max videos/run</span>
            <input
              v-model.number="youtubeMaxVideosPerRun"
              type="number"
              min="1"
              max="200"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>
          <label class="space-y-1 text-sm">
            <span class="text-slate-300">Preferred language</span>
            <input
              v-model="youtubePreferredLanguage"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="en"
            />
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-slate-300">
            <input v-model="youtubeIncludeShorts" type="checkbox" class="size-4" />
            Include Shorts
          </label>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
            :disabled="actionPending || !phase0Ready"
          >
            {{ actionPending ? 'Submitting…' : 'Submit Source' }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-medium text-slate-200">Ingestion Batches (Phase 2)</h2>
          <p class="text-xs text-slate-400">
            Manual and scheduled batch records with source-run summaries. Adapter execution is still
            scaffold-only in Phase 2, so runs currently fail with "not implemented" until Phases
            3/4.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs">
          <label class="inline-flex items-center gap-2 text-slate-300">
            <span>Batch status</span>
            <select
              v-model="batchStatusFilter"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
            >
              <option value="all">all</option>
              <option value="queued">queued</option>
              <option value="running">running</option>
              <option value="ingesting">ingesting</option>
              <option value="sync_pending">sync_pending</option>
              <option value="syncing">syncing</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
            </select>
          </label>
          <button
            type="button"
            class="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
            :disabled="pending"
            @click="refreshIngestionBatches"
          >
            Refresh Batches
          </button>
        </div>
      </div>

      <div v-if="!ingestionBatches.length" class="text-sm text-slate-400">
        No ingestion batches yet.
      </div>
      <ul v-else class="space-y-3">
        <li
          v-for="batch in ingestionBatches"
          :key="batch._id"
          class="rounded-lg border border-slate-800 bg-slate-950/70 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-slate-100">{{ batch._id }}</span>
                <span
                  class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                  :class="batchStatusBadgeClass(batch.status)"
                >
                  {{ batch.status }}
                </span>
                <span
                  class="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300"
                >
                  {{ batch.trigger }}
                </span>
              </div>
              <p class="text-xs text-slate-500">
                scheduled: <code>{{ formatTimestamp(batch.scheduledFor) }}</code> · started:
                <code>{{ formatTimestamp(batch.startedAt) }}</code> · finished:
                <code>{{ formatTimestamp(batch.finishedAt) }}</code>
              </p>
              <p class="text-xs text-slate-500">
                sources: <code>{{ batch.sourceCount }}</code> · ok:
                <code>{{ batch.summary.sourcesSucceeded }}</code> · partial:
                <code>{{ batch.summary.sourcesPartial }}</code> · failed:
                <code>{{ batch.summary.sourcesFailed }}</code>
              </p>
              <p class="text-xs text-slate-500">
                items new: <code>{{ batch.summary.itemsNew }}</code> · changed:
                <code>{{ batch.summary.itemsChanged }}</code> · unchanged:
                <code>{{ batch.summary.itemsUnchanged }}</code> · failed:
                <code>{{ batch.summary.itemsFailed }}</code>
              </p>
              <p class="text-xs text-slate-500">
                transcripts: <code>{{ batch.summary.transcriptSucceeded ?? 0 }}</code>/<code>{{
                  batch.summary.transcriptAttempted ?? 0
                }}</code>
                (<code>{{
                  formatPercent(
                    batch.summary.transcriptSucceeded,
                    batch.summary.transcriptAttempted,
                  )
                }}</code
                >) · innertube:
                <code>{{ batch.summary.transcriptSucceededInnerTubeAndroid ?? 0 }}</code> · api:
                <code>{{ batch.summary.transcriptSucceededApi ?? 0 }}</code> · captions:
                <code>{{ batch.summary.transcriptSucceededCaptionsXml ?? 0 }}</code> · timestamped:
                <code>{{ batch.summary.transcriptSucceededWithTimestamps ?? 0 }}</code> · desc
                fallback: <code>{{ batch.summary.transcriptDescriptionFallback ?? 0 }}</code>
              </p>
              <p class="text-xs text-slate-500">
                idempotency: <code>{{ batch.idempotencyKey }}</code>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                :disabled="selectedBatchPending"
                @click="inspectBatch(batch._id)"
              >
                {{
                  selectedBatchPending && selectedBatchId === batch._id
                    ? 'Loading…'
                    : 'Inspect Runs'
                }}
              </button>
            </div>
          </div>
        </li>
      </ul>

      <div
        v-if="selectedBatchDetail"
        class="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4"
      >
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-medium text-slate-200">
            Batch Detail: <code>{{ selectedBatchDetail.batch._id }}</code>
          </h3>
          <button
            type="button"
            class="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-60"
            :disabled="selectedBatchPending"
            @click="inspectBatch(selectedBatchDetail.batch._id)"
          >
            {{ selectedBatchPending ? 'Refreshing…' : 'Refresh Detail' }}
          </button>
        </div>

        <div v-if="!selectedBatchDetail.sourceRuns.length" class="text-xs text-slate-400">
          No source runs recorded for this batch.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="run in selectedBatchDetail.sourceRuns"
            :key="run._id"
            class="rounded-md border border-slate-800 bg-slate-900/60 p-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm text-slate-100">{{ run.source?.name || run.sourceId }}</span>
                  <span
                    v-if="run.source"
                    class="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    {{ run.source.type }}
                  </span>
                  <span
                    class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                    :class="sourceRunStatusBadgeClass(run.status)"
                  >
                    {{ run.status }}
                  </span>
                  <span
                    class="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300"
                  >
                    {{ run.trigger }} · attempt {{ run.attempt }}/{{ run.maxAttempts }}
                  </span>
                </div>
                <p class="text-xs text-slate-500">
                  started: <code>{{ formatTimestamp(run.startedAt) }}</code> · finished:
                  <code>{{ formatTimestamp(run.finishedAt) }}</code>
                </p>
                <p class="text-xs text-slate-500">
                  stats: discovered <code>{{ run.stats.discovered }}</code> · fetched
                  <code>{{ run.stats.fetched }}</code> · new <code>{{ run.stats.new }}</code> ·
                  changed <code>{{ run.stats.changed }}</code> · unchanged
                  <code>{{ run.stats.unchanged }}</code> · failed
                  <code>{{ run.stats.failed }}</code>
                </p>
                <p
                  v-if="
                    run.source?.type === 'youtube_channel' ||
                    (run.stats.transcriptAttempted ?? 0) > 0 ||
                    (run.stats.transcriptDescriptionFallback ?? 0) > 0
                  "
                  class="text-xs text-slate-500"
                >
                  transcripts <code>{{ run.stats.transcriptSucceeded ?? 0 }}</code>/<code>{{
                    run.stats.transcriptAttempted ?? 0
                  }}</code>
                  (<code>{{
                    formatPercent(run.stats.transcriptSucceeded, run.stats.transcriptAttempted)
                  }}</code
                  >) · innertube
                  <code>{{ run.stats.transcriptSucceededInnerTubeAndroid ?? 0 }}</code> · api
                  <code>{{ run.stats.transcriptSucceededApi ?? 0 }}</code> · captions
                  <code>{{ run.stats.transcriptSucceededCaptionsXml ?? 0 }}</code> · timestamped
                  <code>{{ run.stats.transcriptSucceededWithTimestamps ?? 0 }}</code> · desc
                  fallback <code>{{ run.stats.transcriptDescriptionFallback ?? 0 }}</code>
                </p>
                <p v-if="run.lastError" class="text-xs text-rose-300">
                  last error: {{ run.lastError }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-sm font-medium text-slate-200">Sources</h2>
        <div class="flex flex-wrap items-center gap-3 text-xs">
          <label class="inline-flex items-center gap-2 text-slate-300">
            <input v-model="showOnlyMine" type="checkbox" class="size-4" />
            Show only mine
          </label>
          <label class="inline-flex items-center gap-2 text-slate-300">
            <span>Status</span>
            <select
              v-model="statusFilter"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
            >
              <option value="all">all</option>
              <option value="pending_approval">pending</option>
              <option value="approved">approved</option>
              <option value="paused">paused</option>
              <option value="rejected">rejected</option>
            </select>
          </label>
          <label class="inline-flex items-center gap-2 text-slate-300">
            <span>Type</span>
            <select
              v-model="typeFilter"
              class="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
            >
              <option value="all">all</option>
              <option value="website">website</option>
              <option value="youtube_channel">youtube</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="pending" class="text-sm text-slate-400">Loading sources…</div>
      <div v-else-if="!sources.length" class="text-sm text-slate-400">No sources found.</div>
      <ul v-else class="space-y-3">
        <li
          v-for="source in sources"
          :key="source._id"
          class="rounded-lg border border-slate-800 bg-slate-950/70 p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-medium text-slate-100">
                  {{ source.name }}
                </h3>
                <span
                  class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
                  :class="statusBadgeClass(source.status)"
                >
                  {{ source.status }}
                </span>
                <span
                  class="inline-flex rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300"
                >
                  {{ source.type }}
                </span>
              </div>
              <p class="text-xs text-slate-400">
                tenant: <code>{{ source.tenantId }}</code> · created by
                <code>{{ source.createdByEmail || source.createdByUserId }}</code>
              </p>
              <p class="text-xs text-slate-500">
                schedule: <code>{{ source.schedule.frequency }}</code><span
                  v-if="source.schedule.intervalHours"
                >
                  ({{ source.schedule.intervalHours }}h)</span
                >
                · enabled: <code>{{ source.enabled ? 'true' : 'false' }}</code>
              </p>
              <p class="text-xs text-slate-500">
                last run: <code>{{ formatTimestamp(source.lastRunAt) }}</code> · last success:
                <code>{{ formatTimestamp(source.lastSuccessAt) }}</code> · last failure:
                <code>{{ formatTimestamp(source.lastFailureAt) }}</code>
              </p>
              <p class="text-xs text-slate-500">
                next run: <code>{{ formatTimestamp(source.nextRunAt) }}</code> · approved at:
                <code>{{ formatTimestamp(source.approvedAt) }}</code> · rejected at:
                <code>{{ formatTimestamp(source.rejectedAt) }}</code>
              </p>
              <p v-if="source.lastFailureReason" class="text-xs text-rose-300">
                last failure: {{ source.lastFailureReason }}
              </p>
              <p v-if="source.rejectionReason" class="text-xs text-rose-300">
                rejection: {{ source.rejectionReason }}
              </p>
              <pre
                class="mt-2 overflow-x-auto rounded border border-slate-800 bg-slate-950 p-2 text-[11px] leading-5 text-slate-300"
              ><code>{{ JSON.stringify(source.crawlConfig, null, 2) }}</code></pre>
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                v-if="
                  adminStatus?.currentUserIsAdmin && source.status === 'approved' && source.enabled
                "
                type="button"
                class="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
                :disabled="actionPending"
                @click="runManualIngestion([source._id])"
              >
                Run Now
              </button>
              <button
                v-if="adminStatus?.currentUserIsAdmin && source.status !== 'approved'"
                type="button"
                class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-60"
                :disabled="actionPending"
                @click="approveSource(source)"
              >
                Approve
              </button>
              <button
                v-if="adminStatus?.currentUserIsAdmin && source.status !== 'rejected'"
                type="button"
                class="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-500/20 disabled:opacity-60"
                :disabled="actionPending"
                @click="rejectSource(source._id)"
              >
                Reject
              </button>
              <button
                v-if="adminStatus?.currentUserIsAdmin && source.status === 'approved'"
                type="button"
                class="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20 disabled:opacity-60"
                :disabled="actionPending"
                @click="pauseSource(source._id)"
              >
                Pause
              </button>
              <button
                v-if="adminStatus?.currentUserIsAdmin && source.status === 'paused'"
                type="button"
                class="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
                :disabled="actionPending"
                @click="resumeSource(source._id)"
              >
                Resume
              </button>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>
