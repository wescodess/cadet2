<script setup lang="ts">
import { computed } from 'vue'
import { Trash2Icon } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import type {
  EligibilityDslFieldPath,
  EligibilityDslOperator,
  PathwayRuleDraft,
} from '@/lib/admin/pathwayRules'
import {
  eligibilityDslBooleanOperatorValues,
  eligibilityDslFieldPathValues,
  eligibilityDslOperatorValues,
  isBooleanEligibilityFieldPath,
  pathwayRuleFieldLabels,
  pathwayRuleTestIds,
} from '@/lib/admin/pathwayRules'

const props = withDefaults(defineProps<{
  modelValue: PathwayRuleDraft
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', payload: PathwayRuleDraft): void
  (event: 'remove'): void
}>()

const usesBooleanValue = computed(() => isBooleanEligibilityFieldPath(props.modelValue.fieldPath))
const availableOperators = computed(() => usesBooleanValue.value
  ? eligibilityDslBooleanOperatorValues
  : eligibilityDslOperatorValues)

function updateRule<K extends keyof PathwayRuleDraft>(field: K, value: PathwayRuleDraft[K]) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

function handleFieldPathChange(value: string | number) {
  const fieldPath = String(value) as EligibilityDslFieldPath
  const nextRule: PathwayRuleDraft = {
    ...props.modelValue,
    fieldPath,
  }

  if (isBooleanEligibilityFieldPath(fieldPath)) {
    nextRule.operator = nextRule.operator === '!=' ? '!=' : '=='
    nextRule.comparisonValue = typeof nextRule.comparisonValue === 'boolean'
      ? nextRule.comparisonValue
      : true
  }

  emit('update:modelValue', nextRule)
}

function handleComparisonValueChange(value: string | number) {
  if (usesBooleanValue.value) {
    updateRule('comparisonValue', String(value) === 'false' ? false : true)
    return
  }

  const rawValue = String(value)
  const numericValue = Number(rawValue)

  updateRule('comparisonValue', rawValue.trim() !== '' && Number.isFinite(numericValue) ? numericValue : rawValue)
}
</script>

<template>
  <div
    :data-testid="pathwayRuleTestIds.row"
    class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
  >
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_auto] lg:items-end">
      <div class="space-y-2">
        <Label>Condition name</Label>
        <Input
          :model-value="modelValue.unmetConditionId"
          :disabled="disabled"
          placeholder="minimum-english-clb-8"
          @update:model-value="value => updateRule('unmetConditionId', String(value))"
        />
      </div>

      <div class="space-y-2">
        <Label>Field</Label>
        <NativeSelect
          :model-value="modelValue.fieldPath"
          :disabled="disabled"
          @update:model-value="handleFieldPathChange"
        >
          <option
            v-for="fieldPath in eligibilityDslFieldPathValues"
            :key="fieldPath"
            :value="fieldPath"
          >
            {{ pathwayRuleFieldLabels[fieldPath] }}
          </option>
        </NativeSelect>
      </div>

      <div class="space-y-2">
        <Label>Operator</Label>
        <NativeSelect
          :model-value="modelValue.operator"
          :disabled="disabled"
          @update:model-value="value => updateRule('operator', String(value) as EligibilityDslOperator)"
        >
          <option
            v-for="operator in availableOperators"
            :key="operator"
            :value="operator"
          >
            {{ operator }}
          </option>
        </NativeSelect>
      </div>

      <div class="flex justify-end lg:pb-0.5">
        <Button
          aria-label="Remove rule"
          :disabled="disabled"
          size="icon"
          type="button"
          variant="ghost"
          @click="emit('remove')"
        >
          <Trash2Icon class="size-4" />
        </Button>
      </div>
    </div>

    <div class="mt-4 space-y-2">
      <Label>Threshold</Label>
      <NativeSelect
        v-if="usesBooleanValue"
        :model-value="String(modelValue.comparisonValue)"
        :disabled="disabled"
        @update:model-value="handleComparisonValueChange"
      >
        <option value="true">
          True
        </option>
        <option value="false">
          False
        </option>
      </NativeSelect>
      <Input
        v-else
        :model-value="String(modelValue.comparisonValue)"
        :disabled="disabled"
        placeholder="8"
        @update:model-value="handleComparisonValueChange"
      />
    </div>
  </div>
</template>
