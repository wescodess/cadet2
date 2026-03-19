export const pathwayDefinitionStatusValues = ['active', 'inactive', 'draft'] as const

export type PathwayDefinitionStatus = typeof pathwayDefinitionStatusValues[number]

export type PathwayDefinitionRecord = {
  pathwayId: string
  displayName: string
  description: string | null
  status: PathwayDefinitionStatus
  createdAt: string
  updatedAt: string
}

export type CreatePathwayDefinitionPayload = {
  pathwayId: string
  displayName: string
  description: string | null
  status: PathwayDefinitionStatus
}

export type UpdatePathwayDefinitionPayload = {
  displayName: string
  description: string | null
}

export const pathwayInventoryTestIds = {
  page: 'admin-pathway-page',
  table: 'admin-pathway-table',
  row: 'admin-pathway-row',
  search: 'admin-pathway-search',
  statusFilter: 'admin-pathway-filter',
  addButton: 'admin-pathway-add-button',
  statusBadge: 'admin-pathway-status-badge',
  actionsTrigger: 'admin-pathway-row-actions',
  confirmDialog: 'admin-pathway-status-confirmation',
  mobileCard: 'admin-pathway-card',
  emptyState: 'admin-pathway-empty-state',
} as const

export const pathwayStatusLabels: Record<PathwayDefinitionStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  draft: 'Draft',
}

export function formatPathwayStatusLabel(status: PathwayDefinitionStatus) {
  return pathwayStatusLabels[status]
}
