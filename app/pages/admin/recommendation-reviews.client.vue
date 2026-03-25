<script setup lang="ts">
import { computed, ref } from 'vue'

import CitationIntegrityCard from '@/components/admin/CitationIntegrityCard.vue'
import CorrectiveActionConfirmation from '@/components/admin/CorrectiveActionConfirmation.vue'
import RecommendationRunListItem from '@/components/admin/RecommendationRunListItem.vue'
import ReviewStateFilter from '@/components/admin/ReviewStateFilter.vue'
import TrustScoreIndicator from '@/components/admin/TrustScoreIndicator.vue'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { adminNavigationLinks } from '@/lib/admin/navigation'
import {
  DEFAULT_RECOMMENDATION_REVIEW_CITATION_FLAG_REASON,
  DEFAULT_RECOMMENDATION_REVIEW_RUN_DISMISS_REASON,
  DEFAULT_RECOMMENDATION_REVIEW_RUN_FLAG_REASON,
  DEFAULT_RECOMMENDATION_REVIEW_RUN_RESOLVE_REASON,
  DEFAULT_RECOMMENDATION_REVIEW_SOURCE_PAUSE_NOTE,
  formatRecommendationReviewState,
  recommendationReviewTestIds,
  type RecommendationReviewCitation,
  type RecommendationReviewFilterKey,
  type RecommendationReviewListResponse,
  type RecommendationReviewRunDetailResponse,
  type RecommendationReviewRunSummary,
} from '@/lib/admin/recommendationReviews'

type RunActionKind = 'flag-run' | 'resolve-run' | 'dismiss-run' | 'flag-citation' | 'pause-source'

type NuxtErrorLike = {
  statusMessage?: string
  data?: {
    statusMessage?: string
  }
}

type RunActionResponse = {
  ok: boolean
  reviewState: string
}

definePageMeta({
  middleware: ['auth', 'admin'],
})

const { loggedIn, waitForSession } = useUserSession()

const runs = ref<RecommendationReviewRunSummary[]>([])
const selectedRunId = ref<string | null>(null)
const detail = ref<RecommendationReviewRunDetailResponse | null>(null)
const loadingRuns = ref(false)
const loadingDetail = ref(false)
const actionPending = ref<RunActionKind | null>(null)
const feedback = ref<{ tone: 'success' | 'error', message: string } | null>(null)
const citationFilter = ref<RecommendationReviewFilterKey>('all')
const mobileTab = ref<'runs' | 'citations'>('runs')
const confirmation = ref<{
  citation?: RecommendationReviewCitation
  confirmLabel: string
  description: string
  kind: RunActionKind
  title: string
} | null>(null)

const selectedRun = computed(() => detail.value?.run || runs.value.find(run => run.runId === selectedRunId.value) || null)
const runCount = computed(() => runs.value.length)
const flaggedCount = computed(() => runs.value.filter(run => run.reviewState === 'flagged').length)
const weakCitationCount = computed(() => detail.value?.run.citationBuckets.weakSupport || 0)

const citationFilterCounts = computed(() => {
  const citations = detail.value?.citations || []

  return {
    all: citations.length,
    weak: citations.filter(citation => citation.supportStrength === 'weak' || citation.supportStrength === 'unsupported').length,
    stale: citations.filter(citation => citation.freshness === 'stale' || citation.freshness === 'expired').length,
    missing: citations.filter(citation => citation.supportStrength === 'unsupported').length,
  } satisfies Record<RecommendationReviewFilterKey, number>
})

const filteredCitations = computed(() => {
  const citations = detail.value?.citations || []

  if (citationFilter.value === 'weak') {
    return citations.filter(citation => citation.supportStrength === 'weak' || citation.supportStrength === 'unsupported')
  }

  if (citationFilter.value === 'stale') {
    return citations.filter(citation => citation.freshness === 'stale' || citation.freshness === 'expired')
  }

  if (citationFilter.value === 'missing') {
    return citations.filter(citation => citation.supportStrength === 'unsupported')
  }

  return citations
})

function resolveErrorMessage(error: unknown, fallback: string) {
  const typedError = error as NuxtErrorLike
  return typedError?.data?.statusMessage || typedError?.statusMessage || fallback
}

async function loadDetail(runId: string) {
  loadingDetail.value = true

  try {
    detail.value = await $fetch<RecommendationReviewRunDetailResponse>(`/api/admin/recommendation-reviews/${encodeURIComponent(runId)}`)
    selectedRunId.value = runId
    citationFilter.value = 'all'
  }
  catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load recommendation review detail.'),
    }
  }
  finally {
    loadingDetail.value = false
  }
}

