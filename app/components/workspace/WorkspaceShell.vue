<script setup lang="ts">
import type { Component } from 'vue'
import {
  ClipboardList,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  Sparkles,
} from 'lucide-vue-next'

type NavItem = {
  label: string
  to: string
  icon: Component
  disabled?: boolean
  tone?: 'primary' | 'default'
}

const route = useRoute()
const { user, signOut } = useUserSession()

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
]

const displayName = computed(() => {
  const candidate = user.value?.name?.trim()

  if (candidate) {
    return candidate
  }

  return user.value?.email?.trim() || 'Workspace user'
})

const initials = computed(() => {
  const source = displayName.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')

  return source || 'WU'
})

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
    class="min-h-screen bg-slate-50 text-slate-950"
  >
    <div class="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
      <aside
        class="hidden w-full max-w-[18rem] flex-col border-r border-white/10 bg-[var(--trust)] px-5 py-6 text-white lg:flex"
        aria-label="Workspace sidebar"
      >
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            Cadet
          </p>
          <h1 class="text-2xl font-semibold">
            Your workspace
          </h1>
          <p class="text-sm leading-6 text-white/75">
            A private planning console for intake, recommendations, and future decision support.
          </p>
        </div>

        <nav
          data-testid="workspace-nav"
          class="mt-8 space-y-3"
          aria-label="Workspace navigation"
        >
          <template v-for="item in navItems" :key="item.label">
            <NuxtLink
              v-if="!item.disabled"
              :to="item.to"
              class="flex min-h-[44px] items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              :class="[
                isActive(item)
                  ? 'bg-white text-[var(--trust)] shadow-[var(--shadow-sm)]'
                  : item.tone === 'primary'
                    ? 'bg-white/12 text-white hover:bg-white/18'
                    : 'text-white/82 hover:bg-white/12 hover:text-white',
              ]"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              <component :is="item.icon" class="size-4 shrink-0" />
              <span>{{ item.label }}</span>
            </NuxtLink>

            <button
              v-else
              type="button"
              disabled
              class="flex min-h-[44px] w-full items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left text-sm font-medium text-white/45"
              aria-disabled="true"
            >
              <component :is="item.icon" class="size-4 shrink-0" />
              <span>{{ item.label }}</span>
              <span class="ml-auto rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-white/65">
                Soon
              </span>
            </button>
          </template>
        </nav>

        <div class="mt-auto space-y-4 rounded-[var(--radius-lg)] border border-white/12 bg-white/8 p-4">
          <div class="flex items-center gap-3">
            <div class="flex size-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-[var(--trust)]">
              {{ initials }}
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-white">
                {{ displayName }}
              </p>
              <p class="truncate text-xs text-white/65">
                {{ user?.email || 'Authenticated session' }}
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            data-testid="workspace-sign-out"
            class="min-h-[44px] w-full justify-start rounded-[var(--radius-md)] border-0 bg-white/12 text-white hover:bg-white/18 hover:text-white"
            @click="handleSignOut"
          >
            <LogOut class="size-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div class="flex min-h-screen flex-1 flex-col">
        <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div class="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <div class="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger as-child>
                  <Button
                    variant="outline"
                    size="icon"
                    class="flex min-h-[44px] min-w-[44px] rounded-[var(--radius-md)] border-slate-200 bg-white text-slate-950 hover:bg-slate-100 lg:hidden"
                  >
                    <Menu class="size-5" />
                    <span class="sr-only">Open workspace navigation</span>
                  </Button>
                </SheetTrigger>

                <SheetContent
                  side="left"
                  class="w-[min(90vw,22rem)] border-slate-200 bg-white px-0"
                >
                  <SheetHeader class="border-b border-slate-200 px-6 pb-4 pt-6 text-left">
                    <SheetTitle class="text-lg font-semibold text-slate-950">
                      Workspace navigation
                    </SheetTitle>
                    <SheetDescription class="text-sm text-slate-600">
                      Move between your secure planning areas.
                    </SheetDescription>
                  </SheetHeader>

                  <nav class="space-y-3 px-4 py-5" aria-label="Workspace navigation">
                    <template v-for="item in navItems" :key="`${item.label}-mobile`">
                      <NuxtLink
                        v-if="!item.disabled"
                        :to="item.to"
                        class="flex min-h-[44px] items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trust)]"
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
                        class="flex min-h-[44px] w-full items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-left text-sm font-medium text-slate-500"
                        aria-disabled="true"
                      >
                        <component :is="item.icon" class="size-4 shrink-0" />
                        <span>{{ item.label }}</span>
                        <span class="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          Soon
                        </span>
                      </button>
                    </template>
                  </nav>

                  <div class="mt-auto border-t border-slate-200 px-4 py-5">
                    <Button
                      variant="outline"
                      data-testid="workspace-sign-out-mobile"
                      class="min-h-[44px] w-full justify-start rounded-[var(--radius-md)] border-slate-200"
                      @click="handleSignOut"
                    >
                      <LogOut class="size-4" />
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Cadet workspace
                </p>
                <p class="truncate text-lg font-semibold text-slate-950">
                  {{ displayName }}
                </p>
              </div>
            </div>

            <Button
              as-child
              class="hidden min-h-[44px] rounded-[var(--radius-md)] bg-[var(--trust)] px-5 text-white hover:bg-[var(--primary-hover)] sm:inline-flex"
            >
              <NuxtLink to="/workspace/intake">
                Start Intake
              </NuxtLink>
            </Button>
          </div>
        </header>

        <main class="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          <div class="mx-auto max-w-5xl">
            <slot />
          </div>
        </main>

        <nav
          class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-3 py-2 backdrop-blur lg:hidden"
          aria-label="Workspace mobile navigation"
        >
          <div
            data-testid="workspace-nav-mobile"
            class="mx-auto grid max-w-md grid-cols-4 gap-2"
          >
            <template v-for="item in navItems" :key="`${item.label}-bottom`">
              <NuxtLink
                v-if="!item.disabled"
                :to="item.to"
                class="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trust)]"
                :class="isActive(item) ? 'bg-[var(--trust-soft)] text-[var(--trust)]' : 'text-slate-500 hover:bg-slate-100'"
                :aria-current="isActive(item) ? 'page' : undefined"
              >
                <component :is="item.icon" class="size-4 shrink-0" />
                <span>{{ item.label }}</span>
              </NuxtLink>

              <button
                v-else
                type="button"
                disabled
                class="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] px-2 py-2 text-[11px] font-medium text-slate-500"
                aria-disabled="true"
              >
                <component :is="item.icon" class="size-4 shrink-0" />
                <span>{{ item.label }}</span>
              </button>
            </template>
          </div>
        </nav>
      </div>
    </div>
  </div>
</template>
