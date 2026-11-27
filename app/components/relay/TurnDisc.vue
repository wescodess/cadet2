<script setup lang="ts">
import { Check, PenLine, UserRound } from 'lucide-vue-next'
import { interfaceIconStroke } from '~/lib/relay/icons'
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
    <UserRound v-if="unassigned" :stroke-width="interfaceIconStroke" aria-hidden="true" />
    <Check
      v-else-if="!initials && turn === 'done'"
      :stroke-width="interfaceIconStroke"
      aria-hidden="true"
    />
    <PenLine
      v-else-if="!initials && turn === 'signed'"
      :stroke-width="interfaceIconStroke"
      aria-hidden="true"
    />
    <template v-else>{{ initials ?? (turn === 'none' ? '·' : '') }}</template>
  </span>
</template>
