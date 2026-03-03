<script setup lang="ts">
import { Input } from "~/components/ui/input"

type IntakeFieldDefinition = {
  key: string
  label: string
  helper: string
  placeholder: string
  type?: 'text' | 'email'
  required?: boolean
  testIdError?: string
}

const props = defineProps<{
  fields: IntakeFieldDefinition[]
  errors: Record<string, string>
}>()

const model = defineModel<Record<string, string>>({
  required: true,
})

function getFieldError(fieldKey: string) {
  return props.errors[fieldKey]
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="field in fields"
      :key="field.key"
      class="space-y-2"
    >
      <label
        class="block text-sm font-semibold text-slate-800"
        :for="`intake-${field.key}`"
      >
        {{ field.label }}
      </label>
      <Input
        :id="`intake-${field.key}`"
        v-model="model[field.key]"
        :type="field.type || 'text'"
        :placeholder="field.placeholder"
        :aria-invalid="getFieldError(field.key) ? 'true' : 'false'"
        :aria-describedby="getFieldError(field.key) ? `${field.key}-error` : `${field.key}-helper`"
        class="min-h-[44px] border-slate-300 focus-visible:ring-[var(--ring)]"
      />
      <p
        :id="`${field.key}-helper`"
        class="text-xs text-slate-500"
      >
        {{ field.helper }}
      </p>
      <p
        v-if="getFieldError(field.key)"
        :id="`${field.key}-error`"
        :data-testid="field.testIdError"
        tabindex="-1"
        class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ getFieldError(field.key) }}
      </p>
    </div>
  </div>
</template>
