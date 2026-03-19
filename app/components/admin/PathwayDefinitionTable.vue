<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  ArrowUpDownIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-vue-next'

import PathwayStatusBadge from '@/components/admin/PathwayStatusBadge.vue'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type {
  CreatePathwayDefinitionPayload,
  PathwayDefinitionRecord,
  PathwayDefinitionStatus,
  UpdatePathwayDefinitionPayload,
} from '@/lib/admin/pathwayDefinitions'
import {
  formatPathwayStatusLabel,
  pathwayDefinitionStatusValues,
  pathwayInventoryTestIds,
} from '@/lib/admin/pathwayDefinitions'

type SortKey = 'pathwayId' | 'displayName' | 'status' | 'updatedAt'
type SortDirection = 'asc' | 'desc'

const props = withDefaults(defineProps<{
  items: PathwayDefinitionRecord[]
  loading?: boolean
  submitting?: boolean
  statusUpdatingPathwayId?: string | null
}>(), {
  loading: false,
  submitting: false,
  statusUpdatingPathwayId: null,
})

const emit = defineEmits<{
  (event: 'create', payload: CreatePathwayDefinitionPayload): void
  (event: 'edit', payload: { pathwayId: string, values: UpdatePathwayDefinitionPayload }): void
  (event: 'update-status', payload: { pathwayId: string, status: PathwayDefinitionStatus }): void
}>()

const searchQuery = ref('')
const statusFilter = ref<'all' | PathwayDefinitionStatus>('all')
const sortKey = ref<SortKey | null>(null)
const sortDirection = ref<SortDirection>('asc')
const dialogOpen = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const formError = ref('')
const confirmOpen = ref(false)
const confirmTarget = ref<PathwayDefinitionRecord | null>(null)
const confirmNextStatus = ref<PathwayDefinitionStatus>('inactive')

const form = reactive({
  pathwayId: '',
  displayName: '',
  description: '',
  status: 'draft' as PathwayDefinitionStatus,
})

const filteredItems = computed(() => {
  const normalizedSearch = searchQuery.value.trim().toLowerCase()

  return [...props.items]
    .filter((item) => {
      if (statusFilter.value !== 'all' && item.status !== statusFilter.value) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return item.pathwayId.toLowerCase().includes(normalizedSearch)
        || item.displayName.toLowerCase().includes(normalizedSearch)
        || (item.description || '').toLowerCase().includes(normalizedSearch)
    })
    .sort((left, right) => {
      if (!sortKey.value) {
        return 0
      }

      const direction = sortDirection.value === 'asc' ? 1 : -1

      if (sortKey.value === 'updatedAt') {
        return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * direction
      }

      return String(left[sortKey.value]).localeCompare(String(right[sortKey.value])) * direction
    })
})

function resetForm() {
  form.pathwayId = ''
  form.displayName = ''
  form.description = ''
  form.status = 'draft'
  formError.value = ''
}

function openCreateDialog() {
  dialogMode.value = 'create'
  resetForm()
  dialogOpen.value = true
}

function openEditDialog(item: PathwayDefinitionRecord) {
  dialogMode.value = 'edit'
  form.pathwayId = item.pathwayId
  form.displayName = item.displayName
  form.description = item.description || ''
  form.status = item.status
  formError.value = ''
  dialogOpen.value = true
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = key
  sortDirection.value = 'asc'
}

function closeDialog() {
  dialogOpen.value = false
}

function submitForm() {
  const pathwayId = form.pathwayId.trim()
  const displayName = form.displayName.trim()
  const description = form.description.trim()

  if (!displayName) {
    formError.value = 'Display name is required.'
    return
  }

  if (dialogMode.value === 'create') {
    if (!pathwayId) {
      formError.value = 'Pathway ID is required.'
      return
    }

    emit('create', {
      pathwayId,
      displayName,
      description: description || null,
      status: form.status,
    })
  }
  else {
    emit('edit', {
      pathwayId,
      values: {
        displayName,
        description: description || null,
      },
    })
  }

  closeDialog()
}

function emitStatusUpdate(pathwayId: string, status: PathwayDefinitionStatus) {
  emit('update-status', { pathwayId, status })
}

function requestStatusChange(item: PathwayDefinitionRecord, status: PathwayDefinitionStatus) {
  if (item.status === 'active' && status !== 'active') {
    confirmTarget.value = item
    confirmNextStatus.value = status
    confirmOpen.value = true
    return
  }

  emitStatusUpdate(item.pathwayId, status)
}

