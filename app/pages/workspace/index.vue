<script setup lang="ts">
import { Compass, Shield, Zap, BadgeCheck } from 'lucide-vue-next'

const { user } = useUserSession()

const firstName = computed(() => {
  const name = user.value?.name?.trim()
  if (name) {
    return name.split(/\s+/)[0]
  }
  return user.value?.email?.split('@')[0] || 'there'
})
</script>

<template>
  <section
    data-testid="workspace-dashboard"
    class="flex flex-col items-center"
  >
    <!-- Welcome Card -->
    <div class="w-full rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-12">
      <!-- Icon -->
      <div class="mb-8 flex justify-center">
        <div class="flex size-20 items-center justify-center rounded-full bg-[var(--trust-soft)]">
          <Compass class="size-10 text-[var(--trust)]" />
        </div>
      </div>

      <!-- Heading -->
      <h2 class="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">
        Welcome to Cadet2, {{ firstName }}. Let's build your pathway plan.
      </h2>

      <!-- Description -->
      <p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-500">
        We'll help you turn your unique situation into a clear, evidence-based
        immigration strategy for your journey to Canada.
      </p>

      <!-- CTA Buttons -->
      <div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button
          as-child
          size="lg"
          class="min-h-[44px] rounded-lg bg-[#234c76] px-8 py-3.5 font-bold text-white shadow-md hover:bg-[#1f4469]"
        >
          <NuxtLink to="/workspace/intake">
            Start Guided Intake
          </NuxtLink>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          class="min-h-[44px] px-6 py-3 font-medium text-slate-600 hover:text-[#234c76]"
        >
          Explore Documentation
        </Button>
      </div>

      <!-- Trust Badges -->
      <div class="mt-16 flex justify-center gap-12 border-t border-slate-50 pt-8">
        <div class="flex flex-col items-center gap-2 text-slate-500 opacity-50">
          <BadgeCheck class="size-5" />
          <span class="text-xs font-medium">IRCC Compliant</span>
        </div>
        <div class="flex flex-col items-center gap-2 text-slate-500 opacity-50">
          <Shield class="size-5" />
          <span class="text-xs font-medium">Data Secured</span>
        </div>
        <div class="flex flex-col items-center gap-2 opacity-50">
          <Zap class="size-5" />
          <span class="text-xs font-medium">Fast Analysis</span>
        </div>
      </div>
    </div>

    <!-- Help Text -->
    <p class="mt-8 text-sm text-slate-400">
      Need help getting started?
      <a href="#" class="font-medium text-[#234c76] hover:underline">
        View our getting started guide
      </a>
    </p>
  </section>
</template>
