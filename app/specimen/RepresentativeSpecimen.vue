<script setup lang="ts">
import { Button } from '~/components/ui/button'
import { Kbd } from '~/components/ui/kbd'
import ErrorSummary from '~/components/relay/ErrorSummary.vue'
import ProvenanceRow from '~/components/relay/ProvenanceRow.vue'
import SaveState from '~/components/relay/SaveState.vue'
import SignedPlanHeader from '~/components/relay/SignedPlanHeader.vue'
import StatusChip from '~/components/relay/StatusChip.vue'
import TurnHolder from '~/components/relay/TurnHolder.vue'

import { stateGroups } from './fixtures'
import SpecimenSpec from './SpecimenSpec.vue'

const props = defineProps<{ theme: 'light' | 'dark' }>()

const id = (name: string) => `${name}-representative-${props.theme}`

const rows = [
  {
    name: 'Oluwaseun Adébáyọ̀-Fitzgerald',
    detail: 'Work permit · 14 Mar 2027',
    state: 'review-requested',
    turn: 'representative',
    word: 'You',
    initials: 'PR',
    selected: true,
  },
  {
    name: 'Nguyễn Thị Minh Khai',
    detail: 'Express Entry · Date unknown',
    state: 'clarification',
    turn: 'client',
    word: 'Client',
    initials: 'NK',
    selected: false,
  },
  {
    name: 'Siobhán Ní Bhriain',
    detail: 'Study permit · 2 Feb 2027',
    state: 'reviewing',
    turn: 'representative',
    word: 'Daniel',
    initials: 'DO',
    selected: false,
  },
] as const
</script>

<template>
  <div>
    <SpecimenSpec
      title="Keyboard hints"
      note="Keyboard hints sit inside the control at 12 px. Sign is never a single-key shortcut."
    >
      <div class="flex flex-wrap items-center gap-2.5">
        <Button>Sign version 3 <Kbd>⌘ Enter</Kbd></Button>
        <Button variant="outline">Preview client edition <Kbd>P</Kbd></Button>
        <Button variant="ghost">Ask client <Kbd>C</Kbd></Button>
        <Kbd>⌘ K</Kbd>
      </div>
    </SpecimenSpec>

    <SpecimenSpec
      title="Status chips"
      note="Representatives get a neutral chip so rows stay quiet: card fill, hairline, glyph in the role colour, word in the role ink."
    >
      <div v-for="group in stateGroups" :key="group.name" class="mb-3.5 grid gap-2">
        <p class="text-small font-semibold text-muted-foreground">{{ group.name }}</p>
        <div class="flex flex-wrap items-center gap-2.5">
          <StatusChip
            v-for="state in group.states"
            :key="state.id"
            :state="state.id"
            :count="state.count"
            size="sm"
          />
        </div>
      </div>
      <div class="grid gap-2">
        <p class="text-small font-semibold text-muted-foreground">
          Default size; nobody holds the turn
        </p>
        <div class="flex flex-wrap items-center gap-2.5">
          <StatusChip state="review-requested" />
          <StatusChip state="changed" />
          <StatusChip state="due-90" :count="40" />
          <StatusChip state="none" label="Not confirmed yet" glyph="circle-help" />
        </div>
      </div>
    </SpecimenSpec>

    <SpecimenSpec
      title="Queue rows with next actor"
      note="The holder keeps its own 72 px column. The selected row has a 2 px graphite edge, never the focus colour."
    >
      <div class="overflow-hidden rounded-panel border border-border bg-card">
        <a
          v-for="row in rows"
          :key="row.name"
          href="#queue"
          :aria-current="row.selected ? 'true' : undefined"
          :class="[
            'flex items-start gap-2.5 border-b border-border px-3.5 py-2.5 no-underline last:border-b-0',
            row.selected ? 'bg-accent edge-selected' : 'hover:bg-accent',
          ]"
        >
          <span class="grid min-w-0 flex-1 gap-1">
            <span class="font-medium">{{ row.name }}</span>
            <span class="text-small text-muted-foreground">{{ row.detail }}</span>
            <span><StatusChip :state="row.state" size="sm" /></span>
          </span>
          <TurnHolder :turn="row.turn" :word="row.word" :initials="row.initials" class="w-18" />
        </a>
      </div>
      <div class="mt-4 flex flex-wrap items-start gap-4">
        <TurnHolder turn="representative" word="Unassigned" unassigned />
        <TurnHolder turn="signed" word="Signed" />
        <TurnHolder turn="done" word="Done" />
        <TurnHolder turn="none" word="Not yet" />
      </div>
    </SpecimenSpec>

    <SpecimenSpec title="Provenance" note="Under every conclusion. Unknown dates stay unknown.">
      <ProvenanceRow
        :source="{
          title: 'Canadian Experience Class: who can apply',
          href: '#source',
          domain: 'canada.ca',
        }"
        :effective="{ text: '14 Mar 2026', datetime: '2026-03-14' }"
        :verified="{ text: '1 Nov 2026', datetime: '2026-11-01' }"
      />
    </SpecimenSpec>

    <SpecimenSpec
      title="Signed plan header"
      note="Comes first on a signed plan. Only ever shown for a signed version."
    >
      <SignedPlanHeader
        name="Priya Raman"
        designation="RCIC"
        licence="R123456"
        :signed="{ text: '3 Nov 2026', datetime: '2026-11-03' }"
        :version="2"
        :verified="{ text: '1 Nov 2026', datetime: '2026-11-01' }"
      />
    </SpecimenSpec>

    <SpecimenSpec title="Save state" note="Desk wording. Never shows saved when it is not.">
      <div class="grid gap-3.5">
        <SaveState state="saving" label="Saving draft" />
        <SaveState state="saved" label="Draft saved 2:41 pm" />
        <SaveState state="offline" label="Not saved. Connection lost, retrying." />
      </div>
    </SpecimenSpec>

    <SpecimenSpec
      title="Error summary"
      note="Names what is blocked and links to each item. Signing waits until each is resolved or disclosed."
    >
      <ErrorSummary
        :autofocus="false"
        title="Version 3 can’t be signed yet"
        :items="[
          { text: 'IELTS test report needs a replacement copy', target: id('ielts') },
          { text: 'Disclose the unknown expiry date', target: id('expiry') },
        ]"
      />
      <ul class="mt-4 grid gap-1 text-small text-muted-foreground">
        <li :id="id('ielts')" tabindex="-1">IELTS test report</li>
        <li :id="id('expiry')" tabindex="-1">Permit expiry date</li>
      </ul>
    </SpecimenSpec>
  </div>
</template>
