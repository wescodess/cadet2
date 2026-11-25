<script setup lang="ts">
import type { PathwayChange } from '~~/shared/types/recommendation-run-comparison'

import {
  AlertTriangle,
  ArrowRight,
  MinusCircle,
  PlusCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-vue-next'
import { computed } from 'vue'

import {
  formatTierLabel,
  getPathwayChangePresentation,
  getRunComparisonToneClasses,
} from '~/lib/workspace/recommendation-run-comparison'

const props = defineProps<{
  change: PathwayChange
}>()

const presentation = computed(() => getPathwayChangePresentation(props.change))
const badgeClasses = computed(() => getRunComparisonToneClasses(presentation.value.tone))
const detailValue = computed(() => `trust-${props.change.pathwayId}`)
const hasTrustDiff = computed(() => Boolean(props.change.trustDiff))

const badgeIcon = computed(() => {
  if (props.change.changeType === 'added') {
    return PlusCircle
  }

  if (props.change.changeType === 'removed') {
    return MinusCircle
  }

  if (props.change.impact === 'declined') {
    return TrendingDown
  }

  if (props.change.impact === 'improved') {
    return TrendingUp
  }

  return AlertTriangle
})
</script>

<template>
  <Card
    :data-testid="`pathway-change-card-${props.change.pathwayId}`"
    class="gap-4 rounded-3xl border-slate-200 bg-white px-5 py-5"
  >
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="space-y-3">
        <div
          class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
          :class="badgeClasses"
        >
          <component :is="badgeIcon" class="size-3.5" aria-hidden="true" />
          <span>{{ presentation.label }}</span>
        </div>

        <div class="space-y-1">
          <h3 class="text-lg font-semibold text-slate-950">
            {{ props.change.pathwayName }}
          </h3>
          <p class="text-sm leading-relaxed text-slate-600">
            {{ props.change.reason }}
          </p>
        </div>
      </div>

      <div class="space-y-3 lg:text-right">
        <div
          v-if="props.change.beforeTier || props.change.afterTier"
          class="flex flex-wrap items-center gap-2 lg:justify-end"
        >
          <Badge
            variant="outline"
            class="rounded-full border-slate-300 bg-slate-100 text-slate-700"
          >
            {{ formatTierLabel(props.change.beforeTier) }}
          </Badge>
          <ArrowRight class="size-4 text-slate-400" aria-hidden="true" />
          <Badge variant="outline" class="rounded-full border-primary/20 bg-accent text-primary">
            {{ formatTierLabel(props.change.afterTier) }}
          </Badge>
        </div>

        <p
          v-if="props.change.beforeRank && props.change.afterRank"
          class="text-sm font-medium text-slate-600"
        >
          Rank #{{ props.change.beforeRank }} → #{{ props.change.afterRank }}
        </p>
      </div>
    </div>

    <Accordion
      type="single"
      collapsible
      class="w-full rounded-2xl border border-slate-200 bg-slate-50/80"
    >
      <AccordionItem :value="detailValue" class="border-b-0">
        <AccordionTrigger class="px-4 py-3 text-sm font-semibold text-slate-800 hover:no-underline">
          Trust metadata diff
        </AccordionTrigger>
        <AccordionContent class="px-4 pb-4">
          <div v-if="hasTrustDiff" class="grid gap-3 md:grid-cols-2">
            <div
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              Citation evidence: {{ props.change.trustDiff?.beforeCitationCount }} →
              {{ props.change.trustDiff?.afterCitationCount }}
            </div>
            <div
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              Confidence: {{ props.change.trustDiff?.beforeConfidence }} →
              {{ props.change.trustDiff?.afterConfidence }}
            </div>
            <div
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              Freshness: {{ props.change.trustDiff?.beforeFreshness }} →
              {{ props.change.trustDiff?.afterFreshness }}
            </div>
            <div
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              Trust boundary: {{ props.change.trustDiff?.beforeTrustBoundary }} →
              {{ props.change.trustDiff?.afterTrustBoundary }}
            </div>
          </div>

          <div v-if="hasTrustDiff" class="mt-3 grid gap-3 lg:grid-cols-2">
            <section
              class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950"
            >
              <p class="font-semibold">Added evidence</p>
              <ul v-if="props.change.trustDiff?.addedEvidence.length" class="mt-3 space-y-3">
                <li
                  v-for="evidence in props.change.trustDiff?.addedEvidence"
                  :key="`${props.change.pathwayId}-added-${evidence.citationId}`"
                  class="space-y-1"
                >
                  <p>{{ evidence.claimText }}</p>
                  <a
                    :href="evidence.sourceUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="text-xs font-medium underline underline-offset-2"
                  >
                    {{ evidence.sourceTitle }}
                  </a>
                </li>
              </ul>
              <p v-else class="mt-3 text-xs text-emerald-900/80">No added evidence references.</p>
            </section>

            <section
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950"
            >
              <p class="font-semibold">Removed evidence</p>
              <ul v-if="props.change.trustDiff?.removedEvidence.length" class="mt-3 space-y-3">
                <li
                  v-for="evidence in props.change.trustDiff?.removedEvidence"
                  :key="`${props.change.pathwayId}-removed-${evidence.citationId}`"
                  class="space-y-1"
                >
                  <p>{{ evidence.claimText }}</p>
                  <a
                    :href="evidence.sourceUrl"
                    target="_blank"
                    rel="noreferrer"
                    class="text-xs font-medium underline underline-offset-2"
                  >
                    {{ evidence.sourceTitle }}
                  </a>
                </li>
              </ul>
              <p v-else class="mt-3 text-xs text-amber-900/80">No removed evidence references.</p>
            </section>
          </div>

          <p
            v-else
            class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
          >
            Trust evidence stayed stable between these runs.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Card>
</template>
