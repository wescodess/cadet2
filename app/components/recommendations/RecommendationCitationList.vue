<script setup lang="ts">
import type { RecommendationCitation } from '~/lib/recommendations/citations'

import { getRecommendationCitationSourceTypeLabel } from '~/lib/recommendations/citations'

const props = defineProps<{
  citations: RecommendationCitation[]
}>()

const openCitationIds = ref<string[]>([])
const retrievalDateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
})

function freshnessLabel(freshness: RecommendationCitation['freshness']) {
  if (freshness === 'fresh') {
    return 'Fresh source'
  }

  if (freshness === 'stale') {
    return 'Stale source'
  }

  return 'Unknown freshness'
}

function formatRetrievalDate(value: string) {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    return 'Retrieval date unavailable'
  }

  return retrievalDateFormatter.format(new Date(timestamp))
}

function isCitationOpen(citationId: string) {
  return openCitationIds.value.includes(citationId)
}

function toggleCitation(citationId: string) {
  if (isCitationOpen(citationId)) {
    openCitationIds.value = openCitationIds.value.filter(id => id !== citationId)
    return
  }

  openCitationIds.value = [...openCitationIds.value, citationId]
}
</script>

<template>
  <section
    data-testid="recommendation-citation-list"
    class="space-y-3 rounded-xl border border-slate-200 bg-white/85 p-3"
    aria-label="Recommendation citations"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Citations
      </p>
      <p class="text-sm text-slate-700">
        Inspect the claim-level source context attached to this recommendation.
      </p>
    </div>

    <p
      v-if="props.citations.length === 0"
      class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600"
    >
      No citations are attached to this recommendation yet. Review the trust label and caveat text before acting.
    </p>

    <div
      v-else
      class="space-y-3"
    >
      <section
        v-for="citation in props.citations"
        :key="citation.citationId"
        class="rounded-xl border border-slate-200 bg-white"
      >
        <div class="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
          <button
            :aria-controls="`${citation.citationId}-source-context`"
            :aria-expanded="isCitationOpen(citation.citationId)"
            class="min-h-[44px] flex-1 rounded-xl text-left outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--trust,#2563eb)]/25"
            data-testid="citation-item"
            type="button"
            @click="toggleCitation(citation.citationId)"
          >
            <div class="space-y-3">
              <p class="text-sm font-semibold text-slate-950">
                {{ citation.claimText }}
              </p>
              <div class="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
                  {{ getRecommendationCitationSourceTypeLabel(citation.sourceType) }}
                </span>
                <span class="font-medium text-slate-800">
                  {{ citation.sourceTitle }}
                </span>
                <span>
                  {{ freshnessLabel(citation.freshness) }}
                </span>
              </div>
            </div>
          </button>

          <a
            :href="citation.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--trust,#2563eb)]/20 bg-white px-3 py-2 font-medium text-[var(--trust,#2563eb)] underline-offset-4 transition hover:underline focus-visible:ring-[3px] focus-visible:ring-[var(--trust,#2563eb)]/25 focus-visible:outline-none"
          >
            Open source
          </a>
        </div>

        <div
          v-if="isCitationOpen(citation.citationId)"
          :id="`${citation.citationId}-source-context`"
          class="px-3 pb-3"
        >
          <div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <p class="leading-relaxed text-slate-800">
              {{ citation.excerpt }}
            </p>

            <dl class="grid gap-2 text-xs text-slate-600 md:grid-cols-2">
              <div>
                <dt class="font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Retrieved
                </dt>
                <dd class="mt-1 text-sm text-slate-800">
                  {{ formatRetrievalDate(citation.retrievalDate) }}
                </dd>
              </div>
              <div>
                <dt class="font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Source URL
                </dt>
                <dd class="mt-1 break-all text-sm text-slate-800">
                  {{ citation.sourceUrl }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
