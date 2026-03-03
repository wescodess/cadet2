<template>
  <section
    data-testid="workspace-dashboard"
    class="space-y-6"
  >
    <div class="space-y-2">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--trust)]">
        Secure planning workspace
      </p>
      <h1 class="text-3xl font-semibold text-slate-950 sm:text-4xl">
        Start your guided immigration intake.
      </h1>
      <p class="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
        Your workspace is ready. Capture your goals, constraints, and supporting details in one calm,
        protected place before recommendation features come online.
      </p>
    </div>

    <Card class="gap-0 rounded-[var(--radius-xl)] border-slate-200 bg-white shadow-[var(--shadow-md)]">
      <div class="space-y-5 p-6 sm:p-8">
        <div class="space-y-3">
          <span class="inline-flex rounded-full bg-[var(--trust-soft)] px-3 py-1 text-xs font-semibold text-[var(--trust)]">
            Next step
          </span>
          <h2 class="text-2xl font-semibold text-slate-950">
            Begin the guided intake flow.
          </h2>
          <p class="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            We have not generated recommendations yet. The next story adds the intake experience that powers
            those later decisions.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            as-child
            size="lg"
            class="min-h-[44px] rounded-[var(--radius-md)] bg-[var(--trust)] px-6 text-white hover:bg-[var(--primary-hover)]"
          >
            <NuxtLink to="/workspace/intake">
              Start Guided Intake
            </NuxtLink>
          </Button>
          <p class="text-xs uppercase tracking-[0.18em] text-slate-500">
            Recommendations unlock after intake is delivered.
          </p>
        </div>
      </div>
    </Card>
  </section>
</template>
