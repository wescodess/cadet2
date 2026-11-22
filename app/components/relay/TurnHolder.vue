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
</script>

<template>
  <span
    data-slot="holder"
    :data-turn="turn"
    :class="
      cn(
        'grid min-w-14 max-w-18 content-start justify-items-center gap-0.75 text-center',
        props.class,
      )
    "
  >
    <TurnDisc :turn="turn" :initials="initials" :unassigned="unassigned" />
    <span
      data-slot="holder-word"
      :class="
        cn(
          'text-xs leading-compact font-semibold wrap-break-word client:text-label client:leading-label client:font-semibold',
          turn === 'none' ? 'text-muted-foreground' : 'text-role-ink',
        )
      "
    >
      <span class="sr-only">{{ `${prefix} ` }}</span>{{ word }}
    </span>
  </span>
</template>
