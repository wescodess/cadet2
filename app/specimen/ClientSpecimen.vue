<script setup lang="ts">
import ErrorSummary from '~/components/relay/ErrorSummary.vue'
import ProvenanceRow from '~/components/relay/ProvenanceRow.vue'
import SaveState from '~/components/relay/SaveState.vue'
import SignedPlanHeader from '~/components/relay/SignedPlanHeader.vue'
import StatusChip from '~/components/relay/StatusChip.vue'
import TurnBar from '~/components/relay/TurnBar.vue'
import TurnBarSegment from '~/components/relay/TurnBarSegment.vue'
import TurnHolder from '~/components/relay/TurnHolder.vue'

import { stateGroups } from './fixtures'
import SpecimenSpec from './SpecimenSpec.vue'

const props = defineProps<{ theme: 'light' | 'dark' }>()

const id = (name: string) => `${name}-client-${props.theme}`
</script>

<template>
  <div class="max-w-110">
    <SpecimenSpec
      title="Turn bar"
      note="Under the top bar on every client screen. Both turns at once, with counts. Each segment opens the matching list."
    >
      <div class="grid gap-3">
        <TurnBar>
          <TurnBarSegment
            turn="client"
            label="Your turn"
            detail="1 thing to do"
            initials="OA"
            href="#tasks"
          />
          <TurnBarSegment
            turn="representative"
            label="Priya’s turn"
            detail="2 things in progress"
            initials="PR"
            href="#progress"
          />
        </TurnBar>
        <TurnBar>
          <TurnBarSegment turn="done" label="Nothing for you" detail="Priya has it" href="#tasks" />
          <TurnBarSegment
            turn="representative"
            label="Priya’s turn"
            detail="2 things in progress"
            initials="PR"
            href="#progress"
          />
        </TurnBar>
        <TurnBar>
          <TurnBarSegment
            turn="client"
            label="Your turn"
            detail="Choose what to share"
            initials="OA"
            href="#tasks"
          />
          <TurnBarSegment
            turn="none"
            label="Priya Raman"
            detail="Can’t see your answers yet"
            initials="PR"
            href="#progress"
          />
        </TurnBar>
        <TurnBar>
          <TurnBarSegment turn="signed" label="Signed" detail="Version 2 is ready" href="#plan" />
          <TurnBarSegment
            turn="representative"
            label="C’est au tour de Priya"
            detail="2 éléments en cours de traitement"
            initials="PR"
            href="#progress"
          />
        </TurnBar>
      </div>
    </SpecimenSpec>

    <SpecimenSpec title="Holder" note="Ends every client list row. Says who has the item now.">
      <div class="flex flex-wrap items-start gap-4">
        <TurnHolder turn="client" word="You" initials="OA" />
        <TurnHolder turn="client" word="You, later" initials="OA" />
        <TurnHolder turn="representative" word="Priya" initials="PR" />
        <TurnHolder turn="done" word="Done" />
        <TurnHolder turn="done" word="Checked" />
        <TurnHolder turn="signed" word="Signed" />
        <TurnHolder turn="none" word="Not yet" />
      </div>
    </SpecimenSpec>

    <SpecimenSpec
      title="Status chips"
      note="Colour, glyph and words together, so no state depends on colour alone."
    >
      <div v-for="group in stateGroups" :key="group.name" class="mb-3.5 grid gap-2">
        <p class="text-small font-semibold text-muted-foreground">{{ group.name }}</p>
        <div class="flex flex-wrap items-center gap-2.5">
          <StatusChip
            v-for="state in group.states"
            :key="state.id"
            :state="state.id"
            :count="state.count"
          />
        </div>
      </div>
      <div class="mb-3.5 grid gap-2">
        <p class="text-small font-semibold text-muted-foreground">Small, in rows</p>
        <div class="flex flex-wrap items-center gap-2.5">
          <StatusChip state="replace" size="sm" />
          <StatusChip state="awaiting" size="sm" />
          <StatusChip state="accepted" size="sm" />
        </div>
      </div>
      <div class="grid gap-2">
        <p class="text-small font-semibold text-muted-foreground">Nobody holds the turn</p>
        <div class="flex flex-wrap items-center gap-2.5">
          <StatusChip state="none" label="Not confirmed yet" glyph="circle-help" />
          <StatusChip state="none" label="Draft, pending counsel" glyph="circle-dashed" />
          <StatusChip state="none" label="Captured, not sent" glyph="inbox" />
        </div>
      </div>
    </SpecimenSpec>

    <SpecimenSpec title="Provenance" note="Under every conclusion. Unknown dates stay unknown.">
      <ProvenanceRow
        :source="{
          title: 'Canadian Experience Class: who can apply',
          href: '#source',
          domain: 'canada.ca',
        }"
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

    <SpecimenSpec
      title="Save state"
      note="Says what really happened. Offline is never shown as saved."
    >
      <div class="grid gap-3.5">
        <SaveState state="saving" label="Saving" />
        <SaveState state="saved" label="Saved at 2:41 pm" />
        <SaveState
          state="offline"
          label="Not saved. You’re offline. We’ll try again when you reconnect."
        />
      </div>
    </SpecimenSpec>

    <SpecimenSpec
      title="Error summary"
      note="Appears at the top on submit, takes focus, links to each field."
    >
      <ErrorSummary
        :autofocus="false"
        :items="[
          { text: 'Enter the expiry date as day, month and year', target: id('expiry') },
          { text: 'Select whether you have a job offer in Canada', target: id('offer') },
        ]"
      />
      <div class="mt-4 grid gap-2">
        <label :for="id('expiry')" class="text-label">Expiry day</label>
        <input
          :id="id('expiry')"
          class="h-control rounded-input border border-input bg-card px-4.5"
          inputmode="numeric"
        />
        <fieldset :id="id('offer')" tabindex="-1" class="text-small text-muted-foreground">
          Job offer question
        </fieldset>
      </div>
    </SpecimenSpec>
  </div>
</template>
