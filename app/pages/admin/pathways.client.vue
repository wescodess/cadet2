<script setup lang="ts">
import { computed, ref } from 'vue'

import PathwayDefinitionTable from '@/components/admin/PathwayDefinitionTable.vue'
import SignOutButton from '@/components/auth/SignOutButton.vue'
import { Button } from '@/components/ui/button'
import { adminNavigationLinks } from '@/lib/admin/navigation'
import type {
  CreatePathwayDefinitionPayload,
  PathwayDefinitionRecord,
  PathwayDefinitionStatus,
  UpdatePathwayDefinitionPayload,
} from '@/lib/admin/pathwayDefinitions'
import { pathwayInventoryTestIds } from '@/lib/admin/pathwayDefinitions'

type ListPathwayDefinitionsResponse = {
  ok: boolean
  items: PathwayDefinitionRecord[]
  totalCount: number
}

type NuxtErrorLike = {
  statusMessage?: string
  data?: {
    statusMessage?: string
  }
}

definePageMeta({
  middleware: ['auth', 'admin'],
})

const { loggedIn, waitForSession } = useUserSession()

const items = ref<PathwayDefinitionRecord[]>([])
const pending = ref(false)
const submitting = ref(false)
const statusUpdatingPathwayId = ref<string | null>(null)
const feedback = ref<{ tone: 'success' | 'error'; message: string } | null>(null)

const activeCount = computed(() => items.value.filter((item) => item.status === 'active').length)

function resolveErrorMessage(error: unknown, fallback: string) {
  const typedError = error as NuxtErrorLike
  return typedError?.data?.statusMessage || typedError?.statusMessage || fallback
}

function upsertItem(nextItem: PathwayDefinitionRecord) {
  const index = items.value.findIndex((item) => item.pathwayId === nextItem.pathwayId)

  if (index === -1) {
    items.value = [...items.value, nextItem]
    return
  }

  items.value = items.value.map((item, itemIndex) => (itemIndex === index ? nextItem : item))
}

async function loadPathways() {
  pending.value = true

  try {
    const response = await $fetch<ListPathwayDefinitionsResponse>('/api/admin/pathways')
    items.value = response.items
    feedback.value = null
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to load the managed pathway inventory.'),
    }
  } finally {
    pending.value = false
  }
}

async function handleCreate(payload: CreatePathwayDefinitionPayload) {
  submitting.value = true

  try {
    const created = await $fetch<PathwayDefinitionRecord>('/api/admin/pathways', {
      method: 'POST',
      body: payload,
    })

    upsertItem(created)
    feedback.value = {
      tone: 'success',
      message: `${created.displayName} was added to the managed inventory.`,
    }
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to create the pathway definition.'),
    }
  } finally {
    submitting.value = false
  }
}

async function handleEdit(input: { pathwayId: string; values: UpdatePathwayDefinitionPayload }) {
  submitting.value = true

  try {
    const updated = await $fetch<PathwayDefinitionRecord>(
      `/api/admin/pathways/${encodeURIComponent(input.pathwayId)}`,
      {
        method: 'PATCH',
        body: input.values,
      },
    )

    upsertItem(updated)
    feedback.value = {
      tone: 'success',
      message: `${updated.displayName} details were updated.`,
    }
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to update the pathway definition.'),
    }
  } finally {
    submitting.value = false
  }
}

async function handleStatusUpdate(input: { pathwayId: string; status: PathwayDefinitionStatus }) {
  statusUpdatingPathwayId.value = input.pathwayId

  try {
    const updated = await $fetch<PathwayDefinitionRecord>(
      `/api/admin/pathways/${encodeURIComponent(input.pathwayId)}/status`,
      {
        method: 'PATCH',
        body: {
          status: input.status,
        },
      },
    )

    upsertItem(updated)
    feedback.value = {
      tone: 'success',
      message: `${updated.displayName} is now ${input.status}.`,
    }
  } catch (error) {
    feedback.value = {
      tone: 'error',
      message: resolveErrorMessage(error, 'Unable to update the pathway status.'),
    }
  } finally {
    statusUpdatingPathwayId.value = null
  }
}

if (import.meta.client) {
  await waitForSession()

  if (!loggedIn.value) {
    await navigateTo('/auth')
  } else {
    await loadPathways()
  }
}
</script>

<template>
  <main
    :data-testid="pathwayInventoryTestIds.page"
    class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.08),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 text-slate-900 md:px-6"
  >
    <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside class="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Trust Operations
        </p>
        <h1 class="mt-2 text-2xl font-semibold text-slate-950">Pathway inventory</h1>
        <p class="mt-3 text-sm leading-6 text-slate-600">
          Review the currently supported pathway scope and control live recommendation eligibility
          without touching rule logic.
        </p>

        <dl class="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Active</dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ activeCount }}
            </dd>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Total</dt>
            <dd class="mt-1 text-2xl font-semibold text-slate-900">
              {{ items.length }}
            </dd>
          </div>
        </dl>

        <nav class="mt-6 space-y-2" aria-label="Admin navigation">
          <NuxtLink
            v-for="link in adminNavigationLinks"
            :key="link.href"
            :to="link.href"
            class="flex items-center justify-between rounded-2xl border px-3 py-3 text-sm transition"
            :class="
              link.href === '/admin/pathways'
                ? 'border-teal-200 bg-teal-50 text-teal-900'
                : 'border-transparent bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
            "
          >
            <span>{{ link.label }}</span>
            <span class="text-xs uppercase tracking-[0.16em] text-slate-400">
              {{ link.href === '/admin/pathways' ? 'Live' : 'Link' }}
            </span>
          </NuxtLink>
        </nav>

        <SignOutButton class="mt-6" />
      </aside>

      <section class="space-y-5">
        <header class="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-sm backdrop-blur">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Admin-only governance surface
              </p>
              <h2 class="text-3xl font-semibold text-slate-950">Managed MVP pathway scope</h2>
              <p class="max-w-3xl text-sm leading-6 text-slate-600">
                Only active inventory entries remain eligible for recommendation output. Draft and
                inactive states preserve identity without implying full coverage.
              </p>
            </div>
            <Button variant="outline" :disabled="pending" @click="loadPathways">
              {{ pending ? 'Refreshing…' : 'Refresh inventory' }}
            </Button>
          </div>
        </header>

        <div
          v-if="feedback"
          class="rounded-2xl border px-4 py-3 text-sm shadow-sm"
          :class="
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          "
        >
          {{ feedback.message }}
        </div>

        <PathwayDefinitionTable
          :items="items"
          :loading="pending"
          :status-updating-pathway-id="statusUpdatingPathwayId"
          :submitting="submitting"
          @create="handleCreate"
          @edit="handleEdit"
          @update-status="handleStatusUpdate"
        />
      </section>
    </div>
  </main>
</template>
