<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  AlarmClock,
  Archive,
  BadgeCheck,
  Ban,
  CalendarClock,
  CalendarSearch,
  CircleArrowOutUpRight,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  FileCheck,
  FileClock,
  FileUp,
  FileX,
  GitCompareArrows,
  Inbox,
  MessageSquareQuote,
  Send,
  Siren,
} from 'lucide-vue-next'

import type { RelayGlyph, RelayNeutralGlyph } from '~/lib/relay/states'

const props = withDefaults(
  defineProps<{ glyph: RelayGlyph | RelayNeutralGlyph; size?: number }>(),
  {
    size: 16,
  },
)

const icons: Partial<Record<RelayGlyph | RelayNeutralGlyph, Component>> = {
  'alarm-clock': AlarmClock,
  archive: Archive,
  'badge-check': BadgeCheck,
  ban: Ban,
  'calendar-clock': CalendarClock,
  'calendar-search': CalendarSearch,
  'circle-arrow-out-up-right': CircleArrowOutUpRight,
  'circle-check': CircleCheck,
  'circle-dashed': CircleDashed,
  'circle-help': CircleHelp,
  'file-check': FileCheck,
  'file-clock': FileClock,
  'file-up': FileUp,
  'file-x': FileX,
  'git-compare-arrows': GitCompareArrows,
  inbox: Inbox,
  'message-square-quote': MessageSquareQuote,
  send: Send,
  siren: Siren,
}

const icon = computed(() => icons[props.glyph])
</script>

<template>
  <component
    :is="icon"
    v-if="icon"
    :size="size"
    :stroke-width="2"
    class="shrink-0"
    aria-hidden="true"
  />
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="shrink-0"
    aria-hidden="true"
  >
    <template v-if="glyph === 'custom:circle-dashed-question'">
      <circle cx="12" cy="12" r="9.2" stroke-dasharray="3.2 2.6" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5" />
      <circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="glyph === 'custom:fill-quarter-dashed'">
      <circle cx="12" cy="12" r="9.2" stroke-width="2" stroke-dasharray="3.2 2.6" />
      <path d="M12 12V6.4A5.6 5.6 0 0 1 17.6 12z" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="glyph === 'custom:fill-half'">
      <circle cx="12" cy="12" r="9.2" stroke-width="2" />
      <path d="M12 12V6.4A5.6 5.6 0 0 1 12.00 17.60z" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="glyph === 'custom:circle-question'">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5" />
      <circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="glyph === 'custom:fill-three-quarters'">
      <circle cx="12" cy="12" r="9.2" stroke-width="2" />
      <path d="M12 12V6.4A5.6 5.6 0 1 1 6.40 12.00z" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="glyph === 'custom:disc-check'">
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="M7.8 12.3l2.8 2.8 5.6-5.8" class="glyph-cut" stroke-width="2.2" />
    </template>
    <template v-else-if="glyph === 'custom:disc-arrow'">
      <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
      <path d="M7.5 12h8M12.8 8.6l3.4 3.4-3.4 3.4" class="glyph-cut" stroke-width="2.2" />
    </template>
  </svg>
</template>
