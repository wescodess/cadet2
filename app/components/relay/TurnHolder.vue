<script setup lang="ts">
import { computed } from 'vue'

import { cn } from '~/lib/utils'

import TurnDisc from './TurnDisc.vue'
import { holderPrefix, type RelayTurn } from './turns'

const props = defineProps<{
  turn: RelayTurn
  word: string
  initials?: string
  unassigned?: boolean
  class?: string
}>()

const prefix = computed(() => holderPrefix(props.turn))
const runs = computed(() =>
  props.word
    .split(/(\s+)/)
    .filter(Boolean)
    .map((text) => ({ text, space: /^\s+$/.test(text) })),
)
</script>

<template>
  <span
    data-slot="holder"
    :data-turn="turn"
    :class="
      cn(
        'grid min-w-14 max-w-18 grid-cols-1 client:max-w-none client:grid-cols-none content-start justify-items-center gap-0.75 text-center',
        props.class,
      )
    "
  >
    <TurnDisc :turn="turn" :initials="initials" :unassigned="unassigned" />
    <span
      data-slot="holder-word"
      :class="
        cn(
          'max-w-full text-xs leading-compact font-semibold wrap-break-word client:max-w-none client:text-label client:leading-label client:font-semibold',
          turn === 'none' ? 'text-muted-foreground' : 'text-role-ink',
        )
      "
    >
      <span class="sr-only">{{ `${prefix} ` }}</span>
      <template v-for="(run, index) in runs" :key="index">
        <template v-if="run.space">{{ run.text }}</template>
        <span
          v-else
          data-slot="holder-part"
          class="inline-block max-w-full wrap-anywhere client:inline client:wrap-break-word"
          >{{ run.text }}</span
        >
      </template>
    </span>
  </span>
</template>
