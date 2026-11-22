<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import {
  relayState,
  relayStateWord,
  type RelayNeutralGlyph,
  type RelayStateId,
} from '~/lib/relay/states'

import StateGlyph from './StateGlyph.vue'

const props = defineProps<{
  state: RelayStateId | 'none'
  count?: number
  label?: string
  glyph?: RelayNeutralGlyph
  size?: 'default' | 'sm'
  class?: string
}>()

const definition = computed(() => (props.state === 'none' ? null : relayState(props.state)))

const word = computed(() => {
  if (props.label) return props.label
  return definition.value ? relayStateWord(definition.value, props.count) : ''
})

const glyph = computed(() => definition.value?.glyph ?? props.glyph ?? 'circle-dashed')

const tone = computed(() => {
  if (!definition.value) return 'neutral'
  return definition.value.fill === 'solid' ? 'solid' : 'role'
})

const tones = {
  role: {
    chip: 'bg-card border-border text-role-ink client:bg-role-soft client:border-transparent',
    glyph: 'text-role',
  },
  solid: { chip: 'bg-urgent border-urgent text-urgent-foreground', glyph: '' },
  neutral: { chip: 'bg-muted border-border text-muted-foreground', glyph: 'text-muted-foreground' },
} as const
</script>

<template>
  <Badge
    as="span"
    variant="outline"
    :data-state="state === 'none' ? undefined : state"
    :data-role="definition?.role ?? 'neutral'"
    :data-size="size ?? 'default'"
    :class="
      cn(
        'min-h-chip max-w-full shrink justify-start gap-1.25 rounded-chip py-0 pr-2 pl-1.5 text-left align-middle font-sans text-chip font-medium whitespace-normal',
        size === 'sm' && 'chip-sm',
        tones[tone].chip,
        props.class,
      )
    "
  >
    <StateGlyph :glyph="glyph" :class="cn('size-4', tones[tone].glyph)" />
    <span>{{ word }}</span>
  </Badge>
</template>
