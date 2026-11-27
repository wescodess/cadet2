<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Search, ShieldCheck, ShieldEllipsis, TimerReset } from 'lucide-vue-next'

import SignOutButton from '@/components/auth/SignOutButton.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminNavigationLinks } from '@/lib/admin/navigation'
import {
  auditBadgeTone,
  auditTrailActionOptions,
  auditTrailFilterGroups,
  auditTrailTestIds,
  formatAuditActionLabel,
  formatAuditEntityLabel,
  formatAuditJson,
  formatAuditTimestamp,
  type AuditTrailEventDetailResponse,
  type AuditTrailEventSummary,
  type AuditTrailListResponse,
  type AuditTrailSummaryResponse,
} from '@/lib/admin/auditTrail'

type FilterGroupKey = (typeof auditTrailFilterGroups)[number]['key']

type AuditListQuery = {
  actionType?: string
  entityType?: string
  search?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
}

definePageMeta({
  middleware: ['auth', 'admin'],
})

const { loggedIn, waitForSession } = useUserSession()

const summary = ref<AuditTrailSummaryResponse | null>(null)
const events = ref<AuditTrailEventSummary[]>([])
const selectedEventId = ref<string | null>(null)
const detail = ref<AuditTrailEventDetailResponse['event'] | null>(null)
const feedback = ref<{ tone: 'error' | 'success'; message: string } | null>(null)
const loading = ref(false)
const loadingMore = ref(false)
const loadingDetail = ref(false)
const nextCursor = ref<string | null>(null)
const activeGroup = ref<FilterGroupKey>('all')
const mobileTab = ref<'events' | 'detail'>('events')
const isDesktop = ref(false)
const filters = ref({
  actionType: '',
  entityType: '',
  search: '',
  actorId: '',
  dateFrom: '',
  dateTo: '',
})

const selectedEvent = computed(() => detail.value)

function buildQuery() {
  const query: AuditListQuery = {}

  if (filters.value.actionType) {
    query.actionType = filters.value.actionType
  }

  if (filters.value.entityType) {
    query.entityType = filters.value.entityType
  }

  if (filters.value.search.trim()) {
    query.search = filters.value.search.trim()
  }

  if (filters.value.actorId.trim()) {
    query.actorId = filters.value.actorId.trim()
  }

  if (filters.value.dateFrom) {
    query.dateFrom = filters.value.dateFrom
  }

  if (filters.value.dateTo) {
    query.dateTo = filters.value.dateTo
  }

  return query
}

function resolveErrorMessage(error: unknown, fallback: string) {
  const typed = error as {
    statusMessage?: string
    data?: {
      statusMessage?: string
    }
  }

  return typed?.data?.statusMessage || typed?.statusMessage || fallback
}

async function loadSummary() {
  summary.value = await $fetch<AuditTrailSummaryResponse>('/api/admin/audit-trail/summary')
}

async function loadDetail(eventId: string) {
  loadingDetail.value = true

  try {
    const response = await $fetch<AuditTrailEventDetailResponse>(
      `/api/admin/audit-trail/${encodeURIComponent(eventId)}`,
    )
    detail.value = response.event
    selectedEventId.value = eventId
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load audit event detail.'),
    }
  } finally {
    loadingDetail.value = false
  }
}

async function loadEvents(preferredEventId?: string | null) {
  loading.value = true

  try {
    const response = await $fetch<AuditTrailListResponse>('/api/admin/audit-trail', {
      query: buildQuery(),
    })

    events.value = response.items
    nextCursor.value = response.nextCursor
    const nextEventId =
      preferredEventId && response.items.some((item) => item.eventId === preferredEventId)
        ? preferredEventId
        : response.items[0]?.eventId || null

    if (nextEventId) {
      await loadDetail(nextEventId)
    } else {
      detail.value = null
      selectedEventId.value = null
    }

    feedback.value = null
  } catch (error) {
    events.value = []
    detail.value = null
    selectedEventId.value = null
    nextCursor.value = null
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load the audit trail.'),
    }
  } finally {
    loading.value = false
  }
}

