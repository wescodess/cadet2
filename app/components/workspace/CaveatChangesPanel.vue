<script setup lang="ts">
import type { RecommendationRunComparisonCaveat } from '~~/shared/types/recommendation-run-comparison'

import { AlertTriangle, CheckCircle2 } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  addedCaveats: RecommendationRunComparisonCaveat[]
  removedCaveats: RecommendationRunComparisonCaveat[]
}>()

const hasChanges = computed(() => props.addedCaveats.length > 0 || props.removedCaveats.length > 0)
</script>

<template>
  <Card
    data-testid="caveat-changes-panel"
    class="gap-4 rounded-3xl border-slate-200 bg-white px-5 py-5"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Caveat changes
      </p>
      <h3 class="text-lg font-semibold text-slate-950">
        What changed in the trust caveats
      </h3>
    </div>

    <div
      v-if="!hasChanges"
      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
    >
      No caveat text changed between these runs.
    </div>

    <div v-else class="space-y-4">
      <Accordion
        type="multiple"
        class="space-y-3 md:hidden"
      >
        <AccordionItem value="added" class="rounded-2xl border border-amber-200 bg-amber-50 px-4">
          <AccordionTrigger class="py-3 text-sm font-semibold text-amber-900 hover:no-underline">
            New caveats ({{ props.addedCaveats.length }})
          </AccordionTrigger>
          <AccordionContent class="pb-4">
            <ul class="space-y-2">
              <li
                v-for="caveat in props.addedCaveats"
                :key="caveat.id"
                class="flex items-start gap-2 text-sm text-amber-950"
              >
                <AlertTriangle class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span><span class="font-semibold">{{ caveat.pathwayName }}:</span> {{ caveat.text }}</span>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="removed" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4">
          <AccordionTrigger class="py-3 text-sm font-semibold text-emerald-900 hover:no-underline">
            Resolved caveats ({{ props.removedCaveats.length }})
          </AccordionTrigger>
          <AccordionContent class="pb-4">
            <ul class="space-y-2">
              <li
                v-for="caveat in props.removedCaveats"
                :key="caveat.id"
                class="flex items-start gap-2 text-sm text-emerald-950"
              >
                <CheckCircle2 class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span><span class="font-semibold">{{ caveat.pathwayName }}:</span> {{ caveat.text }}</span>
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div class="hidden gap-4 md:grid">
        <section class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle class="size-4" aria-hidden="true" />
            <span>New caveats</span>
          </div>
          <ul class="space-y-2">
            <li
              v-for="caveat in props.addedCaveats"
              :key="caveat.id"
              class="text-sm text-amber-950"
            >
              <span class="font-semibold">{{ caveat.pathwayName }}:</span> {{ caveat.text }}
            </li>
          </ul>
        </section>

        <section class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div class="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 class="size-4" aria-hidden="true" />
            <span>Resolved caveats</span>
          </div>
          <ul class="space-y-2">
            <li
              v-for="caveat in props.removedCaveats"
              :key="caveat.id"
              class="text-sm text-emerald-950"
            >
              <span class="font-semibold">{{ caveat.pathwayName }}:</span> {{ caveat.text }}
            </li>
          </ul>
        </section>
      </div>
    </div>
  </Card>
</template>
