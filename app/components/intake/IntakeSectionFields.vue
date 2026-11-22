<script setup lang="ts">
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'

type IntakeFieldOption = {
  label: string
  value: string
}

type IntakeFieldDefinition = {
  key: string
  label: string
  helper: string
  placeholder: string
  type?: 'text' | 'email' | 'date' | 'number' | 'tel' | 'textarea' | 'select'
  required?: boolean
  testIdError?: string
  width?: 'full' | 'half'
  options?: IntakeFieldOption[]
}

const props = defineProps<{
  fields: IntakeFieldDefinition[]
  errors: Record<string, string>
}>()

const model = defineModel<Record<string, string | number>>({
  required: true,
})

function getFieldError(fieldKey: string) {
  return props.errors[fieldKey]
}

function getFieldDescriptionId(fieldKey: string) {
  return getFieldError(fieldKey) ? `${fieldKey}-error` : `${fieldKey}-helper`
}
</script>

<template>
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
    <div
      v-for="field in fields"
      :key="field.key"
      class="space-y-2"
      :class="field.width === 'half' ? 'col-span-1' : 'col-span-1 md:col-span-2'"
    >
      <label class="block text-sm font-semibold text-slate-700" :for="`intake-${field.key}`">
        {{ field.label }}
      </label>
      <select
        v-if="field.type === 'select'"
        :id="`intake-${field.key}`"
        v-model="model[field.key]"
        :aria-invalid="getFieldError(field.key) ? 'true' : 'false'"
        :aria-describedby="getFieldDescriptionId(field.key)"
        class="h-12 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2"
      >
        <option disabled value="">
          {{ field.placeholder }}
        </option>
        <option
          v-for="option in field.options || []"
          :key="`${field.key}-${option.value}`"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <Textarea
        v-else-if="field.type === 'textarea'"
        :id="`intake-${field.key}`"
        v-model="model[field.key]"
        :placeholder="field.placeholder"
        :aria-invalid="getFieldError(field.key) ? 'true' : 'false'"
        :aria-describedby="getFieldDescriptionId(field.key)"
        class="min-h-24 border-slate-200 bg-slate-50 text-slate-900 transition-all focus-visible:ring-2"
      />
      <Input
        v-else
        :id="`intake-${field.key}`"
        v-model="model[field.key]"
        :type="field.type || 'text'"
        :placeholder="field.placeholder"
        :aria-invalid="getFieldError(field.key) ? 'true' : 'false'"
        :aria-describedby="getFieldDescriptionId(field.key)"
        class="h-12 border-slate-200 bg-slate-50 text-slate-900 transition-all focus-visible:ring-2 px-4"
      />
      <p :id="`${field.key}-helper`" class="text-xs text-slate-500 mt-1.5">
        {{ field.helper }}
      </p>
      <p
        v-if="getFieldError(field.key)"
        :id="`${field.key}-error`"
        :data-testid="field.testIdError"
        tabindex="-1"
        class="mt-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {{ getFieldError(field.key) }}
      </p>
    </div>
  </div>
</template>