async function loadMoreEvents() {
  if (!nextCursor.value || loadingMore.value) {
    return
  }

  loadingMore.value = true

  try {
    const response = await $fetch<AuditTrailListResponse>('/api/admin/audit-trail', {
      query: { ...buildQuery(), cursor: nextCursor.value },
    })

    events.value = [...events.value, ...response.items]
    nextCursor.value = response.nextCursor
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load more audit events.'),
    }
  } finally {
    loadingMore.value = false
  }
}

async function refreshAuditTrail(preferredEventId?: string | null) {
  await Promise.all([loadSummary(), loadEvents(preferredEventId)])
}

async function selectEvent(eventId: string, nextMobileTab?: 'events' | 'detail') {
  if (nextMobileTab) {
    mobileTab.value = nextMobileTab
  }

  await loadDetail(eventId)
}

async function applyGroup(key: FilterGroupKey) {
  activeGroup.value = key
  const group = auditTrailFilterGroups.find((item) => item.key === key)
  filters.value.entityType = group?.entityType || ''
  await refreshAuditTrail(selectedEventId.value)
}

async function resetFilters() {
  activeGroup.value = 'all'
  filters.value = {
    actionType: '',
    entityType: '',
    search: '',
    actorId: '',
    dateFrom: '',
    dateTo: '',
  }

  await refreshAuditTrail(selectedEventId.value)
}

watch(
  () => filters.value.actionType,
  async () => {
    await refreshAuditTrail(selectedEventId.value)
  },
)

if (import.meta.client) {
  const syncViewport = () => {
    isDesktop.value = window.innerWidth >= 1024
  }

  onMounted(() => {
    syncViewport()
    window.addEventListener('resize', syncViewport)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncViewport)
  })

  await waitForSession()

  if (!loggedIn.value) {
    await navigateTo('/auth')
  } else {
    await refreshAuditTrail()
  }
}
</script>

