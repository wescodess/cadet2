<script setup lang="ts">
import type { Component } from 'vue'

import { cn } from '~/lib/utils'

import TurnDisc from './TurnDisc.vue'
import type { RelayTurn } from './turns'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    turn: RelayTurn
    label: string
    detail: string
    initials?: string
    href?: string
    as?: string | Component
    class?: string
  }>(),
  { initials: undefined, href: undefined, as: 'a', class: undefined },
)
</script>

<template>
  <component
    :is="as"
    v-bind="href === undefined ? $attrs : { ...$attrs, href }"
    :data-turn="turn"
    :class="
      cn(
        'flex min-h-16 min-w-0 items-center gap-2.5 bg-role-soft not-first:border-l not-first:border-border px-3.5 pt-3 pb-3.5 text-foreground no-underline edge-bottom',
        props.class,
      )
    "
  >
    <TurnDisc :turn="turn" :initials="initials" :size="32" />
    <span class="grid min-w-0">
      <span
        data-slot="turn-label"
        :class="
          cn('text-label font-semibold', turn === 'none' ? 'text-foreground' : 'text-role-ink')
        "
        >{{ label }}</span>{{ ' '
      }}<span
        data-slot="turn-detail"
        :class="cn('text-small', turn === 'none' ? 'text-muted-foreground' : 'text-foreground')"
        >{{ detail }}</span
      >
    </span>
  </component>
</template>
