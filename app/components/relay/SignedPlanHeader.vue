<script setup lang="ts">
import { cn } from '~/lib/utils'

import StateGlyph from './StateGlyph.vue'

interface RelayDate {
  text: string
  datetime: string
}

const props = defineProps<{
  name: string
  designation: string
  licence: string
  signed: RelayDate
  version: number
  verified: RelayDate
  class?: string
}>()
</script>

<template>
  <section
    aria-label="Signature"
    data-role="seal"
    :class="
      cn(
        'flex items-start gap-3.5 rounded-xl border border-border bg-card p-pad edge-start',
        props.class,
      )
    "
  >
    <StateGlyph glyph="badge-check" :size="24" class="text-seal" />
    <div class="grid min-w-0 gap-1.5">
      <p>
        Reviewed and signed by <strong class="font-semibold">{{ name }}</strong>, {{ designation }},
        licence <span data-slot="licence" class="text-id">{{ licence }}</span>, on
        <time :datetime="signed.datetime">{{ signed.text }}</time>. Version {{ version }}.
      </p>
      <p class="flex flex-wrap gap-x-4 gap-y-1 text-small">
        <a
          href="https://register.college-ic.ca/"
          class="inline-flex min-h-6 items-center font-semibold text-seal-ink underline client:min-h-8"
          >Check this licence on the CICC register</a
        >{{ ' ' }}<span>Sources verified as of {{ verified.text }}.</span>
      </p>
    </div>
  </section>
</template>
