<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { NativeSelect } from '~/components/ui/native-select'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import SpecimenSpec from './SpecimenSpec.vue'

const props = defineProps<{ idPrefix: string; menus?: HTMLElement }>()
const text = ref('Example')
const checked = ref(false)
const selection = ref('first')
const id = (name: string) => `${props.idPrefix}-${name}`
</script>

<template>
  <SpecimenSpec
    title="Shared controls"
    note="Existing UI primitives read the expression tokens without size overrides."
  >
    <div data-specimen-controls class="grid gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <Button>Continue</Button>
        <Button variant="secondary">Save draft</Button>
        <Button variant="outline">Cancel</Button>
        <Button variant="ghost">Back</Button>
        <Button variant="destructive">Remove document</Button>
        <Button disabled>Unavailable</Button>
      </div>
      <div class="grid gap-2">
        <Label :for="id('input')">Name</Label>
        <Input :id="id('input')" v-model="text" />
        <Label :for="id('native')">Native choice</Label>
        <NativeSelect :id="id('native')" v-model="selection">
          <option value="first">First option</option>
          <option value="second">Second option</option>
        </NativeSelect>
        <Label :for="id('select')">Choice</Label>
        <Select v-model="selection">
          <SelectTrigger :id="id('select')"><SelectValue /></SelectTrigger>
          <SelectContent :to="menus">
            <SelectItem value="first">First option</SelectItem>
            <SelectItem value="second">Second option</SelectItem>
          </SelectContent>
        </Select>
        <Label :for="id('textarea')">Details</Label>
        <Textarea :id="id('textarea')" />
        <Label :for="id('disabled-input')">Unavailable field</Label>
        <Input :id="id('disabled-input')" default-value="Not editable" disabled />
        <Label :for="id('disabled-native')">Unavailable choice</Label>
        <NativeSelect :id="id('disabled-native')" model-value="first" disabled>
          <option value="first">First option</option>
        </NativeSelect>
      </div>
      <Label :for="id('checkbox')" class="min-h-check-row cursor-pointer items-start gap-3">
        <Checkbox :id="id('checkbox')" v-model="checked" />
        <span class="text-body">I have checked these details</span>
      </Label>
      <RadioGroup default-value="first" aria-label="Example choices">
        <Label :for="id('radio-first')" class="min-h-check-row cursor-pointer items-start gap-3">
          <RadioGroupItem :id="id('radio-first')" value="first" />
          <span class="text-body">First choice</span>
        </Label>
        <Label :for="id('radio-second')" class="min-h-check-row cursor-pointer items-start gap-3">
          <RadioGroupItem :id="id('radio-second')" value="second" />
          <span class="text-body">Second choice</span>
        </Label>
      </RadioGroup>
    </div>
  </SpecimenSpec>
</template>
