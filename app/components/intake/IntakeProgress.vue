<script setup lang="ts">
export type IntakeProgressSection = {
  id: string
  label: string
}

const props = defineProps<{
  sections: IntakeProgressSection[]
  currentSection: string
  sectionProgress: Record<string, boolean>
}>()

const currentIndex = computed(() => props.sections.findIndex(section => section.id === props.currentSection))
const completionPercent = computed(() => {
  if (props.sections.length === 0) {
    return 0
  }

  return Math.round(((currentIndex.value + 1) / props.sections.length) * 100)
})

function getStepStatus(sectionId: string, index: number) {
  if (sectionId === props.currentSection) {
    return 'current'
  }

  if (props.sectionProgress[sectionId] || index < currentIndex.value) {
    return 'complete'
  }

  return 'upcoming'
}
</script>

<template>
  <Card
    data-testid="intake-progress"
    class="border-slate-200 bg-white"
  >
    <CardHeader class="space-y-3 pb-3">
      <CardTitle class="text-base font-semibold text-slate-900">
        Guided Intake Progress
      </CardTitle>
      <CardDescription class="text-slate-600">
        Step {{ currentIndex + 1 }} of {{ sections.length }}
      </CardDescription>
      <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          class="h-full rounded-full bg-[var(--trust)] transition-[width] duration-300"
          :style="{ width: `${completionPercent}%` }"
          aria-hidden="true"
        />
      </div>
    </CardHeader>
    <CardContent>
      <ol class="grid gap-2 sm:grid-cols-2">
        <li
          v-for="(section, index) in sections"
          :key="section.id"
          class="flex items-center gap-2 rounded-lg border p-2 text-sm"
          :class="[
            getStepStatus(section.id, index) === 'current'
              ? 'border-[var(--trust)] bg-[var(--trust-soft)] text-[var(--trust)]'
              : getStepStatus(section.id, index) === 'complete'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 text-slate-500',
          ]"
        >
          <span
            class="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            :class="[
              getStepStatus(section.id, index) === 'current'
                ? 'bg-[var(--trust)] text-white'
                : getStepStatus(section.id, index) === 'complete'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600',
            ]"
          >
            {{ index + 1 }}
          </span>
          <span class="font-medium">{{ section.label }}</span>
        </li>
      </ol>
    </CardContent>
  </Card>
</template>
