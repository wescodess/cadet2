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

const currentIndex = computed(() =>
  props.sections.findIndex((section) => section.id === props.currentSection),
)

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
  <div data-testid="intake-progress">
    <!-- Desktop Stepper -->
    <div class="hidden md:flex items-center justify-between">
      <template v-for="(section, index) in sections" :key="`desktop-${section.id}`">
        <div class="group flex items-center gap-2">
          <div
            class="flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors"
            :class="[
              getStepStatus(section.id, index) === 'current'
                ? 'bg-primary text-primary-foreground'
                : getStepStatus(section.id, index) === 'complete'
                  ? 'border-2 border-primary bg-white text-primary'
                  : 'border-2 border-slate-200 bg-white text-slate-400',
            ]"
          >
            {{ index + 1 }}
          </div>
          <span
            class="text-sm transition-colors"
            :class="[
              getStepStatus(section.id, index) === 'current'
                ? 'font-bold text-primary'
                : getStepStatus(section.id, index) === 'complete'
                  ? 'font-bold text-slate-900'
                  : 'font-medium text-slate-400 group-hover:text-slate-600',
            ]"
          >
            {{ section.label }}
          </span>
        </div>
        <div
          v-if="index < sections.length - 1"
          class="mx-4 h-px flex-1 transition-colors"
          :class="getStepStatus(section.id, index) === 'complete' ? 'bg-primary' : 'bg-slate-200'"
        ></div>
      </template>
    </div>

    <!-- Mobile Segmented Bar -->
    <div class="md:hidden">
      <div class="flex items-center justify-between space-x-1">
        <div
          v-for="(section, index) in sections"
          :key="`mobile-${section.id}`"
          class="flex flex-1 flex-col items-center"
        >
          <div
            class="mb-2 h-1 w-full rounded-full transition-colors"
            :class="[
              getStepStatus(section.id, index) === 'current'
                ? 'bg-primary'
                : getStepStatus(section.id, index) === 'complete'
                  ? 'bg-primary opacity-50'
                  : 'bg-slate-200',
            ]"
          ></div>
          <span
            class="text-[10px] sm:text-xs transition-colors"
            :class="[
              getStepStatus(section.id, index) === 'current'
                ? 'font-semibold text-primary'
                : getStepStatus(section.id, index) === 'complete'
                  ? 'font-medium text-slate-700'
                  : 'font-medium text-slate-400',
            ]"
          >
            {{ section.label }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
