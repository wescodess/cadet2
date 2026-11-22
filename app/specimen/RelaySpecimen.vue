<script setup lang="ts">
import ClientSpecimen from './ClientSpecimen.vue'
import RepresentativeSpecimen from './RepresentativeSpecimen.vue'
import SpecimenPanel from './SpecimenPanel.vue'

useHead({ title: 'Relay primitives specimen' })
</script>

<template>
  <main
    data-specimen="relay"
    class="min-h-screen bg-background px-4 pt-14 pb-30 font-sans text-foreground lg:px-12"
  >
    <header class="mb-12 border-b border-border pb-8">
      <p class="mb-3 text-sm text-muted-foreground">
        Development only. Never part of a deployed build.
      </p>
      <h1 class="text-4xl font-bold">Relay primitives</h1>
      <p class="mt-3 max-w-prose text-muted-foreground">
        Every shared primitive in both themes and both expressions, for comparison with
        <code>docs/design/system/approved.html</code>.
      </p>
    </header>

    <section id="client" aria-labelledby="client-h" class="mb-24">
      <h2 id="client-h" class="mb-6 text-3xl font-bold">Client components</h2>
      <div class="grid items-start gap-6 lg:grid-cols-2">
        <SpecimenPanel theme="light" expression="client" tag="390 px column">
          <ClientSpecimen theme="light" />
        </SpecimenPanel>
        <SpecimenPanel theme="dark" expression="client" tag="390 px column">
          <ClientSpecimen theme="dark" />
        </SpecimenPanel>
      </div>
    </section>

    <section id="representative" aria-labelledby="representative-h">
      <h2 id="representative-h" class="mb-6 text-3xl font-bold">Representative components</h2>
      <div class="grid gap-6">
        <SpecimenPanel theme="light" expression="representative" tag="Desktop">
          <RepresentativeSpecimen theme="light" />
        </SpecimenPanel>
        <SpecimenPanel theme="dark" expression="representative" tag="Desktop">
          <RepresentativeSpecimen theme="dark" />
        </SpecimenPanel>
      </div>
    </section>
  </main>
</template>
