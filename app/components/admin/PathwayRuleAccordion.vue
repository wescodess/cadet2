<script setup lang="ts">
import { computed } from 'vue'

import PathwayStatusBadge from '@/components/admin/PathwayStatusBadge.vue'
import PathwayRuleFormRow from '@/components/admin/PathwayRuleFormRow.vue'
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import type { PathwayDefinitionStatus } from '@/lib/admin/pathwayDefinitions'
import type { PathwayRulesEditorItem, PathwayRuleDraft } from '@/lib/admin/pathwayRules'
import {
  pathwayDefinitionStatusValues,
} from '@/lib/admin/pathwayDefinitions'
import {
  pathwayRuleTestIds,
} from '@/lib/admin/pathwayRules'

const props = withDefaults(defineProps<{
  item: PathwayRulesEditorItem
  dirty?: boolean
  saving?: boolean
}>(), {
  dirty: false,
  saving: false,
})

const emit = defineEmits<{
  (event: 'update-definition', payload: { field: 'displayName' | 'description' | 'status', value: string }): void
  (event: 'update-rule', payload: { index: number, rule: PathwayRuleDraft }): void
  (event: 'add-rule'): void
  (event: 'remove-rule', payload: number): void
  (event: 'save'): void
}>()

const ruleCountLabel = computed(() => `${props.item.draftRules.length} ${props.item.draftRules.length === 1 ? 'rule' : 'rules'}`)

function updateRule(index: number, rule: PathwayRuleDraft) {
  emit('update-rule', { index, rule })
}
</script>

<template>
  <AccordionItem
    :value="item.pathwayId"
    class="overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-sm"
    :data-testid="pathwayRuleTestIds.accordion"
  >
    <AccordionTrigger class="px-6 py-5 text-left hover:no-underline">
      <div class="flex w-full flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-lg font-semibold text-slate-950">{{ item.draftDefinition.displayName }}</span>
            <PathwayStatusBadge :status="item.draftDefinition.status" />
            <span
              v-if="dirty"
              class="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700"
            >
              Unsaved
            </span>
          </div>
          <p class="text-sm text-slate-500">
            {{ item.pathwayId }} · {{ ruleCountLabel }}
          </p>
        </div>
        <div class="text-sm text-slate-500">
          Edit the live recommendation conditions for this pathway.
        </div>
      </div>
    </AccordionTrigger>

    <AccordionContent class="border-t border-slate-200 px-6 py-6">
      <div class="space-y-6">
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
              Pathway identity
            </h3>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label>Display name</Label>
              <Input
                :model-value="item.draftDefinition.displayName"
                placeholder="Skilled Worker pathway"
                @update:model-value="value => emit('update-definition', { field: 'displayName', value: String(value) })"
              />
            </div>

            <div class="space-y-2">
              <Label>Status</Label>
              <NativeSelect
                :model-value="item.draftDefinition.status"
                @update:model-value="value => emit('update-definition', { field: 'status', value: String(value) as PathwayDefinitionStatus })"
              >
                <option
                  v-for="status in pathwayDefinitionStatusValues"
                  :key="status"
                  :value="status"
                >
                  {{ status }}
                </option>
              </NativeSelect>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Description</Label>
            <Textarea
              :model-value="item.draftDefinition.description"
              placeholder="Context for internal operators reviewing this pathway."
              @update:model-value="value => emit('update-definition', { field: 'description', value: String(value) })"
            />
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                Eligibility rules
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                Each rule compiles into the persisted eligibility DSL used by live pathway evaluation.
              </p>
            </div>
          </div>

          <div class="space-y-3">
            <PathwayRuleFormRow
              v-for="(rule, index) in item.draftRules"
              :key="rule.id || `${item.pathwayId}-${index}`"
              :model-value="rule"
              :disabled="saving"
              @remove="emit('remove-rule', index)"
              @update:model-value="nextRule => updateRule(index, nextRule)"
            />
          </div>

          <Button
            :data-testid="pathwayRuleTestIds.addButton"
            :disabled="saving"
            type="button"
            variant="outline"
            class="border-dashed"
            @click="emit('add-rule')"
          >
            Add rule
          </Button>
        </section>

        <div class="flex flex-col gap-3 border-t border-slate-200 pt-5 md:flex-row md:items-center md:justify-between">
          <p class="text-sm text-slate-500">
            Saving an active pathway updates the live recommendation evaluation rules.
          </p>
          <Button
            :data-testid="pathwayRuleTestIds.saveButton"
            :disabled="saving"
            type="button"
            @click="emit('save')"
          >
            {{ saving ? 'Saving…' : 'Save changes' }}
          </Button>
        </div>
      </div>
    </AccordionContent>
  </AccordionItem>
</template>
