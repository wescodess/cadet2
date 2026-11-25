<script lang="ts" setup>
import type { ToasterProps } from 'vue-sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-vue-next'
import { interfaceIconStroke } from '@/lib/relay/icons'
import { Toaster as Sonner } from 'vue-sonner'
import { cn } from '@/lib/utils'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
    v-bind="props"
  >
    <template #success-icon>
      <CircleCheckIcon :stroke-width="interfaceIconStroke" class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon :stroke-width="interfaceIconStroke" class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon :stroke-width="interfaceIconStroke" class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon :stroke-width="interfaceIconStroke" class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon :stroke-width="interfaceIconStroke" class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon :stroke-width="interfaceIconStroke" class="size-4" />
    </template>
  </Sonner>
</template>