async function loadRuns(preferredRunId?: string | null) {
  loadingRuns.value = true

  try {
    const response = await $fetch<RecommendationReviewListResponse>('/api/admin/recommendation-reviews')
    runs.value = response.items

    const nextRunId = preferredRunId && response.items.some(run => run.runId === preferredRunId)
      ? preferredRunId
      : response.items[0]?.runId || null

    if (nextRunId) {
      await loadDetail(nextRunId)
    }
    else {
      detail.value = null
      selectedRunId.value = null
    }

    feedback.value = null
  }
  catch (error) {
    runs.value = []
    detail.value = null
    selectedRunId.value = null
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load the recommendation review queue.'),
    }
  }
  finally {
    loadingRuns.value = false
  }
}

async function selectRun(runId: string, nextMobileTab?: 'runs' | 'citations') {
  if (nextMobileTab) {
    mobileTab.value = nextMobileTab
  }

  await loadDetail(runId)
}

function openConfirmation(kind: RunActionKind, citation?: RecommendationReviewCitation) {
  if (kind === 'flag-run') {
    confirmation.value = {
      kind,
      title: 'Flag run for review?',
      description: 'This keeps the recommendation run in a visible trust-review state until the evidence basis is corrected.',
      confirmLabel: 'Confirm flag run',
    }
    return
  }

  if (kind === 'resolve-run') {
    confirmation.value = {
      kind,
      title: 'Mark citations verified?',
      description: 'Use this only after the trust basis has been rechecked against the current evidence inventory.',
      confirmLabel: 'Confirm mark verified',
    }
    return
  }

  if (kind === 'dismiss-run') {
    confirmation.value = {
      kind,
      title: 'Dismiss this concern?',
      description: 'This records that the review issue is informational-only and should not block continued governance work.',
      confirmLabel: 'Confirm dismiss',
    }
    return
  }

  if (kind === 'flag-citation' && citation) {
    confirmation.value = {
      citation,
      kind,
      title: 'Flag citation support?',
      description: `${citation.sourceName} will be marked for follow-up so weak support is visible in the review workflow.`,
      confirmLabel: 'Confirm flag citation',
    }
    return
  }

  if (kind === 'pause-source' && citation) {
    confirmation.value = {
      citation,
      kind,
      title: 'Pause related source?',
      description: `${citation.sourceName} will stop participating in active governance support until an admin resumes it.`,
      confirmLabel: 'Pause related source',
    }
  }
}

async function runCorrectiveAction() {
  if (!confirmation.value || !selectedRunId.value) {
    return
  }

  const action = confirmation.value
  actionPending.value = action.kind

  try {
    if (action.kind === 'flag-run') {
      await $fetch<RunActionResponse>(`/api/admin/recommendation-reviews/${encodeURIComponent(selectedRunId.value)}/flag`, {
        method: 'POST',
        body: {
          reason: DEFAULT_RECOMMENDATION_REVIEW_RUN_FLAG_REASON,
        },
      })
    }
    else if (action.kind === 'resolve-run') {
      await $fetch<RunActionResponse>(`/api/admin/recommendation-reviews/${encodeURIComponent(selectedRunId.value)}/resolve`, {
        method: 'POST',
        body: {
          reason: DEFAULT_RECOMMENDATION_REVIEW_RUN_RESOLVE_REASON,
        },
      })
    }
    else if (action.kind === 'dismiss-run') {
      await $fetch<RunActionResponse>(`/api/admin/recommendation-reviews/${encodeURIComponent(selectedRunId.value)}/dismiss`, {
        method: 'POST',
        body: {
          reason: DEFAULT_RECOMMENDATION_REVIEW_RUN_DISMISS_REASON,
        },
      })
    }
    else if (action.kind === 'flag-citation' && action.citation) {
      await $fetch<RunActionResponse>(`/api/admin/recommendation-reviews/${encodeURIComponent(selectedRunId.value)}/citations/${encodeURIComponent(action.citation.citationId)}/flag`, {
        method: 'POST',
        body: {
          reason: DEFAULT_RECOMMENDATION_REVIEW_CITATION_FLAG_REASON,
        },
      })
    }
    else if (action.kind === 'pause-source' && action.citation) {
      await $fetch(`/api/admin/rag/sources/${encodeURIComponent(action.citation.sourceId)}/pause`, {
        method: 'POST',
        body: {
          note: DEFAULT_RECOMMENDATION_REVIEW_SOURCE_PAUSE_NOTE,
        },
      })
    }

    await loadRuns(selectedRunId.value)
    feedback.value = {
      tone: 'success',
      message: action.kind === 'pause-source'
        ? 'Related source paused from the recommendation review flow.'
        : 'Recommendation review state updated.',
    }
  }
  catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to complete the corrective action.'),
    }
  }
  finally {
    actionPending.value = null
    confirmation.value = null
  }
}

