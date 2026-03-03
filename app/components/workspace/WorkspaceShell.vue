<script setup lang="ts">
import type { Component } from 'vue'
import {
  ClipboardList,
  Compass,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Sparkles,
} from 'lucide-vue-next'
import { useDisplayName } from '~/composables/useDisplayName'

type NavItem = {
  label: string
  to: string
  icon: Component
  disabled?: boolean
  tone?: 'primary' | 'default'
}

const route = useRoute()
const { signOut } = useUserSession()
const sheetOpen = ref(false)
const { displayName, initials } = useDisplayName()

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/workspace',
    icon: LayoutGrid,
  },
  {
    label: 'Start Intake',
    to: '/workspace/intake',
    icon: ClipboardList,
    tone: 'primary',
  },
  {
    label: 'Recommendations',
    to: '/workspace/recommendations',
    icon: Sparkles,
    disabled: true,
  },
  {
    label: 'History',
    to: '/workspace/history',
    icon: History,
    disabled: true,
  },
  {
    label: 'Settings',
    to: '/workspace/settings',
    icon: Settings,
    disabled: true,
  },
]

const dashboardItem = navItems[0]!

function isActive(item: NavItem) {
  if (item.to === '/workspace') {
    return route.path === item.to
  }

  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

async function handleSignOut() {
  await signOut({
    onSuccess: async () => {
      window.location.assign('/auth')
    },
  })
}
</script>

<template>
  <div
    data-testid="workspace-shell"
    class="flex h-screen overflow-hidden bg-[#f7f8fa] text-[#18232d]"
  >
    <!-- Desktop Sidebar Navigation Rail -->
    <aside
      class="hidden w-64 flex-col justify-between bg-[var(--trust)] py-6 text-white lg:flex"
      aria-label="Workspace sidebar"
    >
      <div class="flex flex-col gap-8">
        <!-- Branding -->
        <div class="flex items-center gap-3 px-6">
          <div class="flex size-10 items-center justify-center rounded-lg bg-white/20">
            <Compass class="size-5 text-white" />
          </div>
          <span class="text-xl font-bold tracking-tight text-white">Cadet2</span>
        </div>

        <!-- Navigation Links -->
        <nav
          data-testid="workspace-nav"
          class="flex flex-col gap-1"
          aria-label="Workspace navigation"
        >
          <!-- Dashboard -->
          <NuxtLink
            :to="dashboardItem.to"
            class="flex min-h-[44px] items-center gap-3 px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            :class="[
              isActive(dashboardItem)
                ? 'border-l-4 border-white bg-white/10 text-white'
                : 'border-l-4 border-transparent text-white/80 hover:bg-white/10',
            ]"
            :aria-current="isActive(dashboardItem) ? 'page' : undefined"
          >
            <component :is="dashboardItem.icon" class="size-5 shrink-0" />
            <span>{{ dashboardItem.label }}</span>
          </NuxtLink>

          <!-- Start Intake CTA Button -->
          <div class="px-4 py-2">
            <NuxtLink
              to="/workspace/intake"
              class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[var(--trust)] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <ClipboardList class="size-4 shrink-0" />
              <span>Start Intake</span>
            </NuxtLink>
          </div>

          <!-- Disabled nav items -->
          <div class="mt-2 flex flex-col gap-1">
            <button
              v-for="item in navItems.filter(i => i.disabled)"
              :key="item.label"
              type="button"
              disabled
              class="flex min-h-[44px] w-full items-center gap-3 border-l-4 border-transparent px-6 py-3 text-left text-sm font-medium text-white/40"
              aria-disabled="true"
            >
              <component :is="item.icon" class="size-5 shrink-0" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </nav>
      </div>

      <!-- User Profile -->
      <div class="border-t border-white/10 px-6 pt-6">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/20">
            <span class="text-sm font-semibold text-white">{{ initials }}</span>
          </div>
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-semibold text-white">{{ displayName }}</span>
            <span class="truncate text-xs text-white/50">Standard Member</span>
          </div>
        </div>
        <Button
          variant="secondary"
          data-testid="workspace-sign-out"
          class="mt-4 min-h-[44px] w-full items-center gap-2 rounded-lg border-0 bg-white/12 text-white hover:bg-white/18 hover:text-white"
          @click="handleSignOut"
        >
          <LogOut class="size-4" />
          Sign Out
        </Button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex min-h-screen min-w-0 flex-1 flex-col">
      <!-- Header -->
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
        <div class="flex min-w-0 items-center gap-3">
          <!-- Mobile hamburger + drawer -->
          <div class="lg:hidden">
            <Sheet v-model:open="sheetOpen">
              <SheetTrigger as-child>
                <Button
                  variant="outline"
                  size="icon"
                  class="flex min-h-[44px] min-w-[44px] rounded-lg border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                >
                  <Menu class="size-5" />
                  <span class="sr-only">Open workspace navigation</span>
                </Button>
              </SheetTrigger>

              <SheetContent
                v-if="sheetOpen"
                side="left"
                class="w-[min(90vw,22rem)] border-slate-200 bg-white px-0"
              >
                <SheetHeader class="border-b border-[var(--border)] px-6 pb-4 pt-6 text-left">
                  <SheetTitle class="text-lg font-semibold text-slate-800">
                    Workspace navigation
                  </SheetTitle>
                  <SheetDescription class="text-sm text-slate-500">
                    Move between your secure planning areas.
                  </SheetDescription>
                </SheetHeader>

                <nav class="space-y-3 px-4 py-5" aria-label="Workspace navigation">
                  <template v-for="item in navItems" :key="`${item.label}-mobile`">
                    <NuxtLink
                      v-if="!item.disabled"
                      :to="item.to"
                      class="flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trust)]"
                      :class="isActive(item) ? 'bg-[var(--trust-soft)] text-[var(--trust)]' : 'hover:bg-slate-100'"
                      :aria-current="isActive(item) ? 'page' : undefined"
                    >
                      <component :is="item.icon" class="size-4 shrink-0" />
                      <span>{{ item.label }}</span>
                    </NuxtLink>

                    <button
                      v-else
                      type="button"
                      disabled
                      class="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-400"
                      aria-disabled="true"
                    >
                      <component :is="item.icon" class="size-4 shrink-0" />
                      <span>{{ item.label }}</span>
                      <span class="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Soon
                      </span>
                    </button>
                  </template>
                </nav>

                <div class="mt-auto border-t border-slate-200 px-4 py-5">
                  <Button
                    variant="outline"
                    data-testid="workspace-sign-out-mobile"
                    class="min-h-[44px] w-full items-center gap-2 rounded-lg border-slate-200"
                    @click="handleSignOut"
                  >
                    <LogOut class="size-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <!-- Page title (desktop) -->
          <h1 class="hidden text-lg font-bold text-slate-800 lg:block">
            Dashboard
          </h1>

          <!-- Mobile branding -->
          <div class="flex items-center gap-2 lg:hidden">
            <div class="flex size-8 items-center justify-center rounded-lg bg-[var(--trust)] text-white">
              <Compass class="size-4" />
            </div>
            <span class="text-xl font-bold tracking-tight text-[var(--trust)]">Cadet2</span>
          </div>
        </div>

        <!-- Header right side -->
        <div class="flex items-center gap-4">
          <div class="hidden items-center gap-2 sm:flex">
            <span class="text-xs font-medium uppercase tracking-wider text-slate-500">
              Session Active
            </span>
            <div class="size-2 rounded-full bg-green-500" />
          </div>
        </div>
      </header>

      <!-- Content Area -->
      <main class="flex flex-1 flex-col items-center justify-center px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
        <div class="w-full max-w-3xl">
          <slot />
        </div>
      </main>

      <!-- Mobile Bottom Navigation -->
      <nav
        class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/90 px-2 py-2 backdrop-blur-lg lg:hidden"
        aria-label="Workspace mobile navigation"
      >
        <div
          data-testid="workspace-nav-mobile"
          class="mx-auto flex max-w-md items-center justify-around"
        >
          <template v-for="item in navItems" :key="`${item.label}-bottom`">
            <NuxtLink
              v-if="!item.disabled"
              :to="item.to"
              class="flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trust)]"
              :class="isActive(item) ? 'text-[var(--trust)]' : 'text-slate-400 hover:text-[var(--trust)]'"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              <component :is="item.icon" class="size-6 shrink-0" />
              <span>{{ item.label }}</span>
            </NuxtLink>

            <div
              v-else
              class="flex flex-1 flex-col items-center gap-1 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 opacity-60"
            >
              <component :is="item.icon" class="size-6 shrink-0" />
              <span>{{ item.label }}</span>
            </div>
          </template>
        </div>
      </nav>
    </div>
  </div>
</template>
