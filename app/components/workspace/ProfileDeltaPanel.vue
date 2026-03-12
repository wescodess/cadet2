<script setup lang="ts">
import type { ProfileDeltaSummary } from '~~/shared/types/recommendation-run-comparison'

const props = defineProps<{
  profileDelta: ProfileDeltaSummary | null
}>()
</script>

<template>
  <Card
    data-testid="profile-delta-section"
    class="gap-4 rounded-3xl border-slate-200 bg-white px-5 py-5"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Profile changes
      </p>
      <h3 class="text-lg font-semibold text-slate-950">
        What changed in your saved profile
      </h3>
    </div>

    <div
      v-if="!props.profileDelta || props.profileDelta.changedFieldCount === 0"
      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
    >
      No preserved profile inputs changed between these runs.
    </div>

    <div v-else class="space-y-4">
      <p class="text-sm leading-relaxed text-slate-600">
        {{ props.profileDelta.summary }}
      </p>

      <div class="space-y-3">
        <div
          v-for="field in props.profileDelta.changedFields"
          :key="field.key"
          class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
        >
          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-900">
              {{ field.label }}
            </p>
            <div class="grid gap-3 md:grid-cols-2">
              <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                Before: {{ field.beforeValue }}
              </div>
              <div class="rounded-2xl border border-[var(--trust,#2563eb)]/15 bg-[var(--trust-soft,#dbeafe)]/35 px-4 py-3 text-sm text-slate-700">
                After: {{ field.afterValue }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
