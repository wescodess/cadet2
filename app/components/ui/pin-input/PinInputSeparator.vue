<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import { Minus } from 'lucide-vue-next'
import { interfaceIconStroke } from '@/lib/relay/icons'
import { Primitive, useForwardProps } from 'reka-ui'

const props = defineProps<PrimitiveProps>()
const forwardedProps = useForwardProps(props)
</script>

<template>
  <Primitive data-slot="pin-input-separator" v-bind="forwardedProps">
    <slot>
      <Minus :stroke-width="interfaceIconStroke" />
    </slot>
  </Primitive>
</template>