if (import.meta.client) {
  await waitForSession()

  if (!loggedIn.value) {
    await navigateTo('/auth')
  }
  else {
    await loadRuns()
  }
}
</script>

<template>
  <main
    :data-testid="recommendationReviewTestIds.page"
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(35,76,118,0.14),_transparent_40%),linear-gradient(180deg,_#f7f8fa_0%,_#eef2f7_100%)] px-4 py-6 text-slate-900 md:px-6"
  >
    <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[#234c76]">
          Trust Operations
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-slate-950">
          Recommendation reviews
        </h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Inspect citation integrity, isolate weak support, and trigger governed corrective actions before recommendation trust drifts.
        </p>

        <dl class="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">
              Runs
            </dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ runCount }}
            </dd>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">
              Flagged
            </dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ flaggedCount }}
            </dd>
          </div>
        </dl>

        <nav class="mt-6 space-y-2" aria-label="Admin navigation">
          <NuxtLink
            v-for="link in adminNavigationLinks"
            :key="link.href"
            :to="link.href"
            class="flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition"
            :class="link.href === '/admin/recommendation-reviews'
              ? 'border-[#234c76]/20 bg-[#edf4fb] text-[#1f4469]'
              : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'"
          >
            <span>{{ link.label }}</span>
            <span class="text-xs uppercase tracking-[0.16em] text-slate-400">
              {{ link.href === '/admin/recommendation-reviews' ? 'Live' : 'Link' }}
            </span>
          </NuxtLink>
        </nav>
      </aside>

      <section class="space-y-5">
        <header class="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[#234c76]">
                Admin-only governance surface
              </p>
              <h2 class="text-3xl font-semibold text-slate-950">
                Citation integrity inspector
              </h2>
              <p class="max-w-3xl text-sm leading-6 text-slate-600">
                Review recommendation run trust as a queue on the left and inspect citation-level support, freshness, and corrective-action scope on the right.
              </p>
            </div>
            <Button variant="outline" :disabled="loadingRuns || loadingDetail" @click="loadRuns(selectedRunId)">
              {{ loadingRuns || loadingDetail ? 'Refreshing…' : 'Refresh review queue' }}
            </Button>
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

        <section
          :data-testid="recommendationReviewTestIds.panel"
          class="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5"
        >
          <Tabs v-model="mobileTab" class="gap-4 md:hidden">
            <TabsList
              :data-testid="recommendationReviewTestIds.mobileTabs"
              class="grid h-auto grid-cols-2 rounded-[1.2rem] bg-slate-100 p-1"
            >
              <TabsTrigger :data-testid="recommendationReviewTestIds.mobileRunTab" value="runs">
                Runs
              </TabsTrigger>
              <TabsTrigger :data-testid="recommendationReviewTestIds.mobileCitationTab" value="citations">
                Citations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="runs" class="space-y-3">
              <div :data-testid="recommendationReviewTestIds.runList" class="space-y-3">
                <RecommendationRunListItem
                  v-for="item in runs"
                  :key="item.runId"
                  :item="item"
                  :selected="item.runId === selectedRunId"
                  @select="runId => selectRun(runId, 'citations')"
                />
              </div>
            </TabsContent>

            <TabsContent value="citations" class="space-y-4">
              <div v-if="selectedRun" class="space-y-4">
                <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Active run
                      </p>
                      <p class="mt-2 text-lg font-semibold text-slate-950">
                        {{ selectedRun.anonymizedSubject }}
                      </p>
                    </div>
                    <TrustScoreIndicator :score="selectedRun.trustScore" />
                  </div>
                </div>

                <ReviewStateFilter
                  v-model="citationFilter"
                  :counts="citationFilterCounts"
                />

                <div class="space-y-3">
                  <CitationIntegrityCard
                    v-for="citation in filteredCitations"
                    :key="citation.citationId"
                    :citation="citation"
                    @flag="openConfirmation('flag-citation', citation)"
                    @pause-source="openConfirmation('pause-source', citation)"
                  />
                </div>
              </div>
              <div v-else class="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-600">
                Select a recommendation run to inspect its trust basis.
              </div>
            </TabsContent>
          </Tabs>

          <div class="hidden gap-5 md:grid md:grid-cols-[minmax(280px,0.34fr)_minmax(0,0.66fr)]">
            <div class="space-y-3">
              <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Review queue
                </p>
                <p class="mt-2 text-sm leading-6 text-slate-600">
                  Compare trust score, freshness, and review state before drilling into citation integrity.
                </p>
              </div>

              <div :data-testid="recommendationReviewTestIds.runList" class="space-y-3">
                <RecommendationRunListItem
                  v-for="item in runs"
                  :key="item.runId"
                  :item="item"
                  :selected="item.runId === selectedRunId"
                  @select="selectRun"
                />
              </div>
            </div>

            <div class="space-y-4">
              <div v-if="selectedRun && detail" class="space-y-4">
                <header class="rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(135deg,_rgba(35,76,118,0.08),_rgba(77,122,114,0.12))] p-5">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div class="space-y-2">
                      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Selected review run
                      </p>
                      <h3 class="text-2xl font-semibold text-slate-950">
                        {{ detail.run.subjectReference.label }}
                      </h3>
                      <p class="max-w-2xl text-sm leading-6 text-slate-600">
                        {{ detail.run.citationBuckets.all }} reviewable citations with {{ weakCitationCount }} weak or unsupported items currently surfaced.
                      </p>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                      <TrustScoreIndicator :score="detail.run.trustScore" />
                      <span
                        :data-testid="recommendationReviewTestIds.reviewStateBadge"
                        class="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                        :class="detail.run.reviewState === 'flagged'
                          ? 'border-rose-500/25 bg-rose-500/10 text-rose-700'
                          : detail.run.reviewState === 'resolved'
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
                            : detail.run.reviewState === 'dismissed'
                              ? 'border-slate-300 bg-slate-100 text-slate-700'
                              : 'border-amber-500/25 bg-amber-500/15 text-amber-700'"
                      >
                        {{ formatRecommendationReviewState(detail.run.reviewState) }}
                      </span>
                    </div>
                  </div>

                  <div class="mt-5 grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
                    <div class="rounded-[1.3rem] border border-white/60 bg-white/80 px-4 py-3">
                      <p class="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Strong signals
                      </p>
                      <p class="mt-1 text-2xl font-semibold text-slate-950">
                        {{ detail.run.trustSignals.strong }}
                      </p>
                    </div>
                    <div class="rounded-[1.3rem] border border-white/60 bg-white/80 px-4 py-3">
                      <p class="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Watch list
                      </p>
                      <p class="mt-1 text-2xl font-semibold text-slate-950">
                        {{ detail.run.trustSignals.watch }}
                      </p>
                    </div>
                    <div class="rounded-[1.3rem] border border-white/60 bg-white/80 px-4 py-3">
                      <p class="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Gaps
                      </p>
                      <p class="mt-1 text-2xl font-semibold text-slate-950">
                        {{ detail.run.trustSignals.gaps }}
                      </p>
                    </div>
                  </div>

                  <div class="mt-5 flex flex-wrap gap-2">
                    <Button :data-testid="recommendationReviewTestIds.runFlagButton" @click="openConfirmation('flag-run')">
                      Flag run for review
                    </Button>
                    <Button variant="outline" @click="openConfirmation('resolve-run')">
                      Mark citations verified
                    </Button>
                    <Button variant="outline" @click="openConfirmation('dismiss-run')">
                      Dismiss concern
                    </Button>
                  </div>
                </header>

                <div v-if="detail.run.caveats.length" class="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Caveat list
                  </p>
                  <ul class="mt-3 space-y-2">
                    <li v-for="caveat in detail.run.caveats" :key="caveat">
                      {{ caveat }}
                    </li>
                  </ul>
                </div>

                <ReviewStateFilter
                  v-model="citationFilter"
                  :counts="citationFilterCounts"
                />

                <div class="space-y-4">
                  <CitationIntegrityCard
                    v-for="citation in filteredCitations"
                    :key="citation.citationId"
                    :citation="citation"
                    @flag="openConfirmation('flag-citation', citation)"
                    @pause-source="openConfirmation('pause-source', citation)"
                  />
                </div>
              </div>

              <div v-else class="rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-sm text-slate-600">
                Select a recommendation run to inspect the citation integrity detail.
              </div>
            </div>
          </div>

          <div
            v-if="selectedRun"
            :data-testid="recommendationReviewTestIds.mobileActionBar"
            class="sticky bottom-0 z-10 mt-4 flex gap-2 rounded-[1.3rem] border border-slate-200 bg-white/95 p-3 shadow-lg md:hidden"
          >
            <Button class="flex-1" :data-testid="recommendationReviewTestIds.runFlagButton" @click="openConfirmation('flag-run')">
              Flag run
            </Button>
            <Button class="flex-1" variant="outline" @click="openConfirmation('resolve-run')">
              Verify
            </Button>
          </div>
        </section>
      </section>
    </div>

    <CorrectiveActionConfirmation
      :confirm-label="confirmation?.confirmLabel || 'Confirm'"
      :description="confirmation?.description || ''"
      :open="Boolean(confirmation)"
      :pending="Boolean(actionPending)"
      :title="confirmation?.title || 'Confirm action'"
      @cancel="confirmation = null"
      @confirm="runCorrectiveAction"
    />
  </main>
</template>
