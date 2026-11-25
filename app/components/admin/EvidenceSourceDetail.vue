<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowLeftIcon,
  PencilIcon,
  PlayIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
} from 'lucide-vue-next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import type { PathwayDefinitionRecord } from '@/lib/admin/pathwayDefinitions'
import type {
  EvidenceSourceDetailRecord,
  EvidenceSourceDraft,
} from '@/lib/admin/evidenceSources'
import {
  evidenceSourceTestIds,
  formatEvidenceStatus,
} from '@/lib/admin/evidenceSources'

const props = withDefaults(defineProps<{
  mode: 'empty' | 'view' | 'edit' | 'create'
  detail: EvidenceSourceDetailRecord | null
  draft: EvidenceSourceDraft
  pathwayOptions: PathwayDefinitionRecord[]
  loading?: boolean
  saving?: boolean
  actionPending?: string | null
  showBackButton?: boolean
}>(), {
  detail: null,
  loading: false,
  saving: false,
  actionPending: null,
  showBackButton: false,
})

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'start-edit'): void
  (event: 'cancel'): void
  (event: 'save'): void
  (event: 'pause'): void
  (event: 'resume'): void
  (event: 'refresh'): void
  (event: 'remove'): void
  (event: 'update:draft', payload: EvidenceSourceDraft): void
}>()

const currentSource = computed(() => props.detail?.source || null)
const showsForm = computed(() => props.mode === 'edit' || props.mode === 'create')
const sourceBadges = computed(() => {
  if (!currentSource.value) {
    return []
  }

  return [currentSource.value.lifecycleStatus, currentSource.value.freshness]
})

function badgeClass(status: string) {
  if (status === 'active' || status === 'fresh') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  }

  if (status === 'paused') {
    return 'border-amber-300 bg-amber-50 text-amber-700'
  }

  if (status === 'stale' || status === 'rejected') {
    return 'border-rose-300 bg-rose-50 text-rose-700'
  }

  return 'border-slate-300 bg-slate-100 text-slate-700'
}

function updateDraft<K extends keyof EvidenceSourceDraft>(field: K, value: EvidenceSourceDraft[K]) {
  emit('update:draft', {
    ...props.draft,
    [field]: value,
  })
}

function toggleLinkedPathway(pathwayId: string, checked: boolean | 'indeterminate') {
  const selected = new Set(props.draft.linkedPathwayIds)

  if (checked === true) {
    selected.add(pathwayId)
  }
  else {
    selected.delete(pathwayId)
  }

  updateDraft('linkedPathwayIds', [...selected])
}

function formatTimestamp(value: number | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString()
}

function pathwayLabel(pathwayId: string) {
  return props.pathwayOptions.find(option => option.pathwayId === pathwayId)?.displayName || pathwayId
}
</script>

