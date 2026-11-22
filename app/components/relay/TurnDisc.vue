<script setup lang="ts">
import { Check, PenLine, UserRound } from 'lucide-vue-next'
import { computed } from 'vue'

import { cn } from '~/lib/utils'

import type { RelayTurn } from './turns'

const props = withDefaults(
  defineProps<{
    turn: RelayTurn
    initials?: string
    unassigned?: boolean
    size?: 16 | 20 | 24 | 32 | 36
    class?: string
  }>(),
  { initials: undefined, size: 24, class: undefined },
)

const icon = computed(() => {
  if (props.unassigned) return UserRound
  if (props.initials) return null
  if (props.turn === 'done') return Check
  if (props.turn === 'signed') return PenLine
  return null
})

const sizes = { 16: 'disc-16', 20: 'disc-20', 24: 'disc-24', 32: 'disc-32', 36: 'disc-36' } as const
</script>

<template>
  <span
    :data-turn="turn"
    aria-hidden="true"
    :class="
      cn(
        'inline-grid shrink-0 place-items-center rounded-full font-sans font-semibold',
        sizes[size],
        turn === 'none'
          ? 'border-2 border-dashed border-input bg-card text-muted-foreground'
          : 'bg-role text-role-foreground',
        props.class,
      )
    "
  >
    <component :is="icon" v-if="icon" :stroke-width="1.75" aria-hidden="true" />
    <template v-else>{{ initials ?? (turn === 'none' ? '·' : '') }}</template>
  </span>
</template>