<template>
  <main
    :data-testid="auditTrailTestIds.page"
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,_#06111f_0%,_#0b1728_48%,_#111827_100%)] px-4 py-6 text-slate-100 md:px-6"
  >
    <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside
        class="rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
          Trust Operations
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-white">Audit trail</h1>
        <p class="mt-3 text-sm leading-6 text-slate-300">
          Review governed changes without crossing the user-facing trust boundary.
        </p>

        <nav class="mt-6 space-y-2">
          <NuxtLink
            v-for="link in adminNavigationLinks"
            :key="link.href"
            :to="link.href"
            class="flex items-center justify-between rounded-2xl px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            :class="
              link.href === '/admin/audit-trail'
                ? 'bg-cyan-400/10 text-white ring-1 ring-cyan-300/20'
                : ''
            "
          >
            <span>{{ link.label }}</span>
            <ShieldEllipsis
              v-if="link.href === '/admin/audit-trail'"
              class="h-4 w-4 text-cyan-200"
            />
          </NuxtLink>
        </nav>

        <SignOutButton class="mt-6" />
      </aside>

      <section :data-testid="auditTrailTestIds.panel" class="space-y-5">
        <header
          :data-testid="auditTrailTestIds.summaryBar"
          class="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/55 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur md:grid-cols-4"
        >
          <div class="rounded-2xl bg-white/5 px-4 py-4">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Events today</p>
            <p class="mt-3 text-3xl font-semibold text-white">
              {{ summary?.eventsToday ?? '0' }}
            </p>
          </div>
          <div class="rounded-2xl bg-white/5 px-4 py-4">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Events this week</p>
            <p class="mt-3 text-3xl font-semibold text-white">
              {{ summary?.eventsThisWeek ?? '0' }}
            </p>
          </div>
          <div class="rounded-2xl bg-white/5 px-4 py-4">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Most active actor</p>
            <p class="mt-3 text-sm font-medium text-white">
              {{ summary?.mostActiveActor?.email || 'No audit activity yet' }}
            </p>
            <p class="mt-1 text-xs text-slate-400">
              {{ summary?.mostActiveActor?.eventCount || 0 }} recorded events
            </p>
          </div>
          <div class="rounded-2xl bg-white/5 px-4 py-4">
            <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Most changed scope</p>
            <p class="mt-3 text-sm font-medium text-white">
              {{ summary ? formatAuditEntityLabel(summary.mostChangedEntityType) : 'Governance' }}
            </p>
          </div>
        </header>

        <section
          :data-testid="auditTrailTestIds.filterRibbon"
          class="rounded-[28px] border border-white/10 bg-slate-950/55 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur"
        >
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="group in auditTrailFilterGroups"
              :key="group.key"
              variant="outline"
              class="rounded-full border-white/10 bg-white/5 text-slate-100 hover:bg-cyan-400/10 hover:text-white"
              :class="
                activeGroup === group.key ? 'border-cyan-300/30 bg-cyan-400/15 text-cyan-50' : ''
              "
              @click="applyGroup(group.key)"
            >
              {{ group.label }}
            </Button>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label class="space-y-2 text-sm text-slate-300">
              <span>Action type</span>
              <select
                v-model="filters.actionType"
                class="h-11 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 text-sm text-white outline-none ring-0"
              >
                <option
                  v-for="option in auditTrailActionOptions"
                  :key="option.label"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="space-y-2 text-sm text-slate-300">
              <span>Search</span>
              <div class="relative">
                <Search
                  class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                />
                <Input
                  v-model="filters.search"
                  class="h-11 rounded-2xl border-white/10 bg-slate-900/80 pl-10 text-white placeholder:text-slate-400"
                  placeholder="Entity, actor, or reason"
                  @change="refreshAuditTrail(selectedEventId)"
                />
              </div>
            </label>

            <label class="space-y-2 text-sm text-slate-300">
              <span>Actor filter</span>
              <Input
                v-model="filters.actorId"
                class="h-11 rounded-2xl border-white/10 bg-slate-900/80 text-white placeholder:text-slate-400"
                placeholder="Actor user id"
                @change="refreshAuditTrail(selectedEventId)"
              />
            </label>

            <label class="space-y-2 text-sm text-slate-300">
              <span>Date from</span>
              <Input
                v-model="filters.dateFrom"
                type="date"
                class="h-11 rounded-2xl border-white/10 bg-slate-900/80 text-white"
                @change="refreshAuditTrail(selectedEventId)"
              />
            </label>

            <div class="grid gap-3 sm:grid-cols-[1fr_auto] xl:grid-cols-1">
              <label class="space-y-2 text-sm text-slate-300">
                <span>Date to</span>
                <Input
                  v-model="filters.dateTo"
                  type="date"
                  class="h-11 rounded-2xl border-white/10 bg-slate-900/80 text-white"
                  @change="refreshAuditTrail(selectedEventId)"
                />
              </label>
              <Button
                variant="outline"
                class="self-end rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                @click="resetFilters"
              >
                <TimerReset class="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </section>

        <p
          v-if="feedback"
          class="rounded-2xl px-4 py-3 text-sm"
          :class="
            feedback.tone === 'error'
              ? 'bg-rose-500/15 text-rose-100'
              : 'bg-emerald-500/15 text-emerald-100'
          "
        >
          {{ feedback.message }}
        </p>

        <div class="hidden gap-5 lg:grid lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.35fr)]">
          <section
            :data-testid="isDesktop ? auditTrailTestIds.eventList : undefined"
            class="rounded-[28px] border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-slate-950/20"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-white">Governed events</h2>
              <span class="text-xs uppercase tracking-[0.16em] text-slate-400">
                {{ events.length }} visible
              </span>
            </div>

            <div class="mt-4 space-y-3">
              <button
                v-for="item in events"
                :key="item.eventId"
                type="button"
                :data-testid="isDesktop ? auditTrailTestIds.eventRow : undefined"
                class="w-full rounded-3xl border px-4 py-4 text-left transition"
                :class="
                  selectedEventId === item.eventId
                    ? 'border-cyan-300/30 bg-cyan-400/10'
                    : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                "
                @click="selectEvent(item.eventId)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <span
                        class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1"
                        :class="auditBadgeTone(item.entityType)"
                      >
                        {{ formatAuditEntityLabel(item.entityType) }}
                      </span>
                      <span class="text-xs uppercase tracking-[0.16em] text-slate-500">
                        {{ formatAuditActionLabel(item.actionType) }}
                      </span>
                    </div>
                    <p class="mt-3 text-sm font-medium text-white">
                      {{ item.entityLabel }}
                    </p>
                    <p class="mt-1 text-sm text-slate-300">
                      {{ item.changeSummary }}
                    </p>
                  </div>
                  <ShieldCheck class="mt-1 h-4 w-4 shrink-0 text-cyan-200/80" />
                </div>
                <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span>{{ item.actorEmail || item.actorUserId }}</span>
                  <span>{{ formatAuditTimestamp(item.timestamp) }}</span>
                </div>
              </button>

              <div
                v-if="!loading && events.length === 0"
                class="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-400"
              >
                No audit events matched the current filters.
              </div>

              <Button
                v-if="nextCursor && !loading"
                variant="outline"
                class="mt-3 w-full rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                :disabled="loadingMore"
                @click="loadMoreEvents"
              >
                {{ loadingMore ? 'Loading…' : 'Load more events' }}
              </Button>
            </div>
          </section>

          <section
            :data-testid="isDesktop ? auditTrailTestIds.detailPanel : undefined"
            class="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-slate-950/20"
          >
            <template v-if="selectedEvent">
              <div class="flex flex-wrap items-center gap-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1"
                  :class="auditBadgeTone(selectedEvent.entityType)"
                >
                  {{ formatAuditEntityLabel(selectedEvent.entityType) }}
                </span>
                <p class="text-lg font-semibold text-white">
                  {{ selectedEvent.entityLabel }}
                </p>
              </div>

              <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-2xl bg-white/[0.04] px-4 py-4">
                  <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Actor</p>
                  <p class="mt-2 text-sm text-white">
                    {{ selectedEvent.actorEmail || selectedEvent.actorUserId }}
                  </p>
                </div>
                <div class="rounded-2xl bg-white/[0.04] px-4 py-4">
                  <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Action</p>
                  <p class="mt-2 text-sm text-white">
                    {{ formatAuditActionLabel(selectedEvent.actionType) }}
                  </p>
                </div>
                <div class="rounded-2xl bg-white/[0.04] px-4 py-4">
                  <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Timestamp</p>
                  <p class="mt-2 text-sm text-white">
                    {{ formatAuditTimestamp(selectedEvent.timestamp) }}
                  </p>
                </div>
                <div class="rounded-2xl bg-white/[0.04] px-4 py-4">
                  <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Reason</p>
                  <p class="mt-2 text-sm text-white">
                    {{ selectedEvent.reason || 'No explicit reason captured' }}
                  </p>
                </div>
              </div>

              <section
                :data-testid="isDesktop ? auditTrailTestIds.diffPanel : undefined"
                class="mt-5 grid gap-4 xl:grid-cols-2"
              >
                <div class="rounded-3xl bg-slate-900/80 p-4">
                  <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Before</p>
                  <pre
                    class="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200"
                    >{{ formatAuditJson(selectedEvent.changeContext.before) }}</pre>
                </div>
                <div class="rounded-3xl bg-slate-900/80 p-4">
                  <p class="text-xs uppercase tracking-[0.16em] text-slate-500">After</p>
                  <pre
                    class="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200"
                    >{{ formatAuditJson(selectedEvent.changeContext.after) }}</pre>
                </div>
              </section>

              <section class="mt-5 rounded-3xl bg-white/[0.04] p-4">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Related events</p>
                <div class="mt-3 space-y-3">
                  <div
                    v-for="related in selectedEvent.relatedEvents"
                    :key="related.eventId"
                    class="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/70 px-4 py-3 text-sm"
                  >
                    <div>
                      <p class="text-white">
                        {{ formatAuditActionLabel(related.actionType) }}
                      </p>
                      <p class="text-slate-400">
                        {{ related.entityLabel }}
                      </p>
                    </div>
                    <span class="text-xs text-slate-500">
                      {{ formatAuditTimestamp(related.timestamp) }}
                    </span>
                  </div>
                  <p v-if="selectedEvent.relatedEvents.length === 0" class="text-sm text-slate-400">
                    No adjacent governed events for this entity yet.
                  </p>
                </div>
              </section>
            </template>

            <div
              v-else
              class="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-slate-400"
            >
              Select an event to inspect its governed change context.
            </div>
          </section>
        </div>

        <Tabs v-model="mobileTab" class="lg:hidden">
          <TabsList
            :data-testid="auditTrailTestIds.mobileTabs"
            class="grid h-auto w-full grid-cols-2 rounded-2xl bg-slate-950/70 p-1"
          >
            <TabsTrigger
              :data-testid="auditTrailTestIds.mobileEventsTab"
              value="events"
              class="rounded-xl py-3 text-sm data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-50"
            >
              Events
            </TabsTrigger>
            <TabsTrigger
              :data-testid="auditTrailTestIds.mobileDetailTab"
              value="detail"
              class="rounded-xl py-3 text-sm data-[state=active]:bg-cyan-400/15 data-[state=active]:text-cyan-50"
            >
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" class="mt-4 space-y-4">
            <section
              :data-testid="!isDesktop ? auditTrailTestIds.eventList : undefined"
              class="rounded-[28px] border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-slate-950/20"
            >
              <div class="space-y-3">
                <button
                  v-for="item in events"
                  :key="item.eventId"
                  type="button"
                  :data-testid="!isDesktop ? auditTrailTestIds.eventRow : undefined"
                  class="w-full rounded-3xl border px-4 py-4 text-left transition"
                  :class="
                    selectedEventId === item.eventId
                      ? 'border-cyan-300/30 bg-cyan-400/10'
                      : 'border-white/5 bg-white/[0.03]'
                  "
                  @click="selectEvent(item.eventId, 'detail')"
                >
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1"
                      :class="auditBadgeTone(item.entityType)"
                    >
                      {{ formatAuditEntityLabel(item.entityType) }}
                    </span>
                    <span class="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {{ formatAuditActionLabel(item.actionType) }}
                    </span>
                  </div>
                  <p class="mt-3 text-sm font-medium text-white">
                    {{ item.entityLabel }}
                  </p>
                  <p class="mt-1 text-sm text-slate-300">
                    {{ item.changeSummary }}
                  </p>
                  <p class="mt-3 text-xs text-slate-400">
                    {{ formatAuditTimestamp(item.timestamp) }}
                  </p>
                </button>
              </div>

              <Button
                v-if="nextCursor && !loading"
                variant="outline"
                class="mt-3 w-full rounded-2xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 hover:text-white"
                :disabled="loadingMore"
                @click="loadMoreEvents"
              >
                {{ loadingMore ? 'Loading…' : 'Load more events' }}
              </Button>
            </section>
          </TabsContent>

          <TabsContent value="detail" class="mt-4">
            <section
              :data-testid="!isDesktop ? auditTrailTestIds.detailPanel : undefined"
              class="rounded-[28px] border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-slate-950/20"
            >
              <template v-if="selectedEvent">
                <p class="text-lg font-semibold text-white">
                  {{ selectedEvent.entityLabel }}
                </p>
                <p class="mt-2 text-sm text-slate-300">
                  {{ formatAuditActionLabel(selectedEvent.actionType) }}
                </p>
                <section
                  :data-testid="!isDesktop ? auditTrailTestIds.diffPanel : undefined"
                  class="mt-4 space-y-3"
                >
                  <div class="rounded-3xl bg-slate-900/80 p-4">
                    <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Before</p>
                    <pre
                      class="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200"
                      >{{ formatAuditJson(selectedEvent.changeContext.before) }}</pre>
                  </div>
                  <div class="rounded-3xl bg-slate-900/80 p-4">
                    <p class="text-xs uppercase tracking-[0.16em] text-slate-500">After</p>
                    <pre
                      class="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-slate-200"
                      >{{ formatAuditJson(selectedEvent.changeContext.after) }}</pre>
                  </div>
                </section>
              </template>
              <p v-else class="text-sm text-slate-400">
                Choose an event from the Events tab to inspect the governed diff.
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  </main>
</template>