function confirmStatusChange() {
  if (!confirmTarget.value) {
    return
  }

  emitStatusUpdate(confirmTarget.value.pathwayId, confirmNextStatus.value)
  confirmOpen.value = false
  confirmTarget.value = null
}

function statusActionLabel(item: PathwayDefinitionRecord) {
  if (item.status === 'active') {
    return 'Disable pathway'
  }

  return 'Enable pathway'
}

function secondaryStatusActionLabel(item: PathwayDefinitionRecord) {
  return item.status === 'draft' ? 'Move to inactive' : 'Move to draft'
}

function secondaryStatusAction(item: PathwayDefinitionRecord) {
  return item.status === 'draft' ? 'inactive' : 'draft'
}

watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    formError.value = ''
  }
})
</script>

<template>
  <section class="space-y-5">
    <div class="relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <div class="relative flex-1">
          <SearchIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            v-model="searchQuery"
            :data-testid="pathwayInventoryTestIds.search"
            class="pl-9"
            placeholder="Search pathway name or ID"
          />
        </div>
        <NativeSelect
          v-model="statusFilter"
          :data-testid="pathwayInventoryTestIds.statusFilter"
          class="w-full md:w-48"
        >
          <option value="all">
            All statuses
          </option>
          <option
            v-for="status in pathwayDefinitionStatusValues"
            :key="status"
            :value="status"
          >
            {{ formatPathwayStatusLabel(status) }}
          </option>
        </NativeSelect>
      </div>

      <Button
        :data-testid="pathwayInventoryTestIds.addButton"
        class="fixed bottom-6 right-6 z-20 gap-2 rounded-full shadow-lg md:static md:ml-auto md:rounded-md md:shadow-none"
        :disabled="submitting"
        size="sm"
        @click="openCreateDialog"
      >
        <PlusIcon class="size-4" />
        Add pathway
      </Button>
    </div>

    <div class="hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <Table :data-testid="pathwayInventoryTestIds.table">
        <TableHeader>
          <TableRow class="bg-slate-50/80">
            <TableHead>
              <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('pathwayId')">
                Pathway ID
                <ArrowUpDownIcon class="size-3.5 text-slate-500" />
              </button>
            </TableHead>
            <TableHead>
              <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('displayName')">
                Display name
                <ArrowUpDownIcon class="size-3.5 text-slate-500" />
              </button>
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead>
              <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('status')">
                Status
                <ArrowUpDownIcon class="size-3.5 text-slate-500" />
              </button>
            </TableHead>
            <TableHead>
              <button type="button" class="inline-flex items-center gap-1" @click="toggleSort('updatedAt')">
                Updated
                <ArrowUpDownIcon class="size-3.5 text-slate-500" />
              </button>
            </TableHead>
            <TableHead class="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading">
            <TableRow v-for="index in 3" :key="index">
              <TableCell colspan="6" class="py-5">
                <div class="h-12 animate-pulse rounded-xl bg-slate-100" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="filteredItems.length > 0">
            <TableRow
              v-for="item in filteredItems"
              :key="item.pathwayId"
              :data-testid="`admin-pathway-row-${item.pathwayId}`"
            >
              <TableCell class="font-mono text-xs font-semibold text-slate-700">
                <span class="sr-only" :data-testid="pathwayInventoryTestIds.row" />
                {{ item.pathwayId }}
              </TableCell>
              <TableCell class="font-semibold text-slate-900">
                {{ item.displayName }}
              </TableCell>
              <TableCell class="max-w-md whitespace-normal text-sm text-slate-600">
                {{ item.description || 'No description added yet.' }}
              </TableCell>
              <TableCell>
                <PathwayStatusBadge :status="item.status" />
              </TableCell>
              <TableCell class="text-sm text-slate-500">
                {{ new Date(item.updatedAt).toLocaleDateString() }}
              </TableCell>
              <TableCell class="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button
                      :data-testid="pathwayInventoryTestIds.actionsTrigger"
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontalIcon class="size-4" />
                      <span class="sr-only">Open pathway actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-48">
                    <DropdownMenuItem @click="openEditDialog(item)">
                      Edit details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      :disabled="statusUpdatingPathwayId === item.pathwayId"
                      @click="requestStatusChange(item, item.status === 'active' ? 'inactive' : 'active')"
                    >
                      {{ statusActionLabel(item) }}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      :disabled="statusUpdatingPathwayId === item.pathwayId"
                      @click="requestStatusChange(item, secondaryStatusAction(item))"
                    >
                      {{ secondaryStatusActionLabel(item) }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </template>
          <TableEmpty v-else :colspan="6">
            <div :data-testid="pathwayInventoryTestIds.emptyState" class="space-y-2 text-center">
              <p class="font-semibold text-slate-900">
                No pathways match your filters.
              </p>
              <p class="text-sm text-slate-500">
                Clear the search or switch the status filter to review the full inventory.
              </p>
            </div>
          </TableEmpty>
        </TableBody>
      </Table>
    </div>

    <div class="space-y-3 md:hidden">
      <template v-if="loading">
        <div
          v-for="index in 3"
          :key="index"
          class="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
        />
      </template>
      <template v-else-if="filteredItems.length > 0">
        <article
          v-for="item in filteredItems"
          :key="item.pathwayId"
          :data-testid="pathwayInventoryTestIds.mobileCard"
          class="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <p class="font-semibold text-slate-900">
                {{ item.displayName }}
              </p>
              <p class="font-mono text-xs text-slate-500">
                {{ item.pathwayId }}
              </p>
            </div>
            <PathwayStatusBadge :status="item.status" />
          </div>

          <p class="text-sm text-slate-600">
            {{ item.description || 'No description added yet.' }}
          </p>

          <div class="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>Updated {{ new Date(item.updatedAt).toLocaleDateString() }}</span>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  :data-testid="pathwayInventoryTestIds.actionsTrigger"
                  size="sm"
                  variant="outline"
                >
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-48">
                <DropdownMenuItem @click="openEditDialog(item)">
                  Edit details
                </DropdownMenuItem>
                <DropdownMenuItem
                  :disabled="statusUpdatingPathwayId === item.pathwayId"
                  @click="requestStatusChange(item, item.status === 'active' ? 'inactive' : 'active')"
                >
                  {{ statusActionLabel(item) }}
                </DropdownMenuItem>
                <DropdownMenuItem
                  :disabled="statusUpdatingPathwayId === item.pathwayId"
                  @click="requestStatusChange(item, secondaryStatusAction(item))"
                >
                  {{ secondaryStatusActionLabel(item) }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </article>
      </template>
      <div
        v-else
        :data-testid="pathwayInventoryTestIds.emptyState"
        class="rounded-2xl border border-dashed border-slate-300 bg-white/90 px-4 py-10 text-center"
      >
        <p class="font-semibold text-slate-900">
          No pathways match your filters.
        </p>
        <p class="mt-2 text-sm text-slate-500">
          Adjust the search or filter to bring the full inventory back into view.
        </p>
      </div>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {{ dialogMode === 'create' ? 'Add managed pathway' : 'Edit pathway details' }}
          </DialogTitle>
          <DialogDescription>
            Keep the inventory to minimum governance fields only. Rule logic and evidence stay in later stories.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="pathway-id">Pathway ID</Label>
            <Input
              id="pathway-id"
              v-model="form.pathwayId"
              :disabled="dialogMode === 'edit'"
              placeholder="mvp-atlantic-employer"
            />
          </div>

          <div class="space-y-2">
            <Label for="pathway-display-name">Display name</Label>
            <Input
              id="pathway-display-name"
              v-model="form.displayName"
              placeholder="Atlantic Employer pathway"
            />
          </div>

          <div class="space-y-2">
            <Label for="pathway-description">Description</Label>
            <textarea
              id="pathway-description"
              v-model="form.description"
              class="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
              placeholder="Optional operator-facing description for inventory review."
            />
          </div>

          <div v-if="dialogMode === 'create'" class="space-y-2">
            <Label for="pathway-status">Initial status</Label>
            <NativeSelect id="pathway-status" v-model="form.status" class="w-full">
              <option
                v-for="status in pathwayDefinitionStatusValues"
                :key="status"
                :value="status"
              >
                {{ formatPathwayStatusLabel(status) }}
              </option>
            </NativeSelect>
          </div>

          <p v-if="formError" class="text-sm font-medium text-rose-600">
            {{ formError }}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" @click="closeDialog">
            Cancel
          </Button>
          <Button type="button" :disabled="submitting" @click="submitForm">
            {{ dialogMode === 'create' ? 'Create pathway' : 'Save changes' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="confirmOpen">
      <AlertDialogContent :data-testid="pathwayInventoryTestIds.confirmDialog">
        <AlertDialogHeader>
          <AlertDialogTitle>
            Confirm live status change
          </AlertDialogTitle>
          <AlertDialogDescription>
            {{ confirmTarget?.displayName || 'This pathway' }} is currently active in live recommendation scope. Confirm before changing its status.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="confirmTarget = null">
            Keep pathway live
          </AlertDialogCancel>
          <AlertDialogAction @click="confirmStatusChange">
            Confirm status change
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>
</template>
