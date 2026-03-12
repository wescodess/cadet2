<script setup lang="ts">
import type { TrustChange } from '~~/shared/types/recommendation-run-comparison'

const props = defineProps<{
  trustChanges: TrustChange[]
}>()
</script>

<template>
  <Card
    data-testid="trust-evidence-section"
    class="gap-4 rounded-3xl border-slate-200 bg-white px-5 py-5"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Trust and evidence
      </p>
      <h3 class="text-lg font-semibold text-slate-950">
        Evidence freshness and confidence shifts
      </h3>
    </div>

    <div
      v-if="props.trustChanges.length === 0"
      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
    >
      Trust metadata stayed stable between these runs.
    </div>

    <Accordion
      v-else
      type="multiple"
      class="space-y-3"
    >
      <AccordionItem
        v-for="trustChange in props.trustChanges"
        :key="trustChange.pathwayId"
        :value="trustChange.pathwayId"
        class="rounded-2xl border border-slate-200 bg-slate-50 px-4"
      >
        <AccordionTrigger class="py-3 text-left text-sm font-semibold text-slate-900 hover:no-underline">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span>{{ trustChange.pathwayName }}</span>
            <span class="text-xs font-medium text-slate-500">
              Citations {{ trustChange.beforeCitationCount }} → {{ trustChange.afterCitationCount }}
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent class="pb-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              Confidence: {{ trustChange.beforeConfidence }} → {{ trustChange.afterConfidence }}
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              Freshness: {{ trustChange.beforeFreshness }} → {{ trustChange.afterFreshness }}
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              Added citations: {{ trustChange.addedCitationCount }}
            </div>
            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              Trust boundary: {{ trustChange.beforeTrustBoundary }} → {{ trustChange.afterTrustBoundary }}
            </div>
          </div>

          <div class="mt-3 grid gap-3 lg:grid-cols-2">
            <section class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-950">
              <p class="font-semibold">
                Added evidence references
              </p>
              <ul v-if="trustChange.addedEvidence.length > 0" class="mt-3 space-y-3">
                <li
                  v-for="evidence in trustChange.addedEvidence"
                  :key="`${trustChange.pathwayId}-added-${evidence.citationId}`"
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
                  <p class="text-xs text-emerald-900/80">
                    {{ evidence.freshness }} · Retrieved {{ evidence.retrievalDate }}
                  </p>
                </li>
              </ul>
              <p v-else class="mt-3 text-xs text-emerald-900/80">
                No new evidence references were added.
              </p>
            </section>

            <section class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
              <p class="font-semibold">
                Removed evidence references
              </p>
              <ul v-if="trustChange.removedEvidence.length > 0" class="mt-3 space-y-3">
                <li
                  v-for="evidence in trustChange.removedEvidence"
                  :key="`${trustChange.pathwayId}-removed-${evidence.citationId}`"
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
                  <p class="text-xs text-amber-900/80">
                    {{ evidence.freshness }} · Retrieved {{ evidence.retrievalDate }}
                  </p>
                </li>
              </ul>
              <p v-else class="mt-3 text-xs text-amber-900/80">
                No evidence references were removed.
              </p>
            </section>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </Card>
</template>
