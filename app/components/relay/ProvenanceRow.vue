<script setup lang="ts">
import { cn } from '~/lib/utils'

interface RelayDate {
  text: string
  datetime: string
}

const props = defineProps<{
  source: { title: string; href: string; domain: string }
  effective?: RelayDate
  verified: RelayDate
  class?: string
}>()
</script>

<template>
  <dl :class="cn('flex flex-wrap gap-x-5 gap-y-1 text-small text-muted-foreground', props.class)">
    <div class="flex flex-wrap gap-1.5">
      <dt class="font-medium text-muted-foreground">Source</dt>
      <dd class="text-foreground">
        <a :href="source.href" class="underline">{{ source.title }}</a>, {{ source.domain }}
      </dd>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <dt class="font-medium text-muted-foreground">Effective</dt>
      <dd class="text-foreground">
        <time v-if="effective" :datetime="effective.datetime">{{ effective.text }}</time>
        <template v-else>Not stated by source</template>
      </dd>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <dt class="font-medium text-muted-foreground">Verified as of</dt>
      <dd class="text-foreground">
        <time :datetime="verified.datetime">{{ verified.text }}</time>
      </dd>
    </div>
  </dl>
</template>
