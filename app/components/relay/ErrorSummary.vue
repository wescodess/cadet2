<script setup lang="ts">
import { CircleAlert } from 'lucide-vue-next'
import { onMounted, useTemplateRef } from 'vue'

import { cn } from '~/lib/utils'

const props = withDefaults(
  defineProps<{
    items: { text: string; target: string }[]
    title?: string
    autofocus?: boolean
    class?: string
  }>(),
  { title: 'There is a problem', autofocus: true, class: undefined },
)

const root = useTemplateRef<HTMLElement>('root')

function focusTarget(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  target.focus()
}

onMounted(() => {
  if (props.autofocus) root.value?.focus()
})

defineExpose({ focus: () => root.value?.focus() })
</script>

<template>
  <div
    ref="root"
    role="alert"
    tabindex="-1"
    :class="cn('rounded-panel border border-l-3 border-destructive bg-card px-5 py-4', props.class)"
  >
    <h2 class="mb-2 flex items-center gap-2 text-h3">
      <CircleAlert
        :size="20"
        :stroke-width="1.75"
        class="shrink-0 text-destructive"
        aria-hidden="true"
      />
      <span>{{ title }}</span>
    </h2>
    <ul class="grid gap-1.5">
      <li v-for="item in items" :key="item.target">
        <a
          :href="`#${item.target}`"
          class="font-semibold text-destructive underline"
          @click.prevent="focusTarget(item.target)"
          >{{ item.text }}</a
        >
      </li>
    </ul>
  </div>
</template>