<template>
  <section
    :data-testid="evidenceSourceTestIds.detail"
    class="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
  >
    <div
      v-if="mode === 'empty' && !loading"
      class="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500"
    >
      Select a source to inspect its trust score, linked pathways, and action history.
    </div>

    <div
      v-else-if="loading"
      class="flex min-h-[420px] items-center justify-center text-sm text-slate-500"
    >
      Loading source details…
    </div>

    <div v-else class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-2">
          <Button
            v-if="showBackButton"
            type="button"
            variant="ghost"
            class="-ml-3 h-auto px-3 py-1 text-slate-500 lg:hidden"
            @click="emit('back')"
          >
            <ArrowLeftIcon class="size-4" />
            Back to list
          </Button>

          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-2xl font-semibold text-slate-950">
              {{ mode === 'create' ? 'Add evidence source' : currentSource?.name }}
            </h2>
            <Badge
              v-for="badge in sourceBadges"
              :key="badge"
              variant="outline"
              :class="badgeClass(badge)"
            >
              {{ formatEvidenceStatus(badge) }}
            </Badge>
          </div>
          <p class="text-sm text-slate-500">
            {{ mode === 'create'
              ? 'Add a governed source record without leaving the curation workspace.'
              : currentSource?.description || 'No description recorded for this source yet.' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <template v-if="mode === 'view' && currentSource">
            <Button type="button" variant="outline" @click="emit('start-edit')">
              <PencilIcon class="size-4" />
              Edit
            </Button>
            <Button type="button" variant="outline" :disabled="actionPending === 'refresh'" @click="emit('refresh')">
              <RefreshCwIcon class="size-4" />
              {{ actionPending === 'refresh' ? 'Refreshing…' : 'Trigger refresh' }}
            </Button>
            <Button
              v-if="currentSource.lifecycleStatus === 'paused'"
              type="button"
              variant="outline"
              :disabled="actionPending === 'resume'"
              @click="emit('resume')"
            >
              <PlayIcon class="size-4" />
              Resume
            </Button>
            <Button
              v-else
              :data-testid="evidenceSourceTestIds.pauseButton"
              type="button"
              variant="outline"
              :disabled="actionPending === 'pause'"
              @click="emit('pause')"
            >
              Pause
            </Button>
            <Button
              type="button"
              variant="destructive"
              :disabled="actionPending === 'remove'"
              @click="emit('remove')"
            >
              <Trash2Icon class="size-4" />
              Remove
            </Button>
          </template>

          <template v-else>
            <Button type="button" variant="outline" @click="emit('cancel')">
              Cancel
            </Button>
            <Button type="button" :disabled="saving" @click="emit('save')">
              <SaveIcon class="size-4" />
              {{ saving ? 'Saving…' : mode === 'create' ? 'Create source' : 'Save changes' }}
            </Button>
          </template>
        </div>
      </div>

      <div v-if="showsForm" class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label>Source type</Label>
            <NativeSelect
              :model-value="draft.type"
              :disabled="mode === 'edit'"
              @update:model-value="value => updateDraft('type', String(value) as EvidenceSourceDraft['type'])"
            >
              <option value="website">
                Website
              </option>
              <option value="youtube_channel">
                YouTube channel
              </option>
            </NativeSelect>
          </div>

          <div class="space-y-2">
            <Label>Source name</Label>
            <Input :model-value="draft.name" @update:model-value="value => updateDraft('name', String(value))" />
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
            <Label>Trust score</Label>
            <Input
              :model-value="String(draft.trustScore)"
              type="number"
              @update:model-value="value => updateDraft('trustScore', Number(value))"
            />
          </div>
          <div class="space-y-2">
            <Label>Tenant</Label>
            <Input :model-value="draft.tenantId" @update:model-value="value => updateDraft('tenantId', String(value))" />
          </div>
          <div class="space-y-2">
            <Label>Schedule</Label>
            <NativeSelect
              :model-value="draft.frequency"
              @update:model-value="value => updateDraft('frequency', String(value) as EvidenceSourceDraft['frequency'])"
            >
              <option value="daily">
                Daily
              </option>
              <option value="manual">
                Manual
              </option>
              <option value="interval">
                Interval
              </option>
            </NativeSelect>
          </div>
        </div>

        <div
          v-if="draft.frequency === 'interval'"
          class="space-y-2"
        >
          <Label>Interval hours</Label>
          <Input
            :model-value="String(draft.intervalHours)"
            type="number"
            @update:model-value="value => updateDraft('intervalHours', Number(value))"
          />
        </div>

        <div class="space-y-2">
          <Label>Description</Label>
          <Textarea :model-value="draft.description" @update:model-value="value => updateDraft('description', String(value))" />
        </div>

        <div class="space-y-2">
          <Label>Tags</Label>
          <Input
            :model-value="draft.tagsText"
            placeholder="policy, official, verified"
            @update:model-value="value => updateDraft('tagsText', String(value))"
          />
        </div>

        <div class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">
                Linked pathways
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                Flag which managed pathway definitions should reference this source during operator review.
              </p>
            </div>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <label
              v-for="pathway in pathwayOptions"
              :key="pathway.pathwayId"
              class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700"
            >
              <Checkbox
                :model-value="draft.linkedPathwayIds.includes(pathway.pathwayId)"
                @update:model-value="checked => toggleLinkedPathway(pathway.pathwayId, checked)"
              />
              <span>{{ pathway.displayName }}</span>
            </label>
          </div>
        </div>

        <div
          v-if="draft.type === 'website'"
          class="grid gap-4 md:grid-cols-2"
        >
          <div class="space-y-2 md:col-span-2">
            <Label>Seed URLs</Label>
            <Input
              :model-value="draft.websiteSeedUrls"
              placeholder="https://www.canada.ca/en/immigration-refugees-citizenship.html"
              @update:model-value="value => updateDraft('websiteSeedUrls', String(value))"
            />
          </div>
          <div class="space-y-2">
            <Label>Allowed domains</Label>
            <Input :model-value="draft.websiteAllowedDomains" @update:model-value="value => updateDraft('websiteAllowedDomains', String(value))" />
          </div>
          <div class="space-y-2">
            <Label>Include patterns</Label>
            <Input :model-value="draft.websiteIncludePatterns" @update:model-value="value => updateDraft('websiteIncludePatterns', String(value))" />
          </div>
          <div class="space-y-2">
            <Label>Exclude patterns</Label>
            <Input :model-value="draft.websiteExcludePatterns" @update:model-value="value => updateDraft('websiteExcludePatterns', String(value))" />
          </div>
          <div class="space-y-2">
            <Label>Render mode</Label>
            <NativeSelect
              :model-value="draft.websiteRenderMode"
              @update:model-value="value => updateDraft('websiteRenderMode', String(value) as EvidenceSourceDraft['websiteRenderMode'])"
            >
              <option value="static">
                Static
              </option>
              <option value="rendered">
                Rendered
              </option>
            </NativeSelect>
          </div>
        </div>

        <div
          v-else
          class="grid gap-4 md:grid-cols-2"
        >
          <div class="space-y-2">
            <Label>Channel ID</Label>
            <Input :model-value="draft.youtubeChannelId" @update:model-value="value => updateDraft('youtubeChannelId', String(value))" />
          </div>
          <div class="space-y-2">
            <Label>Channel URL</Label>
            <Input :model-value="draft.youtubeChannelUrl" @update:model-value="value => updateDraft('youtubeChannelUrl', String(value))" />
          </div>
          <div class="space-y-2">
            <Label>Max videos per run</Label>
            <Input
              :model-value="String(draft.youtubeMaxVideosPerRun)"
              type="number"
              @update:model-value="value => updateDraft('youtubeMaxVideosPerRun', Number(value))"
            />
          </div>
          <div class="space-y-2">
            <Label>Preferred language</Label>
            <Input :model-value="draft.youtubePreferredLanguage" @update:model-value="value => updateDraft('youtubePreferredLanguage', String(value))" />
          </div>
        </div>
      </div>

      <div v-else-if="currentSource" class="space-y-6">
        <div class="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div class="space-y-5">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                    Trust score
                  </p>
                  <p class="mt-1 text-3xl font-semibold text-slate-950">
                    {{ currentSource.trustScore }} / 100
                  </p>
                </div>
                <div class="text-sm text-slate-500">
                  {{ currentSource.type === 'website' ? 'Website source' : 'YouTube channel' }}
                </div>
              </div>
              <Progress class="mt-4 bg-slate-200 [&_[data-slot=progress-indicator]]:bg-teal-600" :model-value="currentSource.trustScore" />
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Last success
                </p>
                <p class="mt-2 text-sm text-slate-700">
                  {{ formatTimestamp(currentSource.lastSuccessAt) }}
                </p>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-white p-4">
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Next run
                </p>
                <p class="mt-2 text-sm text-slate-700">
                  {{ formatTimestamp(currentSource.nextRunAt) }}
                </p>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Linked pathways
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <Badge
                  v-for="pathwayId in currentSource.linkedPathwayIds"
                  :key="pathwayId"
                  variant="outline"
                  class="border-slate-300 bg-slate-100 text-slate-700"
                >
                  {{ pathwayLabel(pathwayId) }}
                </Badge>
                <span
                  v-if="currentSource.linkedPathwayIds.length === 0"
                  class="text-sm text-slate-500"
                >
                  No linked pathways
                </span>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Operational metadata
              </p>
              <dl class="mt-3 space-y-3 text-sm text-slate-600">
                <div class="flex items-start justify-between gap-3">
                  <dt>Tenant</dt>
                  <dd class="font-medium text-slate-900">{{ currentSource.tenantId }}</dd>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <dt>Created by</dt>
                  <dd class="font-medium text-slate-900">{{ currentSource.createdByEmail || currentSource.createdByUserId }}</dd>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <dt>Enabled</dt>
                  <dd class="font-medium text-slate-900">{{ currentSource.enabled ? 'Yes' : 'No' }}</dd>
                </div>
              </dl>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Recent activity
              </p>
              <div class="mt-3 space-y-3">
                <div
                  v-for="auditItem in detail?.audit.slice(0, 4)"
                  :key="auditItem.id"
                  class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-sm font-medium text-slate-900">{{ formatEvidenceStatus(auditItem.action) }}</span>
                    <span class="text-xs text-slate-500">{{ formatTimestamp(auditItem.timestamp) }}</span>
                  </div>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ auditItem.note || auditItem.reason || auditItem.diffSummary || 'No additional note recorded.' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
