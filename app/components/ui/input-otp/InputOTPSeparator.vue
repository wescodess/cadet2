<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { MinusIcon } from 'lucide-vue-next'
import { interfaceIconStroke } from '@/lib/relay/icons'
import { useForwardProps } from 'reka-ui'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()

const forwarded = useForwardProps(props)
</script>

<template>
  <div data-slot="input-otp-separator" role="separator" v-bind="forwarded">
    <slot>
      <MinusIcon :stroke-width="interfaceIconStroke" />
    </slot>
  </div>
</template>
